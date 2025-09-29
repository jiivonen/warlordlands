class Army {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.realm_id = data.realm_id;
        this.x_coord = data.x_coord;
        this.y_coord = data.y_coord;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Optional joined data
        this.realm = data.realm || null;
        this.units = data.units || [];
    }

    /**
     * Get army by ID
     */
    static async getById(dbPool, armyId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT a.*, r.name as realm_name, r.player_id 
                 FROM army a 
                 LEFT JOIN realm r ON a.realm_id = r.id 
                 WHERE a.id = ?`,
                [armyId]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            const army = new Army(rows[0]);
            army.realm = {
                name: rows[0].realm_name,
                player_id: rows[0].player_id
            };
            
            return army;
        } catch (error) {
            console.error('Error getting army by ID:', error);
            throw error;
        }
    }

    /**
     * Get all armies owned by a player
     */
    static async getByPlayerId(dbPool, playerId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT a.*, r.name as realm_name 
                 FROM army a 
                 JOIN realm r ON a.realm_id = r.id 
                 WHERE r.player_id = ? 
                 ORDER BY a.created_at DESC`,
                [playerId]
            );
            
            return rows.map(row => {
                const army = new Army(row);
                army.realm = { name: row.realm_name };
                return army;
            });
        } catch (error) {
            console.error('Error getting armies by player ID:', error);
            throw error;
        }
    }

    /**
     * Get all armies in a realm
     */
    static async getByRealmId(dbPool, realmId) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM army WHERE realm_id = ? ORDER BY created_at DESC',
                [realmId]
            );
            
            return rows.map(row => new Army(row));
        } catch (error) {
            console.error('Error getting armies by realm ID:', error);
            throw error;
        }
    }

    /**
     * Get army at specific coordinates
     */
    static async getAtCoordinates(dbPool, x, y) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT a.*, r.name as realm_name, r.player_id 
                 FROM army a 
                 LEFT JOIN realm r ON a.realm_id = r.id 
                 WHERE a.x_coord = ? AND a.y_coord = ?`,
                [x, y]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            const army = new Army(rows[0]);
            army.realm = {
                name: rows[0].realm_name,
                player_id: rows[0].player_id
            };
            
            return army;
        } catch (error) {
            console.error('Error getting army at coordinates:', error);
            throw error;
        }
    }

    /**
     * Create a new army
     */
    static async create(dbPool, armyData) {
        try {
            const { name, realm_id, x_coord, y_coord } = armyData;
            
            // Check if army name already exists in the realm
            const [existing] = await dbPool.execute(
                'SELECT id FROM army WHERE name = ? AND realm_id = ?',
                [name, realm_id]
            );
            
            if (existing.length > 0) {
                throw new Error('Army name already exists in this realm');
            }
            
            // Check if coordinates are already occupied
            const [occupied] = await dbPool.execute(
                'SELECT id FROM army WHERE x_coord = ? AND y_coord = ?',
                [x_coord, y_coord]
            );
            
            if (occupied.length > 0) {
                throw new Error('Coordinates are already occupied by another army');
            }
            
            const [result] = await dbPool.execute(
                'INSERT INTO army (name, realm_id, x_coord, y_coord) VALUES (?, ?, ?, ?)',
                [name, realm_id, x_coord, y_coord]
            );
            
            return await Army.getById(dbPool, result.insertId);
        } catch (error) {
            console.error('Error creating army:', error);
            throw error;
        }
    }

    /**
     * Update army information
     */
    async update(dbPool, updateData) {
        try {
            const allowedFields = ['name', 'x_coord', 'y_coord'];
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
                `UPDATE army SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            // Refresh the army data
            const updatedArmy = await Army.getById(dbPool, this.id);
            Object.assign(this, updatedArmy);
            
            return this;
        } catch (error) {
            console.error('Error updating army:', error);
            throw error;
        }
    }

    /**
     * Move army to new coordinates
     */
    async moveTo(dbPool, newX, newY) {
        try {
            // Check if new coordinates are already occupied
            const [occupied] = await dbPool.execute(
                'SELECT id FROM army WHERE x_coord = ? AND y_coord = ? AND id != ?',
                [newX, newY, this.id]
            );
            
            this.x_coord = newX;
            this.y_coord = newY;
            
            await dbPool.execute(
                'UPDATE army SET x_coord = ?, y_coord = ? WHERE id = ?',
                [newX, newY, this.id]
            );
            
            return this;
        } catch (error) {
            console.error('Error moving army:', error);
            throw error;
        }
    }

    /**
     * Delete army and all associated units
     */
    async delete(dbPool) {
        try {
            // This will cascade delete units due to foreign key constraints
            await dbPool.execute('DELETE FROM army WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting army:', error);
            throw error;
        }
    }

    /**
     * Get all units in this army
     */
    async getUnits(dbPool) {
        try {
            const Unit = (await import('./Unit.js')).default;
            return await Unit.getByArmyId(dbPool, this.id);
        } catch (error) {
            console.error('Error getting army units:', error);
            throw error;
        }
    }

    /**
     * Get army statistics
     */
    async getStats(dbPool) {
        try {
            const [unitCount] = await dbPool.execute(
                'SELECT COUNT(*) as count FROM unit WHERE army_id = ?',
                [this.id]
            );
            
            const [totalHP] = await dbPool.execute(
                'SELECT SUM(current_hitpoints) as total FROM unit WHERE army_id = ?',
                [this.id]
            );
            
            return {
                units: unitCount[0].count,
                totalHitpoints: totalHP[0].total || 0,
            };
        } catch (error) {
            console.error('Error getting army stats:', error);
            throw error;
        }
    }

    /**
     * Get army combat power
     */
    async getCombatPower(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT SUM(uc.melee_combat + uc.ranged_combat) as attack_power,
                        SUM(uc.defence) as defence_power
                 FROM unit u 
                 JOIN unit_classes uc ON u.unit_class_id = uc.id 
                 WHERE u.army_id = ?`,
                [this.id]
            );
            
            return {
                attack: rows[0].attack_power || 0,
                defence: rows[0].defence_power || 0,
                total: (rows[0].attack_power || 0) + (rows[0].defence_power || 0)
            };
        } catch (error) {
            console.error('Error getting army combat power:', error);
            throw error;
        }
    }

    /**
     * Check if army is at full strength
     */
    async isAtFullStrength(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT COUNT(*) as damaged_units
                 FROM unit u 
                 JOIN unit_classes uc ON u.unit_class_id = uc.id 
                 WHERE u.army_id = ? AND u.current_hitpoints < uc.hitpoints`,
                [this.id]
            );
            
            return rows[0].damaged_units === 0;
        } catch (error) {
            console.error('Error checking army strength:', error);
            throw error;
        }
    }

    /**
     * Get army strategic speed (lowest speed of all units in the army)
     */
    async getStrategicSpeed(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT MIN(uc.strategic_speed) as min_speed
                 FROM unit u 
                 JOIN unit_classes uc ON u.unit_class_id = uc.id 
                 WHERE u.army_id = ?`,
                [this.id]
            );
            
            // If army has no units, return default speed of 1
            return rows[0].min_speed || 1;
        } catch (error) {
            console.error('Error getting army strategic speed:', error);
            throw error;
        }
    }

    /**
     * Get nearby armies (within specified range)
     */
    async getNearbyArmies(dbPool, range = 3) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT a.*, r.name as realm_name, r.player_id,
                        SQRT(POW(a.x_coord - ?, 2) + POW(a.y_coord - ?, 2)) as distance
                 FROM army a 
                 LEFT JOIN realm r ON a.realm_id = r.id 
                 WHERE a.id != ? 
                 AND SQRT(POW(a.x_coord - ?, 2) + POW(a.y_coord - ?, 2)) <= ?
                 ORDER BY distance`,
                [this.x_coord, this.y_coord, this.id, this.x_coord, this.y_coord, range]
            );
            
            return rows.map(row => {
                const army = new Army(row);
                army.realm = {
                    name: row.realm_name,
                    player_id: row.player_id
                };
                army.distance = row.distance;
                return army;
            });
        } catch (error) {
            console.error('Error getting nearby armies:', error);
            throw error;
        }
    }
}

export default Army;
