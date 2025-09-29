class Command {
    constructor(data) {
        this.id = data.id;
        this.player_id = data.player_id;
        this.army_id = data.army_id;
        this.game_turn_id = data.game_turn_id;
        this.command_type = data.command_type; // 'move', 'attack', 'create_unit', etc.
        this.command_data = data.command_data; // JSON data for command parameters
        this.status = data.status; // 'pending', 'processing', 'completed', 'failed'
        this.result = data.result; // JSON data for command results
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Optional joined data
        this.army = data.army || null;
        this.game_turn = data.game_turn || null;
        this.player = data.player || null;
    }

    /**
     * Get command by ID
     */
    static async getById(dbPool, commandId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT c.*, a.name as army_name, gt.turn_number, p.nick as player_nick
                 FROM commands c 
                 LEFT JOIN army a ON c.army_id = a.id
                 LEFT JOIN game_turns gt ON c.game_turn_id = gt.id
                 LEFT JOIN player p ON c.player_id = p.id
                 WHERE c.id = ?`,
                [commandId]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            const command = new Command(rows[0]);
            command.army = { name: rows[0].army_name };
            command.game_turn = { turn_number: rows[0].turn_number };
            command.player = { nick: rows[0].player_nick };
            
            return command;
        } catch (error) {
            console.error('Error getting command by ID:', error);
            throw error;
        }
    }

    /**
     * Get commands by player
     */
    static async getByPlayerId(dbPool, playerId, limit = 50) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT c.*, a.name as army_name, gt.turn_number
                 FROM commands c 
                 LEFT JOIN army a ON c.army_id = a.id
                 LEFT JOIN game_turns gt ON c.game_turn_id = gt.id
                 WHERE c.player_id = ? 
                 ORDER BY c.created_at DESC 
                 LIMIT ?`,
                [playerId, limit]
            );
            
            return rows.map(row => {
                const command = new Command(row);
                command.army = { name: row.army_name };
                command.game_turn = { turn_number: row.turn_number };
                return command;
            });
        } catch (error) {
            console.error('Error getting commands by player:', error);
            throw error;
        }
    }

    /**
     * Get commands by army
     */
    static async getByArmyId(dbPool, armyId, limit = 50) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT c.*, gt.turn_number, p.nick as player_nick
                 FROM commands c 
                 LEFT JOIN game_turns gt ON c.game_turn_id = gt.id
                 LEFT JOIN player p ON c.player_id = p.id
                 WHERE c.army_id = ? 
                 ORDER BY c.created_at DESC 
                 LIMIT ?`,
                [armyId, limit]
            );
            
            return rows.map(row => {
                const command = new Command(row);
                command.game_turn = { turn_number: row.turn_number };
                command.player = { nick: row.player_nick };
                return command;
            });
        } catch (error) {
            console.error('Error getting commands by army:', error);
            throw error;
        }
    }

    /**
     * Get commands by game turn
     */
    static async getByGameTurnId(dbPool, gameTurnId, limit = 100) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT c.*, a.name as army_name, p.nick as player_nick
                 FROM commands c 
                 LEFT JOIN army a ON c.army_id = a.id
                 LEFT JOIN player p ON c.player_id = p.id
                 WHERE c.game_turn_id = ? 
                 ORDER BY c.created_at ASC 
                 LIMIT ?`,
                [gameTurnId, limit]
            );
            
            return rows.map(row => {
                const command = new Command(row);
                command.army = { name: row.army_name };
                command.player = { nick: row.player_nick };
                return command;
            });
        } catch (error) {
            console.error('Error getting commands by game turn:', error);
            throw error;
        }
    }

    /**
     * Get commands by status
     */
    static async getByStatus(dbPool, status, limit = 100) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT c.*, a.name as army_name, gt.turn_number, p.nick as player_nick
                 FROM commands c 
                 LEFT JOIN army a ON c.army_id = a.id
                 LEFT JOIN game_turns gt ON c.game_turn_id = gt.id
                 LEFT JOIN player p ON c.player_id = p.id
                 WHERE c.status = ? 
                 ORDER BY c.created_at ASC 
                 LIMIT ?`,
                [status, limit]
            );
            
            return rows.map(row => {
                const command = new Command(row);
                command.army = { name: row.army_name };
                command.game_turn = { turn_number: row.turn_number };
                command.player = { nick: row.player_nick };
                return command;
            });
        } catch (error) {
            console.error('Error getting commands by status:', error);
            throw error;
        }
    }

    /**
     * Get pending commands for a specific turn
     */
    static async getPendingCommandsForTurn(dbPool, gameTurnId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT c.*, a.name as army_name, p.nick as player_nick
                 FROM commands c 
                 LEFT JOIN army a ON c.army_id = a.id
                 LEFT JOIN player p ON c.player_id = p.id
                 WHERE c.game_turn_id = ? AND c.status = 'pending'
                 ORDER BY c.created_at ASC`,
                [gameTurnId]
            );
            
            return rows.map(row => {
                const command = new Command(row);
                command.army = { name: row.army_name };
                command.player = { nick: row.player_nick };
                return command;
            });
        } catch (error) {
            console.error('Error getting pending commands for turn:', error);
            throw error;
        }
    }

    /**
     * Create a new command
     */
    static async create(dbPool, commandData) {
        try {
            const { 
                player_id, 
                army_id, 
                game_turn_id, 
                command_type, 
                command_data, 
                status = 'pending' 
            } = commandData;
            
            // Validate that command_data is JSON
            const commandDataJson = typeof command_data === 'string' 
                ? command_data 
                : JSON.stringify(command_data);
            
            const [result] = await dbPool.execute(
                `INSERT INTO commands (player_id, army_id, game_turn_id, command_type, command_data, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [player_id, army_id, game_turn_id, command_type, commandDataJson, status]
            );
            
            return await Command.getById(dbPool, result.insertId);
        } catch (error) {
            console.error('Error creating command:', error);
            throw error;
        }
    }

    /**
     * Update command information
     */
    async update(dbPool, updateData) {
        try {
            const allowedFields = ['command_data', 'status', 'result'];
            const updates = [];
            const values = [];
            
            for (const [field, value] of Object.entries(updateData)) {
                if (allowedFields.includes(field)) {
                    updates.push(`${field} = ?`);
                    // Handle JSON fields
                    if (field === 'command_data' || field === 'result') {
                        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
                        values.push(jsonValue);
                    } else {
                        values.push(value);
                    }
                }
            }
            
            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            values.push(this.id);
            
            await dbPool.execute(
                `UPDATE commands SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            // Refresh the command data
            const updatedCommand = await Command.getById(dbPool, this.id);
            Object.assign(this, updatedCommand);
            
            return this;
        } catch (error) {
            console.error('Error updating command:', error);
            throw error;
        }
    }

    /**
     * Delete command
     */
    async delete(dbPool) {
        try {
            await dbPool.execute('DELETE FROM commands WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting command:', error);
            throw error;
        }
    }

    /**
     * Check if command is pending
     */
    isPending() {
        return this.status === 'pending';
    }

    /**
     * Check if command is processing
     */
    isProcessing() {
        return this.status === 'processing';
    }

    /**
     * Check if command is completed
     */
    isCompleted() {
        return this.status === 'completed';
    }

    /**
     * Check if command failed
     */
    isFailed() {
        return this.status === 'failed';
    }

    /**
     * Get command data as object
     */
    getCommandData() {
        try {
            return typeof this.command_data === 'string' 
                ? JSON.parse(this.command_data) 
                : this.command_data;
        } catch (error) {
            console.error('Error parsing command data:', error);
            return {};
        }
    }

    /**
     * Get result data as object
     */
    getResult() {
        try {
            return typeof this.result === 'string' 
                ? JSON.parse(this.result) 
                : this.result;
        } catch (error) {
            console.error('Error parsing result data:', error);
            return {};
        }
    }

    /**
     * Mark command as processing
     */
    async markAsProcessing(dbPool) {
        return await this.update(dbPool, { status: 'processing' });
    }

    /**
     * Mark command as completed
     */
    async markAsCompleted(dbPool, result = null) {
        const updateData = { status: 'completed' };
        if (result) {
            updateData.result = result;
        }
        return await this.update(dbPool, updateData);
    }

    /**
     * Mark command as failed
     */
    async markAsFailed(dbPool, error = null) {
        const updateData = { status: 'failed' };
        if (error) {
            updateData.result = { error: error.message || error };
        }
        return await this.update(dbPool, updateData);
    }

    /**
     * Get command statistics
     */
    async getStats(dbPool) {
        try {
            const [totalCommands] = await dbPool.execute(
                'SELECT COUNT(*) as count FROM commands WHERE player_id = ?',
                [this.player_id]
            );
            
            const [pendingCommands] = await dbPool.execute(
                'SELECT COUNT(*) as count FROM commands WHERE player_id = ? AND status = "pending"',
                [this.player_id]
            );
            
            const [completedCommands] = await dbPool.execute(
                'SELECT COUNT(*) as count FROM commands WHERE player_id = ? AND status = "completed"',
                [this.player_id]
            );
            
            return {
                total: totalCommands[0].count,
                pending: pendingCommands[0].count,
                completed: completedCommands[0].count,
                failed: totalCommands[0].count - pendingCommands[0].count - completedCommands[0].count
            };
        } catch (error) {
            console.error('Error getting command stats:', error);
            throw error;
        }
    }
}

export default Command;
