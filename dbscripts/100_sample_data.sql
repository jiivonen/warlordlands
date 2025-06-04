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

-- Insert sample unit types
INSERT INTO unit_type (type, description) VALUES
('infantry', 'Basic ground troops that form the backbone of any army'),
('hero', 'Powerful individual units that can turn the tide of battle'),
('cavalry', 'Fast-moving mounted units excellent for flanking maneuvers'),
('chariot', 'Heavy cavalry units with superior mobility and impact power'),
('warmachine', 'Mechanical units designed for siege and long-range warfare'),
('monster', 'Large creatures that can dominate the battlefield');

-- Insert sample keywords
INSERT INTO keywords (keyword, description) VALUES
('flying', 'Unit can move over any terrain and ignore ground-based obstacles'),
('chaos', 'Unit is chaotic and can attack any target');

-- You can add more sample data here as needed 