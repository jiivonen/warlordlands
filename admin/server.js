import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import dotenv from 'dotenv';

dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.ADMIN_PORT || 3030;

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
    name: 'admin.sid',
    secret: process.env.ADMIN_SESSION_SECRET || 'admin-secret-key-different-from-game',
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
    res.render('login', { 
        error: null, 
        hideNav: true,
        userNick: req.session.userNick 
    });
});

app.post('/login', async (req, res) => {
    const { nick, password } = req.body;
    
    try {
        const [rows] = await pool.execute(
            'SELECT id, nick, password_hash FROM users WHERE nick = ?',
            [nick]
        );
        
        if (rows.length === 0) {
            return res.render('login', { 
                error: 'Invalid credentials',
                hideNav: true,
                userNick: req.session.userNick
            });
        }
        
        const user = rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.render('login', { 
                error: 'Invalid credentials',
                hideNav: true,
                userNick: req.session.userNick
            });
        }
        
        req.session.userId = user.id;
        req.session.userNick = user.nick;
        res.redirect('/admin');
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            error: 'Login failed',
            hideNav: true,
            userNick: req.session.userNick
        });
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
            { name: 'map', displayName: 'Map Tiles' },
            { name: 'army', displayName: 'Armies' },
            { name: 'unit', displayName: 'Units' },
            { name: 'game_turns', displayName: 'Game Turns' },
            { name: 'commands', displayName: 'Commands' }
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

