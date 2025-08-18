const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

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
        res.redirect('/home');
    } else {
        res.redirect('/login');
    }
});

// Login routes
app.get('/login', (req, res) => {
    if (req.session.playerId) {
        res.redirect('/home');
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
        res.redirect('/home');
        
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
        res.redirect('/home');
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
        
        res.redirect('/home');
        
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

// Home screen
app.get('/home', requireAuth, async (req, res) => {
    try {
        // Get player's realms
        const [realms] = await pool.execute(
            'SELECT id, name, created_at FROM realm WHERE player_id = ? ORDER BY created_at DESC',
            [req.session.playerId]
        );
        
        // Get player's armies
        const [armies] = await pool.execute(
            `SELECT a.id, a.name, a.x_coord, a.y_coord, r.name as realm_name 
             FROM army a 
             JOIN realm r ON a.realm_id = r.id 
             WHERE r.player_id = ? 
             ORDER BY a.created_at DESC`,
            [req.session.playerId]
        );
        
        // Get player's units
        const [units] = await pool.execute(
            `SELECT u.id, u.name, u.current_hitpoints, uc.name as unit_class_name, 
                    a.name as army_name, r.name as realm_name
             FROM unit u 
             JOIN unit_classes uc ON u.unit_class_id = uc.id
             JOIN army a ON u.army_id = a.id
             JOIN realm r ON u.realm_id = r.id
             WHERE r.player_id = ? 
             ORDER BY u.created_at DESC`,
            [req.session.playerId]
        );
        
        res.render('home', {
            playerName: req.session.playerName,
            playerNick: req.session.playerNick,
            realms: realms,
            armies: armies,
            units: units
        });
    } catch (error) {
        console.error('Home screen error:', error);
        res.status(500).send('Server error');
    }
});

// Realm management
app.get('/realms', requireAuth, async (req, res) => {
    try {
        const [realms] = await pool.execute(
            'SELECT id, name, created_at FROM realm WHERE player_id = ? ORDER BY created_at DESC',
            [req.session.playerId]
        );
        
        res.render('realms', {
            playerName: req.session.playerName,
            playerNick: req.session.playerNick,
            realms: realms
        });
    } catch (error) {
        console.error('Realms error:', error);
        res.status(500).send('Server error');
    }
});

app.get('/realms/new', requireAuth, (req, res) => {
    res.render('new-realm', {
        playerName: req.session.playerName,
        playerNick: req.session.playerNick
    });
});

app.post('/realms/new', requireAuth, async (req, res) => {
    const { name } = req.body;
    
    try {
        // Check if realm name already exists
        const [existing] = await pool.execute(
            'SELECT id FROM realm WHERE name = ?',
            [name]
        );
        
        if (existing.length > 0) {
            return res.render('new-realm', {
                playerName: req.session.playerName,
                playerNick: req.session.playerNick,
                error: 'Realm name already exists'
            });
        }
        
        // Create new realm
        await pool.execute(
            'INSERT INTO realm (name, player_id) VALUES (?, ?)',
            [name, req.session.playerId]
        );
        
        res.redirect('/realms');
    } catch (error) {
        console.error('Create realm error:', error);
        res.render('new-realm', {
            playerName: req.session.playerName,
            playerNick: req.session.playerNick,
            error: 'Failed to create realm'
        });
    }
});

// Start server
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Game server running on http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
