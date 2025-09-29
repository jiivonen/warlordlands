import CombatEngine from './CombatEngine.js';

class GameTurnManager {
    constructor(dbPool) {
        this.dbPool = dbPool;
        this.combatEngine = new CombatEngine(dbPool);
    }

    /**
     * End the current active turn and create a new one
     * This processes all pending commands and advances the game state
     */
    async endCurrentTurn() {
        try {
            // Get the current active turn
            const [currentTurn] = await this.dbPool.execute(
                'SELECT * FROM game_turns WHERE status = "active" ORDER BY turn_number DESC LIMIT 1'
            );

            if (currentTurn.length === 0) {
                throw new Error('No active turn found');
            }

            const turn = currentTurn[0];
            const turnId = turn.id;

            // Process all pending commands for this turn
            console.log(`Processing commands for turn ${turn.turn_number}...`);
            const commandResults = await this.processPendingCommands(turnId);

            // Mark the current turn as completed
            await this.dbPool.execute(
                'UPDATE game_turns SET status = "completed", end_time = CURRENT_TIMESTAMP WHERE id = ?',
                [turnId]
            );

            // Create a new turn
            const newTurnNumber = turn.turn_number + 1;
            const newTurnStartTime = new Date();
            const newTurnEndTime = new Date(newTurnStartTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
            const newTurnDeadline = new Date(newTurnStartTime.getTime() + 20 * 60 * 60 * 1000); // 20 hours later (8 PM)

            const [newTurnResult] = await this.dbPool.execute(
                `INSERT INTO game_turns (turn_number, start_time, end_time, command_deadline, status) 
                 VALUES (?, ?, ?, ?, 'active')`,
                [newTurnNumber, newTurnStartTime, newTurnEndTime, newTurnDeadline]
            );

            const newTurnId = newTurnResult.insertId;

            console.log(`Turn ${turn.turn_number} ended. New turn ${newTurnNumber} created with ID ${newTurnId}`);
            console.log(`Command processing results:`, commandResults);

            return {
                oldTurn: turn,
                newTurn: {
                    id: newTurnId,
                    turn_number: newTurnNumber,
                    start_time: newTurnStartTime,
                    end_time: newTurnEndTime,
                    command_deadline: newTurnDeadline,
                    status: 'active'
                },
                commandResults: commandResults
            };

        } catch (error) {
            console.error('Error ending current turn:', error);
            throw error;
        }
    }

    /**
     * Check if any turns have passed their deadline and need to be processed
     * This can be called by a scheduled job or manually
     */
    async checkAndProcessOverdueTurns() {
        try {
            // Find turns that have passed their deadline but are still active
            const [overdueTurns] = await this.dbPool.execute(
                `SELECT * FROM game_turns 
                 WHERE status = 'active' 
                 AND command_deadline < CURRENT_TIMESTAMP`
            );

            const results = [];

            for (const turn of overdueTurns) {
                console.log(`Processing overdue turn ${turn.turn_number}...`);
                
                try {
                    const result = await this.endCurrentTurn();
                    results.push({
                        turn: turn,
                        result: result,
                        processed: true
                    });
                } catch (error) {
                    console.error(`Error processing overdue turn ${turn.turn_number}:`, error);
                    results.push({
                        turn: turn,
                        error: error.message,
                        processed: false
                    });
                }
            }

            return results;

        } catch (error) {
            console.error('Error checking overdue turns:', error);
            throw error;
        }
    }

    /**
     * Process all pending commands for a completed turn
     * This is called when a turn ends (manually by admin or automatically by deadline)
     */
    async processPendingCommands(gameTurnId) {
        try {
            // Get all pending commands for the specified turn
            const [pendingCommands] = await this.dbPool.execute(
                `SELECT c.*, a.x_coord as current_x, a.y_coord as current_y 
                 FROM commands c 
                 JOIN army a ON c.army_id = a.id 
                 WHERE c.game_turn_id = ? AND c.status = 'pending'`,
                [gameTurnId]
            );

            const results = {
                processed: 0,
                succeeded: 0,
                failed: 0,
                errors: []
            };

            for (const command of pendingCommands) {
                try {
                    const success = await this.processCommand(command);
                    if (success) {
                        results.succeeded++;
                    } else {
                        results.failed++;
                    }
                    results.processed++;
                } catch (error) {
                    console.error(`Error processing command ${command.id}:`, error);
                    results.failed++;
                    results.errors.push({
                        commandId: command.id,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Error processing pending commands:', error);
            throw error;
        }
    }

    /**
     * Process a single command
     */
    async processCommand(command) {
        try {
            switch (command.command_type) {
                case 'move':
                    return await this.processMoveCommand(command);
                case 'attack':
                    return await this.processAttackCommand(command);
                case 'create_unit':
                    return await this.processCreateUnitCommand(command);
                default:
                    console.warn(`Unknown command type: ${command.command_type}`);
                    await this.markCommandFailed(command.id, `Unknown command type: ${command.command_type}`);
                    return false;
            }
        } catch (error) {
            console.error(`Error processing command ${command.id}:`, error);
            await this.markCommandFailed(command.id, error.message);
            return false;
        }
    }

    /**
     * Process a move command by moving the army along the specified path
     */
    async processMoveCommand(command) {
        try {
            const commandData = JSON.parse(command.command_data);
            const path = commandData.path;

            if (!path || !Array.isArray(path) || path.length < 2) {
                await this.markCommandFailed(command.id, 'Invalid move path data');
                return false;
            }

            // Get the army's current position
            const [armyData] = await this.dbPool.execute(
                'SELECT x_coord, y_coord FROM army WHERE id = ?',
                [command.army_id]
            );

            if (armyData.length === 0) {
                await this.markCommandFailed(command.id, 'Army not found');
                return false;
            }

            const currentX = armyData[0].x_coord;
            const currentY = armyData[0].y_coord;

            // Validate that the path starts at the army's current position
            if (path[0].x !== currentX || path[0].y !== currentY) {
                await this.markCommandFailed(command.id, 'Move path does not start at army current position');
                return false;
            }

            // Get the final destination from the path
            const finalStep = path[path.length - 1];
            const targetX = finalStep.x;
            const targetY = finalStep.y;

            // Check if the target location is valid (within map bounds and accessible)
            if (!await this.isValidMoveLocation(targetX, targetY)) {
                await this.markCommandFailed(command.id, 'Target location is invalid or inaccessible');
                return false;
            }

            // Move the army to the new location
            await this.dbPool.execute(
                'UPDATE army SET x_coord = ?, y_coord = ? WHERE id = ?',
                [targetX, targetY, command.army_id]
            );

            // Mark command as completed
            await this.markCommandCompleted(command.id, {
                path: path,
                startPosition: { x: currentX, y: currentY },
                endPosition: { x: targetX, y: targetY },
                message: 'Army moved successfully'
            });

            console.log(`Army ${command.army_id} moved from (${currentX}, ${currentY}) to (${targetX}, ${targetY})`);
            return true;

        } catch (error) {
            console.error(`Error processing move command ${command.id}:`, error);
            await this.markCommandFailed(command.id, error.message);
            return false;
        }
    }

    /**
     * Process an attack command
     */
    async processAttackCommand(command) {
        try {
            const commandData = JSON.parse(command.command_data);
            // TODO: Implement attack logic
            // For now, just mark as completed with a placeholder result
            await this.markCommandCompleted(command.id, {
                message: 'Attack command processed (attack logic not yet implemented)'
            });
            return true;
        } catch (error) {
            console.error(`Error processing attack command ${command.id}:`, error);
            await this.markCommandFailed(command.id, error.message);
            return false;
        }
    }

    /**
     * Process a create unit command
     */
    async processCreateUnitCommand(command) {
        try {
            const commandData = JSON.parse(command.command_data);
            // TODO: Implement unit creation logic
            // For now, just mark as completed with a placeholder result
            await this.markCommandCompleted(command.id, {
                message: 'Create unit command processed (unit creation logic not yet implemented)'
            });
            return true;
        } catch (error) {
            console.error(`Error processing create unit command ${command.id}:`, error);
            await this.markCommandFailed(command.id, error.message);
            return false;
        }
    }

    /**
     * Check if a move location is valid
     */
    async isValidMoveLocation(x, y) {
        try {
            // Check if coordinates are within actual map bounds (30x20 grid from -15 to 14 x, -10 to 9 y)
            if (x < -15 || x > 14 || y < -10 || y > 9) {
                return false;
            }

            // Check if the tile exists and is accessible
            const [tileData] = await this.dbPool.execute(
                'SELECT terrain_type FROM map WHERE x_coord = ? AND y_coord = ?',
                [x, y]
            );

            if (tileData.length === 0) {
                return false;
            }

            // Note: Multiple armies can now occupy the same tile for combat and unit transfers
            // Removed the army occupation check to allow this functionality

            return true;
        } catch (error) {
            console.error('Error checking move location validity:', error);
            return false;
        }
    }

    /**
     * Mark a command as completed
     */
    async markCommandCompleted(commandId, result) {
        try {
            await this.dbPool.execute(
                'UPDATE commands SET status = "completed", result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [JSON.stringify(result), commandId]
            );
        } catch (error) {
            console.error(`Error marking command ${commandId} as completed:`, error);
        }
    }

    /**
     * Mark a command as failed
     */
    async markCommandFailed(commandId, errorMessage) {
        try {
            await this.dbPool.execute(
                'UPDATE commands SET status = "failed", result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [JSON.stringify({ error: errorMessage }), commandId]
            );
        } catch (error) {
            console.error(`Error marking command ${commandId} as failed:`, error);
        }
    }

    /**
     * Get the current active turn information
     */
    async getCurrentTurn() {
        try {
            const [currentTurn] = await this.dbPool.execute(
                'SELECT * FROM game_turns WHERE status = "active" ORDER BY turn_number DESC LIMIT 1'
            );

            if (currentTurn.length === 0) {
                return null;
            }

            return currentTurn[0];
        } catch (error) {
            console.error('Error getting current turn:', error);
            throw error;
        }
    }

    /**
     * Get turn statistics including command counts
     */
    async getTurnStatistics(turnId) {
        try {
            const [commandStats] = await this.dbPool.execute(
                `SELECT 
                    status,
                    COUNT(*) as count
                 FROM commands 
                 WHERE game_turn_id = ?
                 GROUP BY status`,
                [turnId]
            );

            const [turnInfo] = await this.dbPool.execute(
                'SELECT * FROM game_turns WHERE id = ?',
                [turnId]
            );

            if (turnInfo.length === 0) {
                return null;
            }

            const stats = {
                turn: turnInfo[0],
                commands: {
                    pending: 0,
                    processing: 0,
                    completed: 0,
                    failed: 0
                }
            };

            // Convert array results to object
            commandStats.forEach(stat => {
                if (stat.status in stats.commands) {
                    stats.commands[stat.status] = stat.count;
                }
            });

            return stats;

        } catch (error) {
            console.error('Error getting turn statistics:', error);
            throw error;
        }
    }

    /**
     * Manually advance to a specific turn number
     * This is useful for testing or admin purposes
     */
    async advanceToTurn(targetTurnNumber) {
        try {
            const currentTurn = await this.getCurrentTurn();
            if (!currentTurn) {
                throw new Error('No current turn found');
            }

            if (targetTurnNumber <= currentTurn.turn_number) {
                throw new Error(`Target turn ${targetTurnNumber} must be greater than current turn ${currentTurn.turn_number}`);
            }

            const turnsToAdvance = targetTurnNumber - currentTurn.turn_number;
            const results = [];

            for (let i = 0; i < turnsToAdvance; i++) {
                console.log(`Advancing from turn ${currentTurn.turn_number + i} to ${currentTurn.turn_number + i + 1}...`);
                const result = await this.endCurrentTurn();
                results.push(result);
            }

            return results;

        } catch (error) {
            console.error('Error advancing to turn:', error);
            throw error;
        }
    }
}

export default GameTurnManager;