// Dedicated Game Turns admin page
app.get('/admin/game_turns', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM game_turns 
            ORDER BY turn_number DESC
        `);
        
        // Get any success message from session
        const turnMessage = req.session.turnMessage;
        if (req.session.turnMessage) {
            delete req.session.turnMessage; // Clear after reading
        }
        
        res.render('game_turns', {
            turns: rows,
            userNick: req.session.userNick,
            title: 'Game Turns Management',
            turnMessage: turnMessage
        });
    } catch (error) {
        console.error('Error loading game turns:', error);
        res.status(500).send('Error loading game turns');
    }
});

// Game Turns specific routes (must come before generic routes)
app.get('/admin/game_turns/edit/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rows] = await pool.execute('SELECT * FROM game_turns WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).send('Turn not found');
        }
        
        res.render('game_turns_edit', {
            turn: rows[0],
            userNick: req.session.userNick,
            title: 'Edit Game Turn'
        });
    } catch (error) {
        console.error('Error loading turn for editing:', error);
        res.status(500).send('Error loading turn');
    }
});

app.post('/admin/game_turns/edit/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { end_time, command_deadline } = req.body;
    
    try {
        // Server-side validation
        const now = new Date();
        const endTime = new Date(end_time);
        const commandDeadline = new Date(command_deadline);
        
        console.log('Server validation:', {
            now: now.toISOString(),
            endTime: endTime.toISOString(),
            commandDeadline: commandDeadline.toISOString()
        });
        
        let validationError = null;
        
        // Check if end time is in the future
        if (endTime <= now) {
            validationError = 'End time must be in the future!';
        }
        
        // Check if command deadline is in the future
        if (!validationError && commandDeadline <= now) {
            validationError = 'Command deadline must be in the future!';
        }
        
        // Check if command deadline is before end time
        if (!validationError && commandDeadline >= endTime) {
            validationError = 'Command deadline must be before end time!';
        }
        
        // If validation failed, re-render the form with error
        if (validationError) {
            const [rows] = await pool.execute('SELECT * FROM game_turns WHERE id = ?', [id]);
            
            if (rows.length === 0) {
                return res.status(404).send('Turn not found');
            }
            
            return res.render('game_turns_edit', {
                turn: rows[0],
                userNick: req.session.userNick,
                title: 'Edit Game Turn',
                validationError: validationError,
                formData: { end_time, command_deadline }
            });
        }
        
        await pool.execute(
            'UPDATE game_turns SET end_time = ?, command_deadline = ? WHERE id = ?',
            [end_time, command_deadline, id]
        );
        
        res.redirect('/admin/game_turns');
    } catch (error) {
        console.error('Error updating turn:', error);
        res.status(500).send('Error updating turn');
    }
});

app.get('/admin/game_turns/add', requireAuth, async (req, res) => {
    try {
        // Get the next turn number
        const [maxTurnResult] = await pool.execute('SELECT MAX(turn_number) as maxTurn FROM game_turns');
        const nextTurnNumber = (maxTurnResult[0].maxTurn || 0) + 1;
        
        // Calculate default times
        const now = new Date();
        const defaultEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        const defaultCommandDeadline = new Date(now.getTime() + 20 * 60 * 60 * 1000); // 20 hours from now
        
        // Format for datetime-local input
        const formatDateTime = (date) => {
            return date.toLocaleString('sv-SE').slice(0, 16);
        };
        
        res.render('game_turns_add', {
            userNick: req.session.userNick,
            title: 'Add New Game Turn',
            nextTurnNumber: nextTurnNumber,
            defaultEndTime: formatDateTime(defaultEndTime),
            defaultCommandDeadline: formatDateTime(defaultCommandDeadline)
        });
    } catch (error) {
        console.error('Error loading add form:', error);
        res.status(500).send('Error loading form');
    }
});

app.post('/admin/game_turns/add', requireAuth, async (req, res) => {
    const { end_time, command_deadline } = req.body;
    
    try {
        // Server-side validation
        const now = new Date();
        const endTime = new Date(end_time);
        const commandDeadline = new Date(command_deadline);
        
        console.log('Server validation:', {
            now: now.toISOString(),
            endTime: endTime.toISOString(),
            commandDeadline: commandDeadline.toISOString()
        });
        
        let validationError = null;
        
        // Check if end time is in the future
        if (endTime <= now) {
            validationError = 'End time must be in the future!';
        }
        
        // Check if command deadline is in the future
        if (!validationError && commandDeadline <= now) {
            validationError = 'Command deadline must be in the future!';
        }
        
        // Check if command deadline is before end time
        if (!validationError && commandDeadline >= endTime) {
            validationError = 'Command deadline must be before end time!';
        }
        
        // If validation failed, re-render the form with error
        if (validationError) {
            // Get the next turn number
            const [maxTurnResult] = await pool.execute('SELECT MAX(turn_number) as maxTurn FROM game_turns');
            const nextTurnNumber = (maxTurnResult[0].maxTurn || 0) + 1;
            
            // Calculate default times
            const defaultEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const defaultCommandDeadline = new Date(now.getTime() + 20 * 60 * 60 * 1000);
            
            const formatDateTime = (date) => {
                return date.toLocaleString('sv-SE').slice(0, 16);
            };
            
            return res.render('game_turns_add', {
                userNick: req.session.userNick,
                title: 'Add New Game Turn',
                nextTurnNumber: nextTurnNumber,
                defaultEndTime: formatDateTime(defaultEndTime),
                defaultCommandDeadline: formatDateTime(defaultCommandDeadline),
                validationError: validationError,
                formData: { end_time, command_deadline }
            });
        }
        
        // Get the next turn number
        const [maxTurnResult] = await pool.execute('SELECT MAX(turn_number) as maxTurn FROM game_turns');
        const nextTurnNumber = (maxTurnResult[0].maxTurn || 0) + 1;
        
        // Start transaction to handle both operations
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Get the current active turn before we end it
            const [currentTurnResult] = await connection.execute(
                'SELECT * FROM game_turns WHERE status = ? ORDER BY turn_number DESC LIMIT 1',
                ['active']
            );
            
            let commandResults = null;
            
            // If there's an active turn, process its commands first
            if (currentTurnResult.length > 0) {
                const currentTurn = currentTurnResult[0];
                console.log(`Processing commands for turn ${currentTurn.turn_number} before creating new turn...`);
                
                // Process pending commands for the current turn
                const GameTurnManager = (await import('../game/systems/GameTurnManager.js')).default;
                const gameTurnManager = new GameTurnManager(connection);
                commandResults = await gameTurnManager.processPendingCommands(currentTurn.id);
                
                console.log(`Command processing results:`, commandResults);
            }
            
            // End the current active turn if it exists
            // Set both end_time and command_deadline to now to satisfy constraints
            await connection.execute(
                'UPDATE game_turns SET status = ?, end_time = ?, command_deadline = ? WHERE status = ?',
                ['completed', now, now, 'active']
            );
            
            // Insert the new turn - start time should be slightly after now to avoid constraint violation
            const newStartTime = new Date(now.getTime() + 1000); // 1 second after now
            await connection.execute(
                'INSERT INTO game_turns (turn_number, start_time, end_time, command_deadline, status) VALUES (?, ?, ?, ?, ?)',
                [nextTurnNumber, newStartTime, end_time, command_deadline, 'active']
            );
            
            await connection.commit();
            
            // Show success message with command processing results
            if (commandResults) {
                req.session.turnMessage = `New turn ${nextTurnNumber} created successfully! Processed ${commandResults.processed} commands (${commandResults.succeeded} succeeded, ${commandResults.failed} failed).`;
            } else {
                req.session.turnMessage = `New turn ${nextTurnNumber} created successfully!`;
            }
            
            res.redirect('/admin/game_turns');
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error adding turn:', error);
        res.status(500).send('Error adding turn');
    }
});

app.post('/admin/game_turns/delete/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.execute('DELETE FROM game_turns WHERE id = ?', [id]);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting turn:', error);
        res.status(500).json({ success: false, error: 'Error deleting turn' });
    }
});

// Commands management routes
app.get('/admin/commands', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT c.*, 
                   p.nick as player_nick,
                   a.name as army_name,
                   gt.turn_number,
                   CONCAT(gt.turn_number, ' (', DATE_FORMAT(gt.start_time, '%Y-%m-%d %H:%i'), ')') as turn_display
            FROM commands c
            LEFT JOIN player p ON c.player_id = p.id
            LEFT JOIN army a ON c.army_id = a.id
            LEFT JOIN game_turns gt ON c.game_turn_id = gt.id
            ORDER BY c.created_at DESC
        `);
        
        res.render('commands', {
            commands: rows,
            userNick: req.session.userNick,
            title: 'Commands Management'
        });
    } catch (error) {
        console.error('Error loading commands:', error);
        res.status(500).send('Error loading commands');
    }
});

