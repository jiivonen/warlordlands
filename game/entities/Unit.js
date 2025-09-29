class Unit {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.realm_id = data.realm_id;
        this.unit_class_id = data.unit_class_id;
        this.army_id = data.army_id;
        this.current_hitpoints = data.current_hitpoints;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Optional joined data
        this.unit_class = data.unit_class || null;
        this.army = data.army || null;
        this.realm = data.realm || null;
    }

    /**
     * Get unit by ID
     */
    static async getById(dbPool, unitId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT u.*, uc.name as unit_class_name, uc.melee_combat, uc.ranged_combat, 
                        uc.defence, uc.attack_range, uc.hitpoints, uc.unit_type, uc.strategic_speed,
                        a.name as army_name, r.name as realm_name, r.player_id
                 FROM unit u 
                 LEFT JOIN unit_classes uc ON u.unit_class_id = uc.id
                 LEFT JOIN army a ON u.army_id = a.id
                 LEFT JOIN realm r ON u.realm_id = r.id
                 WHERE u.id = ?`,
                [unitId]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            const unit = new Unit(rows[0]);
            unit.unit_class = {
                name: rows[0].unit_class_name,
                melee_combat: rows[0].melee_combat,
                ranged_combat: rows[0].ranged_combat,
                defence: rows[0].defence,
                attack_range: rows[0].attack_range,
                hitpoints: rows[0].hitpoints,
                unit_type: rows[0].unit_type,
                strategic_speed: rows[0].strategic_speed
            };
            unit.army = { name: rows[0].army_name };
            unit.realm = { 
                name: rows[0].realm_name,
                player_id: rows[0].player_id
            };
            
            return unit;
        } catch (error) {
            console.error('Error getting unit by ID:', error);
            throw error;
        }
    }

    /**
     * Get all units owned by a player
     */
    static async getByPlayerId(dbPool, playerId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT u.*, uc.name as unit_class_name, a.name as army_name, r.name as realm_name
                 FROM unit u 
                 JOIN unit_classes uc ON u.unit_class_id = uc.id
                 JOIN army a ON u.army_id = a.id
                 JOIN realm r ON u.realm_id = r.id
                 WHERE r.player_id = ? 
                 ORDER BY u.created_at DESC`,
                [playerId]
            );
            
            return rows.map(row => {
                const unit = new Unit(row);
                unit.unit_class = { name: row.unit_class_name };
                unit.army = { name: row.army_name };
                unit.realm = { name: row.realm_name };
                return unit;
            });
        } catch (error) {
            console.error('Error getting units by player ID:', error);
            throw error;
        }
    }

    /**
     * Get all units in a realm
     */
    static async getByRealmId(dbPool, realmId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT u.*, uc.name as unit_class_name, a.name as army_name
                 FROM unit u 
                 JOIN unit_classes uc ON u.unit_class_id = uc.id
                 JOIN army a ON u.army_id = a.id
                 WHERE u.realm_id = ? 
                 ORDER BY u.created_at DESC`,
                [realmId]
            );
            
            return rows.map(row => {
                const unit = new Unit(row);
                unit.unit_class = { name: row.unit_class_name };
                unit.army = { name: row.army_name };
                return unit;
            });
        } catch (error) {
            console.error('Error getting units by realm ID:', error);
            throw error;
        }
    }

    /**
     * Get all units in an army
     */
    static async getByArmyId(dbPool, armyId) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT u.*, uc.name as unit_class_name, uc.melee_combat, uc.ranged_combat, 
                        uc.defence, uc.attack_range, uc.hitpoints, uc.strategic_speed
                 FROM unit u 
                 JOIN unit_classes uc ON u.unit_class_id = uc.id
                 WHERE u.army_id = ? 
                 ORDER BY u.created_at DESC`,
                [armyId]
            );
            
            return rows.map(row => {
                const unit = new Unit(row);
                unit.unit_class = {
                    name: row.unit_class_name,
                    melee_combat: row.melee_combat,
                    ranged_combat: row.ranged_combat,
                    defence: row.defence,
                    attack_range: row.attack_range,
                    hitpoints: row.hitpoints,
                    strategic_speed: row.strategic_speed
                };
                return unit;
            });
        } catch (error) {
            console.error('Error getting units by army ID:', error);
            throw error;
        }
    }

    /**
     * Create a new unit
     */
    static async create(dbPool, unitData) {
        try {
            const { name, realm_id, unit_class_id, army_id, current_hitpoints } = unitData;
            
            // Check if unit name already exists in the realm
            const [existing] = await dbPool.execute(
                'SELECT id FROM unit WHERE name = ? AND realm_id = ?',
                [name, realm_id]
            );
            
            if (existing.length > 0) {
                throw new Error('Unit name already exists in this realm');
            }
            
            // Verify army belongs to the realm
            const [army] = await dbPool.execute(
                'SELECT id FROM army WHERE id = ? AND realm_id = ?',
                [army_id, realm_id]
            );
            
            if (army.length === 0) {
                throw new Error('Army does not belong to the specified realm');
            }
            
            const [result] = await dbPool.execute(
                'INSERT INTO unit (name, realm_id, unit_class_id, army_id, current_hitpoints) VALUES (?, ?, ?, ?, ?)',
                [name, realm_id, unit_class_id, army_id, current_hitpoints]
            );
            
            return await Unit.getById(dbPool, result.insertId);
        } catch (error) {
            console.error('Error creating unit:', error);
            throw error;
        }
    }

    /**
     * Update unit information
     */
    async update(dbPool, updateData) {
        try {
            const allowedFields = ['name', 'current_hitpoints', 'army_id'];
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
                `UPDATE unit SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            // Refresh the unit data
            const updatedUnit = await Unit.getById(dbPool, this.id);
            Object.assign(this, updatedUnit);
            
            return this;
        } catch (error) {
            console.error('Error updating unit:', error);
            throw error;
        }
    }

    /**
     * Take damage
     */
    async takeDamage(dbPool, damage) {
        try {
            const newHP = Math.max(0, this.current_hitpoints - damage);
            this.current_hitpoints = newHP;
            
            await dbPool.execute(
                'UPDATE unit SET current_hitpoints = ? WHERE id = ?',
                [newHP, this.id]
            );
            
            return this;
        } catch (error) {
            console.error('Error taking damage:', error);
            throw error;
        }
    }

    /**
     * Heal unit
     */
    async heal(dbPool, healAmount) {
        try {
            if (!this.unit_class) {
                const unitClass = await this.getUnitClass(dbPool);
                this.unit_class = unitClass;
            }
            
            const maxHP = this.unit_class.hitpoints;
            const newHP = Math.min(maxHP, this.current_hitpoints + healAmount);
            this.current_hitpoints = newHP;
            
            await dbPool.execute(
                'UPDATE unit SET current_hitpoints = ? WHERE id = ?',
                [newHP, this.id]
            );
            
            return this;
        } catch (error) {
            console.error('Error healing unit:', error);
            throw error;
        }
    }

    /**
     * Delete unit
     */
    async delete(dbPool) {
        try {
            await dbPool.execute('DELETE FROM unit WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting unit:', error);
            throw error;
        }
    }

    /**
     * Get unit class information
     */
    async getUnitClass(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                'SELECT * FROM unit_classes WHERE id = ?',
                [this.unit_class_id]
            );
            
            if (rows.length === 0) {
                throw new Error('Unit class not found');
            }
            
            return rows[0];
        } catch (error) {
            console.error('Error getting unit class:', error);
            throw error;
        }
    }

    /**
     * Get unit keywords
     */
    async getKeywords(dbPool) {
        try {
            const [rows] = await dbPool.execute(
                `SELECT k.keyword, k.description 
                 FROM keywords k 
                 JOIN unit_classes_keywords uck ON k.keyword = uck.keyword 
                 WHERE uck.unit_class_id = ?`,
                [this.unit_class_id]
            );
            
            return rows;
        } catch (error) {
            console.error('Error getting unit keywords:', error);
            throw error;
        }
    }

    /**
     * Get unit combat stats
     */
    async getCombatStats(dbPool) {
        try {
            if (!this.unit_class) {
                const unitClass = await this.getUnitClass(dbPool);
                this.unit_class = unitClass;
            }
            
            const healthPercentage = (this.current_hitpoints / this.unit_class.hitpoints) * 100;
            
            return {
                melee_combat: this.unit_class.melee_combat,
                ranged_combat: this.unit_class.ranged_combat,
                defence: this.unit_class.defence,
                attack_range: this.unit_class.attack_range,
                current_hitpoints: this.current_hitpoints,
                max_hitpoints: this.unit_class.hitpoints,
                health_percentage: Math.round(healthPercentage)
            };
        } catch (error) {
            console.error('Error getting unit combat stats:', error);
            throw error;
        }
    }

    /**
     * Check if unit is alive
     */
    isAlive() {
        return this.current_hitpoints > 0;
    }
}

export default Unit;
