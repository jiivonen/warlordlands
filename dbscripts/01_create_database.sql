-- Database creation script for Warlordlands
-- To be executed on MariaDB

-- Drop database if exists (be careful with this in production!)
DROP DATABASE IF EXISTS warlordlands;

-- Create database with proper character encoding
CREATE DATABASE warlordlands
    CHARACTER SET = 'utf8mb4'
    COLLATE = 'utf8mb4_uca1400_ai_ci';

-- Create a dedicated user for the application
-- Note: Replace 'your_password' with a secure password in production
CREATE USER IF NOT EXISTS 'warlordlands_user'@'localhost' 
    IDENTIFIED BY 'your_password';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON warlordlands.* TO 'warlordlands_user'@'localhost';
FLUSH PRIVILEGES;

-- Switch to the newly created database
USE warlordlands;

-- Create player table
CREATE TABLE player (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nick VARCHAR(50) NOT NULL UNIQUE,
    fullname VARCHAR(100),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better query performance
    INDEX idx_nick (nick),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create realm table
CREATE TABLE realm (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    player_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to player table
    CONSTRAINT fk_realm_player FOREIGN KEY (player_id) 
        REFERENCES player(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    -- Ensure realm names are unique
    UNIQUE INDEX idx_realm_name (name),
    -- Index for foreign key lookups
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Add your table creation statements below this line
-- Example table structure will be added in subsequent scripts 