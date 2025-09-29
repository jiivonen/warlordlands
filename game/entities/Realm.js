class Realm {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.player_id = data.player_id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Optional joined data
        this.player = data.player || null;
    }

    /**
     * Get realm by ID
     */
    static async getById(dbPool, realmId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT r.*, p.nick as player_nick, p.fullname as player_fullname 
                 FROM realm r 
                 LEFT JOIN player p ON r.player_id = p.id 
                 WHERE r.id = ?`,
                [realmId]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            const realm = new Realm(rows[0]);
            realm.player = {
                nick: rows[0].player_nick,
                fullname: rows[0].player_fullname
            };
            
            return realm;
        } catch (error) {
            console.error('Error getting realm by ID:', error);
            throw error;
        }
    }

    /**
     * Get all realms owned by a player
     */
    static async getByPlayerId(dbPool, playerId) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM realm WHERE player_id = ? ORDER BY created_at DESC',
                [playerId]
            );
            
            return rows.map(row => new Realm(row));
        } catch (error) {
            console.error('Error getting realms by player ID:', error);
            throw error;
        }
    }

    /**
     * Get all realms (for admin purposes)
     */
    static async getAll(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT r.*, p.nick as player_nick, p.fullname as player_fullname 
                 FROM realm r 
                 LEFT JOIN player p ON r.player_id = p.id 
                 ORDER BY r.created_at DESC`
            );
            
            return rows.map(row => {
                const realm = new Realm(row);
                realm.player = {
                    nick: row.player_nick,
                    fullname: row.player_fullname
                };
                return realm;
            });
        } catch (error) {
            console.error('Error getting all realms:', error);
            throw error;
        }
    }

    /**
     * Create a new realm
     */
    static async create(dbPool, realmData) {
        try {
            const { name, player_id } = realmData;
            
            // Check if realm name already exists
            const [existing] = await dbPool.execute(
                'SELECT id FROM realm WHERE name = ?',
                [name]
            );
            
            if (existing.length > 0) {
                throw new Error('Realm name already exists');
            }
            
            const [result] = await dbPool.execute(
                'INSERT INTO realm (name, player_id) VALUES (?, ?)',
                [name, player_id]
            );
            
            return await Realm.getById(dbPool, result.insertId);
        } catch (error) {
            console.error('Error creating realm:', error);
            throw error;
        }
    }

    /**
     * Update realm information
     */
    async update(dbPool, updateData) {
        try {
            const allowedFields = ['name'];
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
                `UPDATE realm SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            // Refresh the realm data
            const updatedRealm = await Realm.getById(dbPool, this.id);
            Object.assign(this, updatedRealm);
            
            return this;
        } catch (error) {
            console.error('Error updating realm:', error);
            throw error;
        }
    }

    /**
     * Get all armies in this realm
     */
    async getArmies(dbPool) {
        try {
            const Army = (await import('./Army.js')).default;
            return await Army.getByRealmId(dbPool, this.id);
        } catch (error) {
            console.error('Error getting realm armies:', error);
            throw error;
        }
    }

    /**
     * Get all units in this realm
     */
    async getUnits(dbPool) {
        try {
            const Unit = (await import('./Unit.js')).default;
            return await Unit.getByRealmId(dbPool, this.id);
        } catch (error) {
            console.error('Error getting realm units:', error);
            throw error;
        }
    }

    /**
     * Get realm statistics
     */
    async getStats(dbPool) {
        try {
            const [armyCount] = await dbPool.execute(
                'SELECT COUNT(*) as count FROM army WHERE realm_id = ?',
                [this.id]
            );
            
            const [unitCount] = await dbPool.execute(
                'SELECT COUNT(*) as count FROM unit WHERE realm_id = ?',
                [this.id]
            );
                        
            return {
                armies: armyCount[0].count,
                units: unitCount[0].count,
            };
        } catch (error) {
            console.error('Error getting realm stats:', error);
            throw error;
        }
    }

    /**
     * Get realm boundaries (map tiles)
     */
    async getBoundaries(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM map WHERE realm_id = ? ORDER BY x_coord, y_coord',
                [this.id]
            );
            
            return rows;
        } catch (error) {
            console.error('Error getting realm boundaries:', error);
            throw error;
        }
    }
}

export default Realm;
