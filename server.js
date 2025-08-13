const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Database connection pool
let pool;

async function initializeDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// Login routes
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { nick, password } = req.body;
    
    try {
        const [rows] = await pool.execute(
            'SELECT id, nick, password_hash FROM users WHERE nick = ?',
            [nick]
        );
        
        if (rows.length === 0) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        
        const user = rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        
        req.session.userId = user.id;
        req.session.userNick = user.nick;
        res.redirect('/admin');
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'Login failed' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Admin dashboard
app.get('/admin', requireAuth, async (req, res) => {
    try {
        const tables = [
            { name: 'users', displayName: 'Admin Users' },
            { name: 'player', displayName: 'Players' },
            { name: 'realm', displayName: 'Realms' },
            { name: 'unit_type', displayName: 'Unit Types' },
            { name: 'keywords', displayName: 'Keywords' },
            { name: 'unit_classes', displayName: 'Unit Classes' },
            { name: 'terrain_types', displayName: 'Terrain Types' },
            { name: 'map', displayName: 'Map Tiles' }
        ];
        
        res.render('admin', { 
            tables,
            userNick: req.session.userNick 
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).send('Server error');
    }
});

// Generic table listing route
app.get('/admin/:table', requireAuth, async (req, res) => {
    const tableName = req.params.table;
    
    try {
        const [rows] = await pool.execute(`SELECT * FROM ${tableName}`);
        const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
        
        res.render('table', {
            tableName,
            displayName: getDisplayName(tableName),
            data: rows,
            columns: columns.map(col => col.Field),
            userNick: req.session.userNick
        });
    } catch (error) {
        console.error(`Error loading table ${tableName}:`, error);
        res.status(500).send('Error loading table');
    }
});

// Generic table editing route
app.get('/admin/:table/edit/:id', requireAuth, async (req, res) => {
    const { table, id } = req.params;
    
    try {
        const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        const [columns] = await pool.execute(`DESCRIBE ${table}`);
        
        if (rows.length === 0) {
            return res.status(404).send('Record not found');
        }
        
        res.render('edit', {
            tableName: table,
            displayName: getDisplayName(table),
            record: rows[0],
            columns: columns.map(col => col.Field),
            userNick: req.session.userNick
        });
    } catch (error) {
        console.error(`Error loading record for editing:`, error);
        res.status(500).send('Error loading record');
    }
});

// Update record route
app.post('/admin/:table/edit/:id', requireAuth, async (req, res) => {
    const { table, id } = req.params;
    const updateData = req.body;
    
    try {
        const fields = Object.keys(updateData).filter(key => key !== 'id');
        const values = fields.map(field => updateData[field]);
        values.push(id);
        
        const query = `UPDATE ${table} SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        await pool.execute(query, values);
        
        res.redirect(`/admin/${table}`);
    } catch (error) {
        console.error(`Error updating record:`, error);
        res.status(500).send('Error updating record');
    }
});

// Add new record route
app.get('/admin/:table/add', requireAuth, async (req, res) => {
    const tableName = req.params.table;
    
    try {
        const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
        
        res.render('add', {
            tableName,
            displayName: getDisplayName(tableName),
            columns: columns.map(col => col.Field),
            userNick: req.session.userNick
        });
    } catch (error) {
        console.error(`Error loading add form:`, error);
        res.status(500).send('Error loading form');
    }
});

app.post('/admin/:table/add', requireAuth, async (req, res) => {
    const tableName = req.params.table;
    const insertData = req.body;
    
    try {
        const fields = Object.keys(insertData);
        const values = fields.map(field => insertData[field]);
        
        const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
        await pool.execute(query, values);
        
        res.redirect(`/admin/${tableName}`);
    } catch (error) {
        console.error(`Error adding record:`, error);
        res.status(500).send('Error adding record');
    }
});

// Delete record route
app.post('/admin/:table/delete/:id', requireAuth, async (req, res) => {
    const { table, id } = req.params;
    
    try {
        await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.redirect(`/admin/${table}`);
    } catch (error) {
        console.error(`Error deleting record:`, error);
        res.status(500).send('Error deleting record');
    }
});

// Helper function to get display names
function getDisplayName(tableName) {
    const displayNames = {
        'users': 'Admin Users',
        'player': 'Players',
        'realm': 'Realms',
        'unit_type': 'Unit Types',
        'keywords': 'Keywords',
        'unit_classes': 'Unit Classes',
        'terrain_types': 'Terrain Types',
        'map': 'Map Tiles'
    };
    return displayNames[tableName] || tableName;
}

// Start server
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Admin server running on http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
