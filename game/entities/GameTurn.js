class GameTurn {
    constructor(data) {
        this.id = data.id;
        this.turn_number = data.turn_number;
        this.start_time = data.start_time;
        this.end_time = data.end_time;
        this.command_deadline = data.command_deadline;
        this.status = data.status; // 'pending', 'active', 'completed'
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Get turn by ID
     */
    static async getById(dbPool, turnId) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM game_turns WHERE id = ?',
                [turnId]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new GameTurn(rows[0]);
        } catch (error) {
            console.error('Error getting turn by ID:', error);
            throw error;
        }
    }

    /**
     * Get turn by turn number
     */
    static async getByTurnNumber(dbPool, turnNumber) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM game_turns WHERE turn_number = ?',
                [turnNumber]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new GameTurn(rows[0]);
        } catch (error) {
            console.error('Error getting turn by number:', error);
            throw error;
        }
    }

    /**
     * Get current active turn
     */
    static async getCurrentTurn(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM game_turns WHERE status = "active" ORDER BY turn_number DESC LIMIT 1'
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new GameTurn(rows[0]);
        } catch (error) {
            console.error('Error getting current turn:', error);
            throw error;
        }
    }

    /**
     * Get next pending turn
     */
    static async getNextTurn(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM game_turns WHERE status = "pending" ORDER BY turn_number ASC LIMIT 1'
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new GameTurn(rows[0]);
        } catch (error) {
            console.error('Error getting next turn:', error);
            throw error;
        }
    }

    /**
     * Get last completed turn
     */
    static async getLastCompletedTurn(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM game_turns WHERE status = "completed" ORDER BY turn_number DESC LIMIT 1'
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new GameTurn(rows[0]);
        } catch (error) {
            console.error('Error getting last completed turn:', error);
            throw error;
        }
    }

    /**
     * Get recent turns
     */
    static async getRecentTurns(dbPool, limit = 10) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM game_turns ORDER BY turn_number DESC LIMIT ?',
                [limit]
            );
            
            return rows.map(row => new GameTurn(row));
        } catch (error) {
            console.error('Error getting recent turns:', error);
            throw error;
        }
    }

    /**
     * Get turns by status
     */
    static async getTurnsByStatus(dbPool, status) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM game_turns WHERE status = ? ORDER BY turn_number ASC',
                [status]
            );
            
            return rows.map(row => new GameTurn(row));
        } catch (error) {
            console.error('Error getting turns by status:', error);
            throw error;
        }
    }

    /**
     * Create a new turn
     */
    static async create(dbPool, turnData) {
        try {
            const { turn_number, start_time, end_time, command_deadline, status = 'pending' } = turnData;
            
            // Check if turn number already exists
            const [existing] = await dbPool.execute(
                'SELECT id FROM game_turns WHERE turn_number = ?',
                [turn_number]
            );
            
            if (existing.length > 0) {
                throw new Error('Turn number already exists');
            }
            
            const [result] = await dbPool.execute(
                'INSERT INTO game_turns (turn_number, start_time, end_time, command_deadline, status) VALUES (?, ?, ?, ?, ?)',
                [turn_number, start_time, end_time, command_deadline, status]
            );
            
            return await GameTurn.getById(dbPool, result.insertId);
        } catch (error) {
            console.error('Error creating turn:', error);
            throw error;
        }
    }

    /**
     * Update turn information
     */
    async update(dbPool, updateData) {
        try {
            const allowedFields = ['start_time', 'end_time', 'command_deadline', 'status'];
            const updates = [];
            const values = [];
            
            for (const [field, value] of Object.entries(updateData)) {
                if (allowedFields.includes(field)) {
                    updates.push(`${field} = ?`);
                    values.push(value);
                }
            }
            
            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            values.push(this.id);
            
            await dbPool.execute(
                `UPDATE game_turns SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            // Refresh the turn data
            const updatedTurn = await GameTurn.getById(dbPool, this.id);
            Object.assign(this, updatedTurn);
            
            return this;
        } catch (error) {
            console.error('Error updating turn:', error);
            throw error;
        }
    }

    /**
     * Delete turn
     */
    async delete(dbPool) {
        try {
            await dbPool.execute('DELETE FROM game_turns WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting turn:', error);
            throw error;
        }
    }

    /**
     * Check if turn is active
     */
    isActive() {
        return this.status === 'active';
    }

    /**
     * Check if turn is pending
     */
    isPending() {
        return this.status === 'pending';
    }

    /**
     * Check if turn is completed
     */
    isCompleted() {
        return this.status === 'completed';
    }

    /**
     * Check if commands are still being accepted
     */
    areCommandsAccepted() {
        const now = new Date();
        const deadline = new Date(this.command_deadline);
        return now <= deadline;
    }

    /**
     * Get time remaining until command deadline
     */
    getTimeUntilDeadline() {
        const now = new Date();
        const deadline = new Date(this.command_deadline);
        const timeRemaining = deadline - now;
        
        return Math.max(0, timeRemaining);
    }

    /**
     * Get time remaining until turn ends
     */
    getTimeUntilEnd() {
        const now = new Date();
        const endTime = new Date(this.end_time);
        const timeRemaining = endTime - now;
        
        return Math.max(0, timeRemaining);
    }

    /**
     * Get turn duration in milliseconds
     */
    getDuration() {
        const startTime = new Date(this.start_time);
        const endTime = new Date(this.end_time);
        return endTime - startTime;
    }

    /**
     * Get turn statistics
     */
    async getStats(dbPool) {
        try {
            // This could include statistics about commands submitted, players active, etc.
            // For now, return basic turn info
            return {
                turnNumber: this.turn_number,
                status: this.status,
                duration: this.getDuration(),
                timeUntilDeadline: this.getTimeUntilDeadline(),
                timeUntilEnd: this.getTimeUntilEnd(),
                commandsAccepted: this.areCommandsAccepted()
            };
        } catch (error) {
            console.error('Error getting turn stats:', error);
            throw error;
        }
    }
}

export default GameTurn;
