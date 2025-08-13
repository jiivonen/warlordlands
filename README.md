# Warlordlands Admin Web Service

A Node.js/Express web service for managing the Warlordlands game database.

## Features

- **Admin Authentication**: Secure login system for admin users
- **Database Management**: Full CRUD operations for all database tables
- **User-Friendly Interface**: Clean, responsive web interface
- **Session Management**: Secure session handling
- **Real-time Updates**: Immediate database changes

## Prerequisites

- Node.js (v14 or higher)
- MariaDB/MySQL database
- Warlordlands database setup (run the SQL scripts first)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```
   # Database Configuration
   DB_HOST=localhost
   DB_USER=warlordlands_user
   DB_PASSWORD=your_password
   DB_NAME=warlordlands
   
   # Server Configuration
   PORT=3000
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   
   # Security (set to true in production with HTTPS)
   NODE_ENV=development
   ```

3. **Set up the database**:
   ```bash
   # Run the database creation script
   mysql -u root -p < dbscripts/001_create_database.sql
   
   # Run the sample data script
   mysql -u root -p < dbscripts/100_sample_data.sql
   ```

4. **Create admin user password hash**:
   ```bash
   # Generate a password hash (replace 'your_password' with actual password)
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your_password', 10).then(hash => console.log(hash));"
   ```
   
   Update the sample data script with the generated hash:
   ```sql
   UPDATE users SET password_hash = 'generated_hash_here' WHERE nick = 'admin';
   ```

## Usage

1. **Start the server**:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

2. **Access the admin panel**:
   Open your browser and go to `http://localhost:3000`

3. **Login**:
   - Username: `admin`
   - Password: `your_password` (or whatever you set)

## Available Tables

The admin panel provides management for:

- **Admin Users**: System administrators
- **Players**: Game participants
- **Realms**: Player-owned territories
- **Unit Types**: Categories of units (infantry, cavalry, etc.)
- **Keywords**: Unit abilities and traits
- **Unit Classes**: Specific unit types with stats
- **Terrain Types**: Map terrain categories
- **Map Tiles**: Individual map positions

## Security Notes

- Change the default password in production
- Use HTTPS in production environments
- Update the session secret
- Consider implementing rate limiting
- Add input validation for production use

## Development

- **Auto-restart**: Use `npm run dev` for development
- **Logs**: Check console output for errors
- **Database**: Ensure MariaDB is running and accessible

## Troubleshooting

1. **Database connection failed**:
   - Check database credentials in `.env`
   - Ensure MariaDB is running
   - Verify database exists

2. **Login issues**:
   - Check password hash in database
   - Verify admin user exists

3. **Port already in use**:
   - Change PORT in `.env` file
   - Kill existing process on port 3000

## File Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration
├── views/                 # EJS templates
│   ├── layout.ejs        # Base layout
│   ├── login.ejs         # Login page
│   ├── admin.ejs         # Dashboard
│   ├── table.ejs         # Table listing
│   ├── edit.ejs          # Edit form
│   └── add.ejs           # Add form
└── dbscripts/            # Database scripts
    ├── 001_create_database.sql
    └── 100_sample_data.sql
```
