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

-- Create users table (admin users)
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nick VARCHAR(50) NOT NULL UNIQUE,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
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

-- Create unit_type table
CREATE TABLE unit_type (
    type VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create keywords table
CREATE TABLE keywords (
    keyword VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create terrain_types table
CREATE TABLE terrain_types (
    type VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    movement_cost INT NOT NULL DEFAULT 1,
    defence_bonus INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create map table
CREATE TABLE map (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    x_coord INT NOT NULL,
    y_coord INT NOT NULL,
    terrain_type VARCHAR(50) NOT NULL,
    realm_id BIGINT UNSIGNED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to terrain_types table
    CONSTRAINT fk_map_terrain FOREIGN KEY (terrain_type) 
        REFERENCES terrain_types(type)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    -- Foreign key to realm table (optional - for realm boundaries)
    CONSTRAINT fk_map_realm FOREIGN KEY (realm_id) 
        REFERENCES realm(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
        
    -- Ensure unique coordinates
    UNIQUE INDEX idx_coordinates (x_coord, y_coord),
    -- Indexes for better query performance
    INDEX idx_terrain_type (terrain_type),
    INDEX idx_realm_id (realm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create unit_classes table
CREATE TABLE unit_classes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    unit_type VARCHAR(50) NOT NULL,
    melee_combat INT NOT NULL DEFAULT 0,
    ranged_combat INT NOT NULL DEFAULT 0,
    defence INT NOT NULL DEFAULT 0,
    attack_range INT NOT NULL DEFAULT 0,
    hitpoints INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to unit_type table
    CONSTRAINT fk_unit_classes_type FOREIGN KEY (unit_type) 
        REFERENCES unit_type(type)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    -- Indexes for better query performance
    INDEX idx_unit_type (unit_type),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create unit_classes_keywords junction table for many-to-many relationship
CREATE TABLE unit_classes_keywords (
    unit_class_id BIGINT UNSIGNED NOT NULL,
    keyword VARCHAR(50) NOT NULL,
    
    -- Composite primary key
    PRIMARY KEY (unit_class_id, keyword),
    
    -- Foreign keys
    CONSTRAINT fk_uck_unit_class FOREIGN KEY (unit_class_id) 
        REFERENCES unit_classes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_uck_keyword FOREIGN KEY (keyword) 
        REFERENCES keywords(keyword)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create army table
CREATE TABLE army (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    realm_id BIGINT UNSIGNED NOT NULL,
    x_coord INT NOT NULL,
    y_coord INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to realm table
    CONSTRAINT fk_army_realm FOREIGN KEY (realm_id) 
        REFERENCES realm(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    -- Ensure army names are unique within a realm
    UNIQUE INDEX idx_army_name_realm (name, realm_id),
    -- Indexes for better query performance
    INDEX idx_realm_id (realm_id),
    INDEX idx_coordinates (x_coord, y_coord)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create unit table
CREATE TABLE unit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    realm_id BIGINT UNSIGNED NOT NULL,
    unit_class_id BIGINT UNSIGNED NOT NULL,
    army_id BIGINT UNSIGNED NOT NULL,
    current_hitpoints INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to realm table
    CONSTRAINT fk_unit_realm FOREIGN KEY (realm_id) 
        REFERENCES realm(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    -- Foreign key to unit_classes table
    CONSTRAINT fk_unit_class FOREIGN KEY (unit_class_id) 
        REFERENCES unit_classes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    -- Foreign key to army table
    CONSTRAINT fk_unit_army FOREIGN KEY (army_id) 
        REFERENCES army(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    -- Ensure unit names are unique within a realm
    UNIQUE INDEX idx_unit_name_realm (name, realm_id),
    -- Indexes for better query performance
    INDEX idx_realm_id (realm_id),
    INDEX idx_unit_class_id (unit_class_id),
    INDEX idx_army_id (army_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci; 