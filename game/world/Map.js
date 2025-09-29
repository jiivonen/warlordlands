class Map {
    constructor(dbPool) {
        this.dbPool = dbPool;
    }

    /**
     * Initialize the game map
     */
    async initialize() {
        try {
            console.log('Map initialized');
        } catch (error) {
            console.error('Error initializing map:', error);
            throw error;
        }
    }

    /**
     * Get map tile at specific coordinates
     */
    async getTile(x, y) {
        try {
            const [rows] = await this.dbPool.execute(
                `SELECT m.*, tt.description, tt.movement_cost, tt.defence_bonus 
                 FROM map m 
                 LEFT JOIN terrain_types tt ON m.terrain_type = tt.type 
                 WHERE m.x_coord = ? AND m.y_coord = ?`,
                [x, y]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            console.error('Error getting map tile:', error);
            throw error;
        }
    }

    /**
     * Get visible tiles for a player (within a certain range of their armies)
     */
    async getVisibleTiles(playerId, range = 10) {
        try {
            // Get all armies owned by the player
            const [armies] = await this.dbPool.execute(
                `SELECT a.x_coord, a.y_coord 
                 FROM army a 
                 JOIN realm r ON a.realm_id = r.id 
                 WHERE r.player_id = ?`,
                [playerId]
            );
            
            if (armies.length === 0) {
                return [];
            }
            
            // Get all tiles within range of any player army
            const visibleTiles = [];
            
            for (const army of armies) {
                const tiles = await this.getTilesInRange(army.x_coord, army.y_coord, range);
                visibleTiles.push(...tiles);
            }
            
            // Remove duplicates
            const uniqueTiles = [];
            const seen = new Set();
            
            for (const tile of visibleTiles) {
                const key = `${tile.x_coord},${tile.y_coord}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueTiles.push(tile);
                }
            }
            
            return uniqueTiles;
        } catch (error) {
            console.error('Error getting visible tiles:', error);
            throw error;
        }
    }

    /**
     * Get tiles within a certain range of coordinates
     */
    async getTilesInRange(centerX, centerY, range) {
        try {
            const [rows] = await this.dbPool.execute(
                `SELECT m.*, tt.description, tt.movement_cost, tt.defence_bonus,
                        SQRT(POW(m.x_coord - ?, 2) + POW(m.y_coord - ?, 2)) as distance
                 FROM map m 
                 LEFT JOIN terrain_types tt ON m.terrain_type = tt.type 
                 WHERE SQRT(POW(m.x_coord - ?, 2) + POW(m.y_coord - ?, 2)) <= ?
                 ORDER BY distance`,
                [centerX, centerY, centerX, centerY, range]
            );
            
            return rows;
        } catch (error) {
            console.error('Error getting tiles in range:', error);
            throw error;
        }
    }

    /**
     * Get map region (rectangular area)
     */
    async getMapRegion(minX, minY, maxX, maxY) {
        try {
            const [rows] = await this.dbPool.execute(
                `SELECT m.*, tt.description, tt.movement_cost, tt.defence_bonus 
                 FROM map m 
                 LEFT JOIN terrain_types tt ON m.terrain_type = tt.type 
                 WHERE m.x_coord >= ? AND m.x_coord <= ? 
                 AND m.y_coord >= ? AND m.y_coord <= ?
                 ORDER BY m.x_coord, m.y_coord`,
                [minX, maxX, minY, maxY]
            );
            
            return rows;
        } catch (error) {
            console.error('Error getting map region:', error);
            throw error;
        }
    }

    /**
     * Get terrain statistics
     */
    async getTerrainStats() {
        try {
            const [rows] = await this.dbPool.execute(
                `SELECT m.terrain_type, COUNT(*) as count, 
                        tt.description, tt.movement_cost, tt.defence_bonus
                 FROM map m 
                 LEFT JOIN terrain_types tt ON m.terrain_type = tt.type 
                 GROUP BY m.terrain_type 
                 ORDER BY count DESC`
            );
            
            return rows;
        } catch (error) {
            console.error('Error getting terrain stats:', error);
            throw error;
        }
    }

    /**
     * Check if coordinates are within map bounds
     */
    async isWithinBounds(x, y) {
        try {
            const [rows] = await this.dbPool.execute(
                'SELECT COUNT(*) as count FROM map WHERE x_coord = ? AND y_coord = ?',
                [x, y]
            );
            
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error checking map bounds:', error);
            return false;
        }
    }

    /**
     * Get map boundaries
     */
    async getMapBoundaries() {
        try {
            const [rows] = await this.dbPool.execute(
                `SELECT 
                    MIN(x_coord) as min_x,
                    MAX(x_coord) as max_x,
                    MIN(y_coord) as min_y,
                    MAX(y_coord) as max_y,
                    COUNT(*) as total_tiles
                 FROM map`
            );
            
            return rows[0];
        } catch (error) {
            console.error('Error getting map boundaries:', error);
            throw error;
        }
    }

    /**
     * Find suitable starting positions for new players
     */
    async findStartingPositions(count = 1) {
        try {
            // Find positions that are:
            // 1. On open terrain
            // 2. Not occupied by armies
            // 3. Not within range of existing armies
            // 4. Well-spaced from each other
            
            const [rows] = await this.dbPool.execute(
                `SELECT m.x_coord, m.y_coord, m.terrain_type
                 FROM map m 
                 LEFT JOIN army a ON m.x_coord = a.x_coord AND m.y_coord = a.y_coord
                 WHERE m.terrain_type = 'open' 
                 AND a.id IS NULL
                 ORDER BY RAND()
                 LIMIT ?`,
                [count * 10] // Get more candidates than needed
            );
            
            const positions = [];
            const minDistance = 20; // Minimum distance between starting positions
            
            for (const row of rows) {
                if (positions.length >= count) break;
                
                // Check if this position is far enough from existing positions
                let isSuitable = true;
                for (const pos of positions) {
                    const distance = Math.sqrt(
                        Math.pow(row.x_coord - pos.x_coord, 2) + 
                        Math.pow(row.y_coord - pos.y_coord, 2)
                    );
                    if (distance < minDistance) {
                        isSuitable = false;
                        break;
                    }
                }
                
                if (isSuitable) {
                    positions.push(row);
                }
            }
            
            return positions.slice(0, count);
        } catch (error) {
            console.error('Error finding starting positions:', error);
            throw error;
        }
    }

    /**
     * Get strategic map information for a player
     */
    async getStrategicMapInfo(playerId) {
        try {
            const visibleTiles = await this.getVisibleTiles(playerId, 15);
            const [playerArmies] = await this.dbPool.execute(
                `SELECT a.*, r.name as realm_name,
                        (SELECT MIN(uc.strategic_speed) 
                         FROM unit u 
                         JOIN unit_classes uc ON u.unit_class_id = uc.id 
                         WHERE u.army_id = a.id) as strategic_speed
                 FROM army a 
                 JOIN realm r ON a.realm_id = r.id 
                 WHERE r.player_id = ?`,
                [playerId]
            );
            
            const [enemyArmies] = await this.dbPool.execute(
                `SELECT a.*, r.name as realm_name, p.nick as player_nick
                 FROM army a 
                 JOIN realm r ON a.realm_id = r.id 
                 JOIN player p ON r.player_id = p.id 
                 WHERE r.player_id != ?`,
                [playerId]
            );
            
            return {
                visibleTiles,
                playerArmies,
                enemyArmies,
                mapBounds: await this.getMapBoundaries()
            };
        } catch (error) {
            console.error('Error getting strategic map info:', error);
            throw error;
        }
    }
}

export default Map;
