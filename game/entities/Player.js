class Player {
    constructor(data) {
        this.id = data.id;
        this.nick = data.nick;
        this.fullname = data.fullname;
        this.is_private = data.is_private;
        this.email = data.email;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Get player by ID
     */
    static async getById(dbPool, playerId) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM player WHERE id = ?',
                [playerId]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Player(rows[0]);
        } catch (error) {
            console.error('Error getting player by ID:', error);
            throw error;
        }
    }

    /**
     * Get player by email
     */
    static async getByEmail(dbPool, email) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM player WHERE email = ?',
                [email]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Player(rows[0]);
        } catch (error) {
            console.error('Error getting player by email:', error);
            throw error;
        }
    }

    /**
     * Get player by nickname
     */
    static async getByNick(dbPool, nick) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM player WHERE nick = ?',
                [nick]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Player(rows[0]);
        } catch (error) {
            console.error('Error getting player by nick:', error);
            throw error;
        }
    }

    /**
     * Create a new player
     */
    static async create(dbPool, playerData) {
        try {
            const { nick, fullname, email, password_hash, is_private = false } = playerData;
            
            const [result] = await dbPool.execute(
                'INSERT INTO player (nick, fullname, email, password_hash, is_private) VALUES (?, ?, ?, ?, ?)',
                [nick, fullname, email, password_hash, is_private]
            );
            
            return await Player.getById(dbPool, result.insertId);
        } catch (error) {
            console.error('Error creating player:', error);
            throw error;
        }
    }

    /**
     * Update player information
     */
    async update(dbPool, updateData) {
        try {
            const allowedFields = ['nick', 'fullname', 'email', 'is_private'];
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
                `UPDATE player SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            // Refresh the player data
            const updatedPlayer = await Player.getById(dbPool, this.id);
            Object.assign(this, updatedPlayer);
            
            return this;
        } catch (error) {
            console.error('Error updating player:', error);
            throw error;
        }
    }

    /**
     * Get all realms owned by this player
     */
    async getRealm(dbPool) {
        try {
            const Realm = (await import('./Realm.js')).default;
            return await Realm.getByPlayerId(dbPool, this.id);
        } catch (error) {
            console.error('Error getting player realms:', error);
            throw error;
        }
    }

    /**
     * Get player statistics
     */
    async getStats(dbPool) {
        try {
            const [realmCount] = await dbPool.execute(
                'SELECT COUNT(*) as count FROM realm WHERE player_id = ?',
                [this.id]
            );
            
            const [armyCount] = await dbPool.execute(
                `SELECT COUNT(*) as count FROM army a 
                 JOIN realm r ON a.realm_id = r.id 
                 WHERE r.player_id = ?`,
                [this.id]
            );
            
            const [unitCount] = await dbPool.execute(
                `SELECT COUNT(*) as count FROM unit u 
                 JOIN realm r ON u.realm_id = r.id 
                 WHERE r.player_id = ?`,
                [this.id]
            );
            
            return {
                realms: realmCount[0].count,
                armies: armyCount[0].count,
                units: unitCount[0].count
            };
        } catch (error) {
            console.error('Error getting player stats:', error);
            throw error;
        }
    }

    /**
     * Check if player is active (has logged in recently)
     */
    async isActive(dbPool, daysThreshold = 7) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT updated_at FROM player WHERE id = ? AND updated_at > DATE_SUB(NOW(), INTERVAL ? DAY)',
                [this.id, daysThreshold]
            );
            
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking player activity:', error);
            throw error;
        }
    }
}

export default Player;
