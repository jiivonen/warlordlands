import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import TurnScheduler from './game/systems/TurnScheduler.js';
import dotenv from 'dotenv';

dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.GAME_PORT || 3000; // Different port from admin server

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'warlordlands_user',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'warlordlands',
    charset: 'utf8mb4'
};

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Layout configuration
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Session configuration
app.use(session({
    name: 'game.sid',
    secret: process.env.GAME_SESSION_SECRET || 'game-secret-key-different-from-admin',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        sameSite: 'lax'
    }
}));

// Database connection pool
let pool;

async function initializeDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Game database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

// Initialize turn scheduler
let turnScheduler;
async function initializeTurnScheduler() {
    try {
        turnScheduler = new TurnScheduler(pool, 15); // Check every 15 minutes
        turnScheduler.start();
        console.log('Turn scheduler started successfully');
    } catch (error) {
        console.error('Failed to start turn scheduler:', error);
    }
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.playerId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.session.playerId) {
        res.redirect('/map');
    } else {
        res.redirect('/login');
    }
});

// Login routes
app.get('/login', (req, res) => {
    if (req.session.playerId) {
        res.redirect('/map');
    } else {
        res.render('login', { 
            error: null, 
            hideNav: true
        });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [rows] = await pool.execute(
            'SELECT id, nick, fullname, email, password_hash FROM player WHERE email = ?',
            [email]
        );
        
        if (rows.length === 0) {
            return res.render('login', { 
                error: 'Invalid credentials',
                hideNav: true
            });
        }
        
        const player = rows[0];
        const isValidPassword = await bcrypt.compare(password, player.password_hash);
        
        if (!isValidPassword) {
            return res.render('login', { 
                error: 'Invalid credentials',
                hideNav: true
            });
        }
        
        req.session.playerId = player.id;
        req.session.playerNick = player.nick;
        req.session.playerName = player.fullname;
        res.redirect('/map');
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            error: 'Login failed',
            hideNav: true
        });
    }
});

// Registration routes
app.get('/register', (req, res) => {
    if (req.session.playerId) {
        res.redirect('/map');
    } else {
        res.render('register', { 
            error: null, 
            hideNav: true
        });
    }
});

app.post('/register', async (req, res) => {
    const { nick, fullname, email, password, confirmPassword } = req.body;
    
    try {
        // Validation
        if (password !== confirmPassword) {
            return res.render('register', { 
                error: 'Passwords do not match',
                hideNav: true
            });
        }
        
        if (password.length < 6) {
            return res.render('register', { 
                error: 'Password must be at least 6 characters long',
                hideNav: true
            });
        }
        
        // Check if email already exists
        const [existingEmail] = await pool.execute(
            'SELECT id FROM player WHERE email = ?',
            [email]
        );
        
        if (existingEmail.length > 0) {
            return res.render('register', { 
                error: 'Email already registered',
                hideNav: true
            });
        }
        
        // Check if nick already exists
        const [existingNick] = await pool.execute(
            'SELECT id FROM player WHERE nick = ?',
            [nick]
        );
        
        if (existingNick.length > 0) {
            return res.render('register', { 
                error: 'Username already taken',
                hideNav: true
            });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create player
        const [result] = await pool.execute(
            'INSERT INTO player (nick, fullname, email, password_hash) VALUES (?, ?, ?, ?)',
            [nick, fullname, email, passwordHash]
        );
        
        // Auto-login
        req.session.playerId = result.insertId;
        req.session.playerNick = nick;
        req.session.playerName = fullname;
        
        res.redirect('/map');
        
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', { 
            error: 'Registration failed',
            hideNav: true
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Map page (main page)
app.get('/map', requireAuth, (req, res) => {
    res.render('home', {
        playerName: req.session.playerName,
        playerNick: req.session.playerNick,
        pageCSS: '/css/map.css'
    });
});

// Armies page
app.get('/armies', requireAuth, async (req, res) => {
    try {
        // Get player's armies
        const [armies] = await pool.execute(
            `SELECT a.id, a.name, a.x_coord, a.y_coord, r.name as realm_name 
             FROM army a 
             JOIN realm r ON a.realm_id = r.id 
             WHERE r.player_id = ? 
             ORDER BY a.created_at DESC`,
            [req.session.playerId]
        );
        
        res.render('armies', {
            playerName: req.session.playerName,
            playerNick: req.session.playerNick,
            armies: armies
        });
    } catch (error) {
        console.error('Armies page error:', error);
        res.status(500).send('Server error');
    }
});


// Map API endpoint
app.get('/api/map/data', requireAuth, async (req, res) => {
    try {
        const Map = (await import('./game/world/Map.js')).default;
        const mapInstance = new Map(pool);
        
        const strategicInfo = await mapInstance.getStrategicMapInfo(req.session.playerId);
        
        res.json(strategicInfo);
    } catch (error) {
        console.error('Map data error:', error);
        res.status(500).json({ error: 'Failed to load map data' });
    }
});

// Commands API endpoints
app.post('/api/commands/move', requireAuth, async (req, res) => {
    try {
        const { armyId, path } = req.body;
        
        // Validate the request
        if (!armyId || !path || !Array.isArray(path) || path.length === 0) {
            return res.status(400).json({ error: 'Invalid move command data' });
        }
        
        // Get current game turn
        const [currentTurn] = await pool.execute(
            'SELECT id FROM game_turns WHERE status = "active" LIMIT 1'
        );
        
        if (currentTurn.length === 0) {
            return res.status(400).json({ error: 'No active game turn' });
        }
        
        // Check if army already has a command for this turn
        const [existingCommand] = await pool.execute(
            'SELECT id FROM commands WHERE army_id = ? AND game_turn_id = ? AND status IN ("pending", "processing")',
            [armyId, currentTurn[0].id]
        );
        
        if (existingCommand.length > 0) {
            return res.status(400).json({ error: 'Army already has a command for this turn' });
        }
        
        // Create move command
        const commandData = JSON.stringify({ path });
        await pool.execute(
            'INSERT INTO commands (player_id, army_id, game_turn_id, command_type, command_data, status) VALUES (?, ?, ?, ?, ?, ?)',
            [req.session.playerId, armyId, currentTurn[0].id, 'move', commandData, 'pending']
        );
        
        res.json({ success: true, message: 'Move command created successfully' });
    } catch (error) {
        console.error('Move command error:', error);
        res.status(500).json({ error: 'Failed to create move command' });
    }
});

app.get('/api/commands/army/:armyId', requireAuth, async (req, res) => {
    try {
        const { armyId } = req.params;
        
        // Get current game turn
        const [currentTurn] = await pool.execute(
            'SELECT id FROM game_turns WHERE status = "active" LIMIT 1'
        );
        
        if (currentTurn.length === 0) {
            return res.json({ hasCommand: false });
        }
        
        // Check if army has a command for this turn
        const [command] = await pool.execute(
            'SELECT id, status FROM commands WHERE army_id = ? AND game_turn_id = ? AND status IN ("pending", "processing")',
            [armyId, currentTurn[0].id]
        );
        
        res.json({ 
            hasCommand: command.length > 0,
            commandStatus: command.length > 0 ? command[0].status : null
        });
    } catch (error) {
        console.error('Command check error:', error);
        res.status(500).json({ error: 'Failed to check command status' });
    }
});



// Start server
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, async () => {
        console.log(`Game server running on http://localhost:${PORT}`);
        
        // Initialize turn scheduler after server starts
        await initializeTurnScheduler();
    });
}

startServer().catch(console.error);