// Update command status route
app.post('/admin/commands/update/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status, result } = req.body;
    
    try {
        const updateData = { status };
        if (result !== undefined) {
            updateData.result = result;
        }
        
        await pool.execute(
            'UPDATE commands SET status = ?, result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, result || null, id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating command:', error);
        res.status(500).json({ success: false, error: 'Error updating command' });
    }
});

// Generic table listing route
app.get('/admin/:table', requireAuth, async (req, res) => {
    const tableName = req.params.table;
    const primaryKey = getPrimaryKey(tableName);
    
    try {
        const [rows] = await pool.execute(`SELECT * FROM ${tableName}`);
        const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
        
        res.render('table', {
            tableName,
            displayName: getDisplayName(tableName),
            data: rows,
            columns: columns.map(col => col.Field),
            primaryKey: primaryKey,
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
    const primaryKey = getPrimaryKey(table);
    
    try {
        const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`, [id]);
        const [columns] = await pool.execute(`DESCRIBE ${table}`);
        
        if (rows.length === 0) {
            return res.status(404).send('Record not found');
        }
        
        res.render('edit', {
            tableName: table,
            displayName: getDisplayName(table),
            record: rows[0],
            columns: columns.map(col => col.Field),
            primaryKey: primaryKey,
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
    const primaryKey = getPrimaryKey(table);
    const updateData = req.body;
    
    try {
        const fields = Object.keys(updateData).filter(key => key !== primaryKey);
        const values = fields.map(field => updateData[field]);
        values.push(id);
        
        const query = `UPDATE ${table} SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE ${primaryKey} = ?`;
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
    const primaryKey = getPrimaryKey(tableName);
    
    try {
        const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
        
        res.render('add', {
            tableName,
            displayName: getDisplayName(tableName),
            columns: columns.map(col => col.Field),
            primaryKey: primaryKey,
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
    const primaryKey = getPrimaryKey(table);
    
    try {
        await pool.execute(`DELETE FROM ${table} WHERE ${primaryKey} = ?`, [id]);
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
        'map': 'Map Tiles',
        'army': 'Armies',
        'unit': 'Units',
        'game_turns': 'Game Turns',
        'commands': 'Commands'
    };
    return displayNames[tableName] || tableName;
}

// Helper function to get primary key for each table
function getPrimaryKey(tableName) {
    const primaryKeys = {
        'unit_type': 'type',
        'terrain_types': 'type',
        'keywords': 'keyword'
    };
    return primaryKeys[tableName] || 'id';
}

// Start server
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Admin server running on http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
