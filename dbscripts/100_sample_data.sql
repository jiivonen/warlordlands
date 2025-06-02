-- Sample data for testing
USE warlordlands;

-- Insert sample player
INSERT INTO player (nick, fullname, email) 
VALUES ('player 1', 'Player One', 'player@example.com.invalid');

-- Store the player's ID for multiple realm insertions
SET @player_id = LAST_INSERT_ID();

-- Insert sample realms for the player
INSERT INTO realm (name, player_id) VALUES 
('First Realm', @player_id);
-- You can add more sample data here as needed 