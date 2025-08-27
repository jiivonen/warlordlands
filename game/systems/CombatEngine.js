const Army = require('../entities/Army');
const Unit = require('../entities/Unit');

class CombatEngine {
    constructor(dbPool) {
        this.dbPool = dbPool;
    }

    /**
     * Initiate combat between two armies
     */
    async initiateCombat(attackerArmyId, defenderArmyId) {
        try {
            const attackerArmy = await Army.getById(this.dbPool, attackerArmyId);
            if (!attackerArmy) {
                throw new Error('Attacking army not found');
            }

            const defenderArmy = await Army.getById(this.dbPool, defenderArmyId);
            if (!defenderArmy) {
                throw new Error('Defending army not found');
            }

            // Check if armies are in the same location
            if (!this.areArmiesInSameLocation(attackerArmy, defenderArmy)) {
                throw new Error('Armies must be in the same location to engage in combat');
            }

            // Check if armies are from different players
            if (attackerArmy.realm.player_id === defenderArmy.realm.player_id) {
                throw new Error('Cannot attack your own army');
            }

            // Get all units for both armies
            const attackerUnits = await attackerArmy.getUnits(this.dbPool);
            const defenderUnits = await defenderArmy.getUnits(this.dbPool);

            if (attackerUnits.length === 0) {
                throw new Error('Attacking army has no units');
            }

            if (defenderUnits.length === 0) {
                throw new Error('Defending army has no units');
            }

            // Execute combat
            const combatResult = await this.executeCombat(attackerUnits, defenderUnits);

            // Update unit health based on combat results
            await this.applyCombatResults(combatResult);

            return {
                success: true,
                combatResult,
                attackerArmy: attackerArmy.name,
                defenderArmy: defenderArmy.name
            };

        } catch (error) {
            console.error('Error initiating combat:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if two armies are in the same location
     */
    areArmiesInSameLocation(army1, army2) {
        return army1.x_coord === army2.x_coord && army1.y_coord === army2.y_coord;
    }

    /**
     * Execute combat between two groups of units
     */
    async executeCombat(attackerUnits, defenderUnits) {
        const result = {
            attacker: { units: [], totalDamage: 0, casualties: 0 },
            defender: { units: [], totalDamage: 0, casualties: 0 },
            rounds: []
        };

        // Filter out dead units
        const aliveAttackers = attackerUnits.filter(unit => unit.isAlive());
        const aliveDefenders = defenderUnits.filter(unit => unit.isAlive());

        let round = 1;
        const maxRounds = 10; // Prevent infinite combat

        while (aliveAttackers.length > 0 && aliveDefenders.length > 0 && round <= maxRounds) {
            const roundResult = await this.executeCombatRound(aliveAttackers, aliveDefenders, round);
            result.rounds.push(roundResult);

            // Update alive units lists
            aliveAttackers.splice(0, aliveAttackers.length, ...aliveAttackers.filter(unit => unit.isAlive()));
            aliveDefenders.splice(0, aliveDefenders.length, ...aliveDefenders.filter(unit => unit.isAlive()));

            round++;
        }

        // Calculate final results
        result.attacker.units = attackerUnits;
        result.defender.units = defenderUnits;
        result.attacker.casualties = attackerUnits.filter(unit => !unit.isAlive()).length;
        result.defender.casualties = defenderUnits.filter(unit => !unit.isAlive()).length;

        return result;
    }

    /**
     * Execute a single round of combat
     */
    async executeCombatRound(attackerUnits, defenderUnits, roundNumber) {
        const roundResult = {
            round: roundNumber,
            attackerActions: [],
            defenderActions: []
        };

        // Attacker phase
        for (const attacker of attackerUnits) {
            if (!attacker.isAlive()) continue;

            const target = this.selectTarget(attacker, defenderUnits);
            if (target) {
                const action = await this.executeAttack(attacker, target);
                roundResult.attackerActions.push(action);
            }
        }

        // Defender phase (if any defenders are still alive)
        const aliveDefenders = defenderUnits.filter(unit => unit.isAlive());
        for (const defender of aliveDefenders) {
            if (!defender.isAlive()) continue;

            const target = this.selectTarget(defender, attackerUnits);
            if (target) {
                const action = await this.executeAttack(defender, target);
                roundResult.defenderActions.push(action);
            }
        }

        return roundResult;
    }

    /**
     * Select a target for an attacking unit
     */
    selectTarget(attacker, potentialTargets) {
        const aliveTargets = potentialTargets.filter(unit => unit.isAlive());
        
        if (aliveTargets.length === 0) {
            return null;
        }

        // Simple target selection: prioritize weakest units
        return aliveTargets.reduce((weakest, current) => {
            return (current.current_hitpoints < weakest.current_hitpoints) ? current : weakest;
        });
    }

    /**
     * Execute an attack from one unit to another
     */
    async executeAttack(attacker, defender) {
        const action = {
            attacker: attacker.name,
            defender: defender.name,
            damage: 0,
            hit: false,
            critical: false
        };

        // Get combat stats
        const attackerStats = await attacker.getCombatStats(this.dbPool);
        const defenderStats = await defender.getCombatStats(this.dbPool);

        // Determine attack type (melee or ranged)
        const isRanged = attackerStats.attack_range > 1;
        const attackPower = isRanged ? attackerStats.ranged_combat : attackerStats.melee_combat;

        // Calculate hit chance (base 80%)
        const baseHitChance = 0.8;
        const hitRoll = Math.random();

        if (hitRoll <= baseHitChance) {
            action.hit = true;

            // Calculate damage
            const baseDamage = attackPower;
            const defenseReduction = defenderStats.defence * 0.5; // Defense reduces damage by 50%
            const finalDamage = Math.max(1, Math.floor(baseDamage - defenseReduction));

            // Critical hit chance (10%)
            if (Math.random() <= 0.1) {
                action.critical = true;
                action.damage = Math.floor(finalDamage * 1.5);
            } else {
                action.damage = finalDamage;
            }

            // Apply damage
            await defender.takeDamage(this.dbPool, action.damage);
        }

        return action;
    }

    /**
     * Apply combat results to the database
     */
    async applyCombatResults(combatResult) {
        try {
            // Update all units that participated in combat
            const allUnits = [...combatResult.attacker.units, ...combatResult.defender.units];
            
            for (const unit of allUnits) {
                await this.dbPool.execute(
                    'UPDATE unit SET current_hitpoints = ? WHERE id = ?',
                    [unit.current_hitpoints, unit.id]
                );
            }

            console.log(`Combat completed: ${combatResult.attacker.casualties} attacker casualties, ${combatResult.defender.casualties} defender casualties`);
        } catch (error) {
            console.error('Error applying combat results:', error);
            throw error;
        }
    }

    /**
     * Process all pending combats (called during turn resolution)
     */
    async processAllCombats() {
        try {
            // This would typically process queued combat commands
            // For now, we'll just log that combat processing is complete
            console.log('Combat processing completed for this turn');
        } catch (error) {
            console.error('Error processing combats:', error);
            throw error;
        }
    }

    /**
     * Get combat statistics for an army
     */
    async getArmyCombatStats(armyId) {
        try {
            const army = await Army.getById(this.dbPool, armyId);
            if (!army) {
                throw new Error('Army not found');
            }

            const units = await army.getUnits(this.dbPool);
            const combatPower = await army.getCombatPower(this.dbPool);

            return {
                army: army.name,
                unitCount: units.length,
                aliveUnits: units.filter(unit => unit.isAlive()).length,
                totalHP: units.reduce((sum, unit) => sum + unit.current_hitpoints, 0),
                averageHP: units.length > 0 ? Math.round(units.reduce((sum, unit) => sum + unit.current_hitpoints, 0) / units.length) : 0,
                combatPower
            };
        } catch (error) {
            console.error('Error getting army combat stats:', error);
            throw error;
        }
    }

    /**
     * Simulate combat outcome without executing it
     */
    async simulateCombat(attackerArmyId, defenderArmyId) {
        try {
            const attackerArmy = await Army.getById(this.dbPool, attackerArmyId);
            const defenderArmy = await Army.getById(this.dbPool, defenderArmyId);

            if (!attackerArmy || !defenderArmy) {
                throw new Error('One or both armies not found');
            }

            const attackerUnits = await attackerArmy.getUnits(this.dbPool);
            const defenderUnits = await defenderArmy.getUnits(this.dbPool);

            // Create copies for simulation
            const attackerCopy = attackerUnits.map(unit => ({ ...unit }));
            const defenderCopy = defenderUnits.map(unit => ({ ...unit }));

            const simulationResult = await this.executeCombat(attackerCopy, defenderCopy);

            return {
                success: true,
                simulation: simulationResult,
                attackerStats: await this.getArmyCombatStats(attackerArmyId),
                defenderStats: await this.getArmyCombatStats(defenderArmyId)
            };
        } catch (error) {
            console.error('Error simulating combat:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = CombatEngine;
