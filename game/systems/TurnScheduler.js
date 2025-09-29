import GameTurnManager from './GameTurnManager.js';

class TurnScheduler {
    constructor(dbPool, checkIntervalMinutes = 15) {
        this.dbPool = dbPool;
        this.gameTurnManager = new GameTurnManager(dbPool);
        this.checkIntervalMinutes = checkIntervalMinutes;
        this.intervalId = null;
        this.isRunning = false;
    }

    /**
     * Start the automatic turn checking scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('Turn scheduler is already running');
            return;
        }

        console.log(`Starting turn scheduler with ${this.checkIntervalMinutes} minute intervals`);
        this.isRunning = true;

        // Check immediately on start
        this.checkOverdueTurns();

        // Set up periodic checking
        this.intervalId = setInterval(() => {
            this.checkOverdueTurns();
        }, this.checkIntervalMinutes * 60 * 1000);
    }

    /**
     * Stop the automatic turn checking scheduler
     */
    stop() {
        if (!this.isRunning) {
            console.log('Turn scheduler is not running');
            return;
        }

        console.log('Stopping turn scheduler');
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Check for overdue turns and process them
     */
    async checkOverdueTurns() {
        try {
            console.log(`[${new Date().toISOString()}] Checking for overdue turns...`);
            
            const results = await this.gameTurnManager.checkAndProcessOverdueTurns();
            
            if (results.length > 0) {
                console.log(`Processed ${results.length} overdue turns:`, results);
            } else {
                console.log('No overdue turns found');
            }
        } catch (error) {
            console.error('Error in scheduled turn check:', error);
        }
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            checkIntervalMinutes: this.checkIntervalMinutes,
            lastCheck: this.lastCheckTime
        };
    }

    /**
     * Change the check interval
     */
    setInterval(minutes) {
        if (minutes < 1) {
            throw new Error('Check interval must be at least 1 minute');
        }

        this.checkIntervalMinutes = minutes;
        
        if (this.isRunning) {
            // Restart with new interval
            this.stop();
            this.start();
        }
    }
}

export default TurnScheduler;
