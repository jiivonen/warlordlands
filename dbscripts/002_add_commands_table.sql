-- Add commands table to warlordlands database
USE warlordlands;

-- Create commands table
CREATE TABLE commands (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    army_id BIGINT UNSIGNED NOT NULL,
    game_turn_id BIGINT UNSIGNED NOT NULL,
    command_type VARCHAR(50) NOT NULL, -- 'move', 'attack', 'create_unit', etc.
    command_data JSON NOT NULL, -- JSON data for command parameters
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    result JSON NULL, -- JSON data for command results
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_command_player FOREIGN KEY (player_id) 
        REFERENCES player(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_command_army FOREIGN KEY (army_id) 
        REFERENCES army(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_command_game_turn FOREIGN KEY (game_turn_id) 
        REFERENCES game_turns(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Indexes for better query performance
    INDEX idx_player_id (player_id),
    INDEX idx_army_id (army_id),
    INDEX idx_game_turn_id (game_turn_id),
    INDEX idx_command_type (command_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    -- Composite index for common queries
    INDEX idx_player_turn (player_id, game_turn_id),
    INDEX idx_army_turn (army_id, game_turn_id),
    INDEX idx_turn_status (game_turn_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Add some sample commands for testing (optional)
-- INSERT INTO commands (player_id, army_id, game_turn_id, command_type, command_data) VALUES
-- (1, 1, 1, 'move', '{"target_x": 10, "target_y": 15}'),
-- (1, 1, 1, 'attack', '{"target_army_id": 2}'),
-- (2, 2, 1, 'create_unit', '{"unit_class_id": 1, "name": "New Warrior"}');
