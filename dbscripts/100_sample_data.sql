-- Sample data for testing
USE warlordlands;

-- Insert sample admin user
-- Note: In production, use proper password hashing (e.g., bcrypt)
-- Password: admin123 (bcrypt hash with salt rounds 10)
INSERT INTO users (nick, fullname, email, password_hash) 
VALUES ('admin', 'System Administrator', 'admin@warlordlands.com.example', '$2b$10$2CshI/rXAmnNAjIs/PoRGuQG6TNiogqP5Lin4wTioI4IXt5eCqpaS');

-- Insert sample players
-- Note: In production, use proper password hashing (e.g., bcrypt)
-- Password: player123 (bcrypt hash with salt rounds 10)
INSERT INTO player (nick, fullname, email, password_hash) VALUES 
('player1', 'Player One', 'player1@example.com.invalid', '$2b$10$IhxK9b.1XbtI0ABFlTMOAOpFR/e2U.LlfmwicJBYHK.8tnbaVUqh2');

-- Store the first player's ID
SET @player1_id = LAST_INSERT_ID();

-- Insert second player
-- Password: player456 (bcrypt hash with salt rounds 10)
INSERT INTO player (nick, fullname, email, password_hash) VALUES 
('player2', 'Player Two', 'player2@example.com.invalid', '$2b$10$IhxK9b.1XbtI0ABFlTMOAOpFR/e2U.LlfmwicJBYHK.8tnbaVUqh2');

-- Store the second player's ID
SET @player2_id = LAST_INSERT_ID();

-- Insert sample realms - one per player
INSERT INTO realm (name, player_id) VALUES 
('First Realm', @player1_id),
('Second Realm', @player2_id);

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

-- Insert sample terrain types
INSERT INTO terrain_types (type, description, movement_cost, defence_bonus) VALUES
('open', 'Clear terrain with no obstacles, easy to traverse', 1, 0),
('forest', 'Dense woodland that provides cover and slows movement', 2, 2),
('water', 'Rivers, lakes, and other water features that block most units', 3, 0),
('mountains', 'High elevation terrain that is difficult to traverse', 3, 3);

-- Create a large 30x20 sample map
-- Store realm IDs for map assignment
SET @first_realm_id = (SELECT id FROM realm WHERE name = 'First Realm' LIMIT 1);
SET @second_realm_id = (SELECT id FROM realm WHERE name = 'Second Realm' LIMIT 1);

-- Insert map tiles (30x20 grid from -15 to 14 x, -10 to 9 y)
INSERT INTO map (x_coord, y_coord, terrain_type, realm_id) VALUES
-- Row -10 (y = -10) - Northern mountains
(-15, -10, 'mountains', @first_realm_id), (-14, -10, 'mountains', @first_realm_id), (-13, -10, 'mountains', @first_realm_id), (-12, -10, 'mountains', @first_realm_id), (-11, -10, 'mountains', @first_realm_id), (-10, -10, 'mountains', @first_realm_id), (-9, -10, 'mountains', @first_realm_id), (-8, -10, 'mountains', @first_realm_id), (-7, -10, 'mountains', @first_realm_id), (-6, -10, 'mountains', @first_realm_id), (-5, -10, 'mountains', @first_realm_id), (-4, -10, 'mountains', @first_realm_id), (-3, -10, 'mountains', @first_realm_id), (-2, -10, 'mountains', @first_realm_id), (-1, -10, 'mountains', @first_realm_id), (0, -10, 'mountains', @first_realm_id), (1, -10, 'mountains', @first_realm_id), (2, -10, 'mountains', @first_realm_id), (3, -10, 'mountains', @first_realm_id), (4, -10, 'mountains', @first_realm_id), (5, -10, 'mountains', @first_realm_id), (6, -10, 'mountains', @first_realm_id), (7, -10, 'mountains', @first_realm_id), (8, -10, 'mountains', @first_realm_id), (9, -10, 'mountains', @first_realm_id), (10, -10, 'mountains', @first_realm_id), (11, -10, 'mountains', @first_realm_id), (12, -10, 'mountains', @first_realm_id), (13, -10, 'mountains', @first_realm_id), (14, -10, 'mountains', @first_realm_id),

-- Row -9 (y = -9) - Northern mountains and forests
(-15, -9, 'mountains', @first_realm_id), (-14, -9, 'mountains', @first_realm_id), (-13, -9, 'forest', @first_realm_id), (-12, -9, 'forest', @first_realm_id), (-11, -9, 'forest', @first_realm_id), (-10, -9, 'forest', @first_realm_id), (-9, -9, 'forest', @first_realm_id), (-8, -9, 'forest', @first_realm_id), (-7, -9, 'forest', @first_realm_id), (-6, -9, 'forest', @first_realm_id), (-5, -9, 'forest', @first_realm_id), (-4, -9, 'forest', @first_realm_id), (-3, -9, 'forest', @first_realm_id), (-2, -9, 'forest', @first_realm_id), (-1, -9, 'forest', @first_realm_id), (0, -9, 'forest', @first_realm_id), (1, -9, 'forest', @first_realm_id), (2, -9, 'forest', @first_realm_id), (3, -9, 'forest', @first_realm_id), (4, -9, 'forest', @first_realm_id), (5, -9, 'forest', @first_realm_id), (6, -9, 'forest', @first_realm_id), (7, -9, 'forest', @first_realm_id), (8, -9, 'forest', @first_realm_id), (9, -9, 'forest', @first_realm_id), (10, -9, 'forest', @first_realm_id), (11, -9, 'forest', @first_realm_id), (12, -9, 'forest', @first_realm_id), (13, -9, 'mountains', @first_realm_id), (14, -9, 'mountains', @first_realm_id),

-- Row -8 (y = -8) - Forests and open terrain
(-15, -8, 'forest', @first_realm_id), (-14, -8, 'forest', @first_realm_id), (-13, -8, 'forest', @first_realm_id), (-12, -8, 'open', @first_realm_id), (-11, -8, 'open', @first_realm_id), (-10, -8, 'open', @first_realm_id), (-9, -8, 'open', @first_realm_id), (-8, -8, 'open', @first_realm_id), (-7, -8, 'open', @first_realm_id), (-6, -8, 'open', @first_realm_id), (-5, -8, 'open', @first_realm_id), (-4, -8, 'open', @first_realm_id), (-3, -8, 'open', @first_realm_id), (-2, -8, 'open', @first_realm_id), (-1, -8, 'open', @first_realm_id), (0, -8, 'open', @first_realm_id), (1, -8, 'open', @first_realm_id), (2, -8, 'open', @first_realm_id), (3, -8, 'open', @first_realm_id), (4, -8, 'open', @first_realm_id), (5, -8, 'open', @first_realm_id), (6, -8, 'open', @first_realm_id), (7, -8, 'open', @first_realm_id), (8, -8, 'open', @first_realm_id), (9, -8, 'open', @first_realm_id), (10, -8, 'open', @first_realm_id), (11, -8, 'open', @first_realm_id), (12, -8, 'forest', @first_realm_id), (13, -8, 'forest', @first_realm_id), (14, -8, 'forest', @first_realm_id),

-- Row -7 (y = -7) - Open terrain with some forests
(-15, -7, 'forest', @first_realm_id), (-14, -7, 'open', @first_realm_id), (-13, -7, 'open', @first_realm_id), (-12, -7, 'open', @first_realm_id), (-11, -7, 'open', @first_realm_id), (-10, -7, 'open', @first_realm_id), (-9, -7, 'open', @first_realm_id), (-8, -7, 'open', @first_realm_id), (-7, -7, 'open', @first_realm_id), (-6, -7, 'open', @first_realm_id), (-5, -7, 'open', @first_realm_id), (-4, -7, 'open', @first_realm_id), (-3, -7, 'open', @first_realm_id), (-2, -7, 'open', @first_realm_id), (-1, -7, 'open', @first_realm_id), (0, -7, 'open', @first_realm_id), (1, -7, 'open', @first_realm_id), (2, -7, 'open', @first_realm_id), (3, -7, 'open', @first_realm_id), (4, -7, 'open', @first_realm_id), (5, -7, 'open', @first_realm_id), (6, -7, 'open', @first_realm_id), (7, -7, 'open', @first_realm_id), (8, -7, 'open', @first_realm_id), (9, -7, 'open', @first_realm_id), (10, -7, 'open', @first_realm_id), (11, -7, 'open', @first_realm_id), (12, -7, 'open', @first_realm_id), (13, -7, 'open', @first_realm_id), (14, -7, 'forest', @first_realm_id),

-- Row -6 (y = -6) - Open terrain
(-15, -6, 'open', @first_realm_id), (-14, -6, 'open', @first_realm_id), (-13, -6, 'open', @first_realm_id), (-12, -6, 'open', @first_realm_id), (-11, -6, 'open', @first_realm_id), (-10, -6, 'open', @first_realm_id), (-9, -6, 'open', @first_realm_id), (-8, -6, 'open', @first_realm_id), (-7, -6, 'open', @first_realm_id), (-6, -6, 'open', @first_realm_id), (-5, -6, 'open', @first_realm_id), (-4, -6, 'open', @first_realm_id), (-3, -6, 'open', @first_realm_id), (-2, -6, 'open', @first_realm_id), (-1, -6, 'open', @first_realm_id), (0, -6, 'open', @first_realm_id), (1, -6, 'open', @first_realm_id), (2, -6, 'open', @first_realm_id), (3, -6, 'open', @first_realm_id), (4, -6, 'open', @first_realm_id), (5, -6, 'open', @first_realm_id), (6, -6, 'open', @first_realm_id), (7, -6, 'open', @first_realm_id), (8, -6, 'open', @first_realm_id), (9, -6, 'open', @first_realm_id), (10, -6, 'open', @first_realm_id), (11, -6, 'open', @first_realm_id), (12, -6, 'open', @first_realm_id), (13, -6, 'open', @first_realm_id), (14, -6, 'open', @first_realm_id),

-- Row -5 (y = -5) - Open terrain with water features
(-15, -5, 'open', @first_realm_id), (-14, -5, 'open', @first_realm_id), (-13, -5, 'open', @first_realm_id), (-12, -5, 'open', @first_realm_id), (-11, -5, 'open', @first_realm_id), (-10, -5, 'open', @first_realm_id), (-9, -5, 'open', @first_realm_id), (-8, -5, 'open', @first_realm_id), (-7, -5, 'open', @first_realm_id), (-6, -5, 'open', @first_realm_id), (-5, -5, 'open', @first_realm_id), (-4, -5, 'open', @first_realm_id), (-3, -5, 'open', @first_realm_id), (-2, -5, 'open', @first_realm_id), (-1, -5, 'open', @first_realm_id), (0, -5, 'water', NULL), (1, -5, 'open', @first_realm_id), (2, -5, 'open', @first_realm_id), (3, -5, 'open', @first_realm_id), (4, -5, 'open', @first_realm_id), (5, -5, 'open', @first_realm_id), (6, -5, 'open', @first_realm_id), (7, -5, 'open', @first_realm_id), (8, -5, 'open', @first_realm_id), (9, -5, 'open', @first_realm_id), (10, -5, 'open', @first_realm_id), (11, -5, 'open', @first_realm_id), (12, -5, 'open', @first_realm_id), (13, -5, 'open', @first_realm_id), (14, -5, 'open', @first_realm_id),

-- Row -4 (y = -4) - Open terrain
(-15, -4, 'open', @first_realm_id), (-14, -4, 'open', @first_realm_id), (-13, -4, 'open', @first_realm_id), (-12, -4, 'open', @first_realm_id), (-11, -4, 'open', @first_realm_id), (-10, -4, 'open', @first_realm_id), (-9, -4, 'open', @first_realm_id), (-8, -4, 'open', @first_realm_id), (-7, -4, 'open', @first_realm_id), (-6, -4, 'open', @first_realm_id), (-5, -4, 'open', @first_realm_id), (-4, -4, 'open', @first_realm_id), (-3, -4, 'open', @first_realm_id), (-2, -4, 'open', @first_realm_id), (-1, -4, 'open', @first_realm_id), (0, -4, 'open', @first_realm_id), (1, -4, 'open', @first_realm_id), (2, -4, 'open', @first_realm_id), (3, -4, 'open', @first_realm_id), (4, -4, 'open', @first_realm_id), (5, -4, 'open', @first_realm_id), (6, -4, 'open', @first_realm_id), (7, -4, 'open', @first_realm_id), (8, -4, 'open', @first_realm_id), (9, -4, 'open', @first_realm_id), (10, -4, 'open', @first_realm_id), (11, -4, 'open', @first_realm_id), (12, -4, 'open', @first_realm_id), (13, -4, 'open', @first_realm_id), (14, -4, 'open', @first_realm_id),

-- Row -3 (y = -3) - Open terrain
(-15, -3, 'open', @first_realm_id), (-14, -3, 'open', @first_realm_id), (-13, -3, 'open', @first_realm_id), (-12, -3, 'open', @first_realm_id), (-11, -3, 'open', @first_realm_id), (-10, -3, 'open', @first_realm_id), (-9, -3, 'open', @first_realm_id), (-8, -3, 'open', @first_realm_id), (-7, -3, 'open', @first_realm_id), (-6, -3, 'open', @first_realm_id), (-5, -3, 'open', @first_realm_id), (-4, -3, 'open', @first_realm_id), (-3, -3, 'open', @first_realm_id), (-2, -3, 'open', @first_realm_id), (-1, -3, 'open', @first_realm_id), (0, -3, 'open', @first_realm_id), (1, -3, 'open', @first_realm_id), (2, -3, 'open', @first_realm_id), (3, -3, 'open', @first_realm_id), (4, -3, 'open', @first_realm_id), (5, -3, 'open', @first_realm_id), (6, -3, 'open', @first_realm_id), (7, -3, 'open', @first_realm_id), (8, -3, 'open', @first_realm_id), (9, -3, 'open', @first_realm_id), (10, -3, 'open', @first_realm_id), (11, -3, 'open', @first_realm_id), (12, -3, 'open', @first_realm_id), (13, -3, 'open', @first_realm_id), (14, -3, 'open', @first_realm_id),

-- Row -2 (y = -2) - Open terrain
(-15, -2, 'open', @first_realm_id), (-14, -2, 'open', @first_realm_id), (-13, -2, 'open', @first_realm_id), (-12, -2, 'open', @first_realm_id), (-11, -2, 'open', @first_realm_id), (-10, -2, 'open', @first_realm_id), (-9, -2, 'open', @first_realm_id), (-8, -2, 'open', @first_realm_id), (-7, -2, 'open', @first_realm_id), (-6, -2, 'open', @first_realm_id), (-5, -2, 'open', @first_realm_id), (-4, -2, 'open', @first_realm_id), (-3, -2, 'open', @first_realm_id), (-2, -2, 'open', @first_realm_id), (-1, -2, 'open', @first_realm_id), (0, -2, 'open', @first_realm_id), (1, -2, 'open', @first_realm_id), (2, -2, 'open', @first_realm_id), (3, -2, 'open', @first_realm_id), (4, -2, 'open', @first_realm_id), (5, -2, 'open', @first_realm_id), (6, -2, 'open', @first_realm_id), (7, -2, 'open', @first_realm_id), (8, -2, 'open', @first_realm_id), (9, -2, 'open', @first_realm_id), (10, -2, 'open', @first_realm_id), (11, -2, 'open', @first_realm_id), (12, -2, 'open', @first_realm_id), (13, -2, 'open', @first_realm_id), (14, -2, 'open', @first_realm_id),

-- Row -1 (y = -1) - Open terrain
(-15, -1, 'open', @first_realm_id), (-14, -1, 'open', @first_realm_id), (-13, -1, 'open', @first_realm_id), (-12, -1, 'open', @first_realm_id), (-11, -1, 'open', @first_realm_id), (-10, -1, 'open', @first_realm_id), (-9, -1, 'open', @first_realm_id), (-8, -1, 'open', @first_realm_id), (-7, -1, 'open', @first_realm_id), (-6, -1, 'open', @first_realm_id), (-5, -1, 'open', @first_realm_id), (-4, -1, 'open', @first_realm_id), (-3, -1, 'open', @first_realm_id), (-2, -1, 'open', @first_realm_id), (-1, -1, 'open', @first_realm_id), (0, -1, 'open', @first_realm_id), (1, -1, 'open', @first_realm_id), (2, -1, 'open', @first_realm_id), (3, -1, 'open', @first_realm_id), (4, -1, 'open', @first_realm_id), (5, -1, 'open', @first_realm_id), (6, -1, 'open', @first_realm_id), (7, -1, 'open', @first_realm_id), (8, -1, 'open', @first_realm_id), (9, -1, 'open', @first_realm_id), (10, -1, 'open', @first_realm_id), (11, -1, 'open', @first_realm_id), (12, -1, 'open', @first_realm_id), (13, -1, 'open', @first_realm_id), (14, -1, 'open', @first_realm_id),

-- Row 0 (y = 0) - Center with water border
(-15, 0, 'open', @first_realm_id), (-14, 0, 'open', @first_realm_id), (-13, 0, 'open', @first_realm_id), (-12, 0, 'open', @first_realm_id), (-11, 0, 'open', @first_realm_id), (-10, 0, 'open', @first_realm_id), (-9, 0, 'open', @first_realm_id), (-8, 0, 'open', @first_realm_id), (-7, 0, 'open', @first_realm_id), (-6, 0, 'open', @first_realm_id), (-5, 0, 'open', @first_realm_id), (-4, 0, 'open', @first_realm_id), (-3, 0, 'open', @first_realm_id), (-2, 0, 'open', @first_realm_id), (-1, 0, 'open', @first_realm_id), (0, 0, 'water', NULL), (1, 0, 'open', @second_realm_id), (2, 0, 'open', @second_realm_id), (3, 0, 'open', @second_realm_id), (4, 0, 'open', @second_realm_id), (5, 0, 'open', @second_realm_id), (6, 0, 'open', @second_realm_id), (7, 0, 'open', @second_realm_id), (8, 0, 'open', @second_realm_id), (9, 0, 'open', @second_realm_id), (10, 0, 'open', @second_realm_id), (11, 0, 'open', @second_realm_id), (12, 0, 'open', @second_realm_id), (13, 0, 'open', @second_realm_id), (14, 0, 'open', @second_realm_id),

-- Row 1 (y = 1) - Second realm territory
(-15, 1, 'open', @second_realm_id), (-14, 1, 'open', @second_realm_id), (-13, 1, 'open', @second_realm_id), (-12, 1, 'open', @second_realm_id), (-11, 1, 'open', @second_realm_id), (-10, 1, 'open', @second_realm_id), (-9, 1, 'open', @second_realm_id), (-8, 1, 'open', @second_realm_id), (-7, 1, 'open', @second_realm_id), (-6, 1, 'open', @second_realm_id), (-5, 1, 'open', @second_realm_id), (-4, 1, 'open', @second_realm_id), (-3, 1, 'open', @second_realm_id), (-2, 1, 'open', @second_realm_id), (-1, 1, 'open', @second_realm_id), (0, 1, 'open', @second_realm_id), (1, 1, 'open', @second_realm_id), (2, 1, 'open', @second_realm_id), (3, 1, 'open', @second_realm_id), (4, 1, 'open', @second_realm_id), (5, 1, 'open', @second_realm_id), (6, 1, 'open', @second_realm_id), (7, 1, 'open', @second_realm_id), (8, 1, 'open', @second_realm_id), (9, 1, 'open', @second_realm_id), (10, 1, 'open', @second_realm_id), (11, 1, 'open', @second_realm_id), (12, 1, 'open', @second_realm_id), (13, 1, 'open', @second_realm_id), (14, 1, 'open', @second_realm_id),

-- Row 2 (y = 2) - Second realm territory
(-15, 2, 'open', @second_realm_id), (-14, 2, 'open', @second_realm_id), (-13, 2, 'open', @second_realm_id), (-12, 2, 'open', @second_realm_id), (-11, 2, 'open', @second_realm_id), (-10, 2, 'open', @second_realm_id), (-9, 2, 'open', @second_realm_id), (-8, 2, 'open', @second_realm_id), (-7, 2, 'open', @second_realm_id), (-6, 2, 'open', @second_realm_id), (-5, 2, 'open', @second_realm_id), (-4, 2, 'open', @second_realm_id), (-3, 2, 'open', @second_realm_id), (-2, 2, 'open', @second_realm_id), (-1, 2, 'open', @second_realm_id), (0, 2, 'open', @second_realm_id), (1, 2, 'open', @second_realm_id), (2, 2, 'open', @second_realm_id), (3, 2, 'open', @second_realm_id), (4, 2, 'open', @second_realm_id), (5, 2, 'open', @second_realm_id), (6, 2, 'open', @second_realm_id), (7, 2, 'open', @second_realm_id), (8, 2, 'open', @second_realm_id), (9, 2, 'open', @second_realm_id), (10, 2, 'open', @second_realm_id), (11, 2, 'open', @second_realm_id), (12, 2, 'open', @second_realm_id), (13, 2, 'open', @second_realm_id), (14, 2, 'open', @second_realm_id),

-- Row 3 (y = 3) - Second realm territory
(-15, 3, 'open', @second_realm_id), (-14, 3, 'open', @second_realm_id), (-13, 3, 'open', @second_realm_id), (-12, 3, 'open', @second_realm_id), (-11, 3, 'open', @second_realm_id), (-10, 3, 'open', @second_realm_id), (-9, 3, 'open', @second_realm_id), (-8, 3, 'open', @second_realm_id), (-7, 3, 'open', @second_realm_id), (-6, 3, 'open', @second_realm_id), (-5, 3, 'open', @second_realm_id), (-4, 3, 'open', @second_realm_id), (-3, 3, 'open', @second_realm_id), (-2, 3, 'open', @second_realm_id), (-1, 3, 'open', @second_realm_id), (0, 3, 'open', @second_realm_id), (1, 3, 'open', @second_realm_id), (2, 3, 'open', @second_realm_id), (3, 3, 'open', @second_realm_id), (4, 3, 'open', @second_realm_id), (5, 3, 'open', @second_realm_id), (6, 3, 'open', @second_realm_id), (7, 3, 'open', @second_realm_id), (8, 3, 'open', @second_realm_id), (9, 3, 'open', @second_realm_id), (10, 3, 'open', @second_realm_id), (11, 3, 'open', @second_realm_id), (12, 3, 'open', @second_realm_id), (13, 3, 'open', @second_realm_id), (14, 3, 'open', @second_realm_id),

-- Row 4 (y = 4) - Second realm territory
(-15, 4, 'open', @second_realm_id), (-14, 4, 'open', @second_realm_id), (-13, 4, 'open', @second_realm_id), (-12, 4, 'open', @second_realm_id), (-11, 4, 'open', @second_realm_id), (-10, 4, 'open', @second_realm_id), (-9, 4, 'open', @second_realm_id), (-8, 4, 'open', @second_realm_id), (-7, 4, 'open', @second_realm_id), (-6, 4, 'open', @second_realm_id), (-5, 4, 'open', @second_realm_id), (-4, 4, 'open', @second_realm_id), (-3, 4, 'open', @second_realm_id), (-2, 4, 'open', @second_realm_id), (-1, 4, 'open', @second_realm_id), (0, 4, 'open', @second_realm_id), (1, 4, 'open', @second_realm_id), (2, 4, 'open', @second_realm_id), (3, 4, 'open', @second_realm_id), (4, 4, 'open', @second_realm_id), (5, 4, 'open', @second_realm_id), (6, 4, 'open', @second_realm_id), (7, 4, 'open', @second_realm_id), (8, 4, 'open', @second_realm_id), (9, 4, 'open', @second_realm_id), (10, 4, 'open', @second_realm_id), (11, 4, 'open', @second_realm_id), (12, 4, 'open', @second_realm_id), (13, 4, 'open', @second_realm_id), (14, 4, 'open', @second_realm_id),

-- Row 5 (y = 5) - Second realm territory
(-15, 5, 'open', @second_realm_id), (-14, 5, 'open', @second_realm_id), (-13, 5, 'open', @second_realm_id), (-12, 5, 'open', @second_realm_id), (-11, 5, 'open', @second_realm_id), (-10, 5, 'open', @second_realm_id), (-9, 5, 'open', @second_realm_id), (-8, 5, 'open', @second_realm_id), (-7, 5, 'open', @second_realm_id), (-6, 5, 'open', @second_realm_id), (-5, 5, 'open', @second_realm_id), (-4, 5, 'open', @second_realm_id), (-3, 5, 'open', @second_realm_id), (-2, 5, 'open', @second_realm_id), (-1, 5, 'open', @second_realm_id), (0, 5, 'open', @second_realm_id), (1, 5, 'open', @second_realm_id), (2, 5, 'open', @second_realm_id), (3, 5, 'open', @second_realm_id), (4, 5, 'open', @second_realm_id), (5, 5, 'open', @second_realm_id), (6, 5, 'open', @second_realm_id), (7, 5, 'open', @second_realm_id), (8, 5, 'open', @second_realm_id), (9, 5, 'open', @second_realm_id), (10, 5, 'open', @second_realm_id), (11, 5, 'open', @second_realm_id), (12, 5, 'open', @second_realm_id), (13, 5, 'open', @second_realm_id), (14, 5, 'open', @second_realm_id),

-- Row 6 (y = 6) - Second realm territory
(-15, 6, 'open', @second_realm_id), (-14, 6, 'open', @second_realm_id), (-13, 6, 'open', @second_realm_id), (-12, 6, 'open', @second_realm_id), (-11, 6, 'open', @second_realm_id), (-10, 6, 'open', @second_realm_id), (-9, 6, 'open', @second_realm_id), (-8, 6, 'open', @second_realm_id), (-7, 6, 'open', @second_realm_id), (-6, 6, 'open', @second_realm_id), (-5, 6, 'open', @second_realm_id), (-4, 6, 'open', @second_realm_id), (-3, 6, 'open', @second_realm_id), (-2, 6, 'open', @second_realm_id), (-1, 6, 'open', @second_realm_id), (0, 6, 'open', @second_realm_id), (1, 6, 'open', @second_realm_id), (2, 6, 'open', @second_realm_id), (3, 6, 'open', @second_realm_id), (4, 6, 'open', @second_realm_id), (5, 6, 'open', @second_realm_id), (6, 6, 'open', @second_realm_id), (7, 6, 'open', @second_realm_id), (8, 6, 'open', @second_realm_id), (9, 6, 'open', @second_realm_id), (10, 6, 'open', @second_realm_id), (11, 6, 'open', @second_realm_id), (12, 6, 'open', @second_realm_id), (13, 6, 'open', @second_realm_id), (14, 6, 'open', @second_realm_id),

-- Row 7 (y = 7) - Second realm territory with forests
(-15, 7, 'open', @second_realm_id), (-14, 7, 'open', @second_realm_id), (-13, 7, 'open', @second_realm_id), (-12, 7, 'open', @second_realm_id), (-11, 7, 'open', @second_realm_id), (-10, 7, 'open', @second_realm_id), (-9, 7, 'open', @second_realm_id), (-8, 7, 'open', @second_realm_id), (-7, 7, 'open', @second_realm_id), (-6, 7, 'open', @second_realm_id), (-5, 7, 'open', @second_realm_id), (-4, 7, 'open', @second_realm_id), (-3, 7, 'open', @second_realm_id), (-2, 7, 'open', @second_realm_id), (-1, 7, 'open', @second_realm_id), (0, 7, 'open', @second_realm_id), (1, 7, 'open', @second_realm_id), (2, 7, 'open', @second_realm_id), (3, 7, 'open', @second_realm_id), (4, 7, 'open', @second_realm_id), (5, 7, 'open', @second_realm_id), (6, 7, 'open', @second_realm_id), (7, 7, 'open', @second_realm_id), (8, 7, 'open', @second_realm_id), (9, 7, 'open', @second_realm_id), (10, 7, 'open', @second_realm_id), (11, 7, 'open', @second_realm_id), (12, 7, 'open', @second_realm_id), (13, 7, 'open', @second_realm_id), (14, 7, 'open', @second_realm_id),

-- Row 8 (y = 8) - Second realm territory with forests
(-15, 8, 'open', @second_realm_id), (-14, 8, 'open', @second_realm_id), (-13, 8, 'open', @second_realm_id), (-12, 8, 'open', @second_realm_id), (-11, 8, 'open', @second_realm_id), (-10, 8, 'open', @second_realm_id), (-9, 8, 'open', @second_realm_id), (-8, 8, 'open', @second_realm_id), (-7, 8, 'open', @second_realm_id), (-6, 8, 'open', @second_realm_id), (-5, 8, 'open', @second_realm_id), (-4, 8, 'open', @second_realm_id), (-3, 8, 'open', @second_realm_id), (-2, 8, 'open', @second_realm_id), (-1, 8, 'open', @second_realm_id), (0, 8, 'open', @second_realm_id), (1, 8, 'open', @second_realm_id), (2, 8, 'open', @second_realm_id), (3, 8, 'open', @second_realm_id), (4, 8, 'open', @second_realm_id), (5, 8, 'open', @second_realm_id), (6, 8, 'open', @second_realm_id), (7, 8, 'open', @second_realm_id), (8, 8, 'open', @second_realm_id), (9, 8, 'open', @second_realm_id), (10, 8, 'open', @second_realm_id), (11, 8, 'open', @second_realm_id), (12, 8, 'open', @second_realm_id), (13, 8, 'open', @second_realm_id), (14, 8, 'open', @second_realm_id),

-- Row 9 (y = 9) - Southern mountains
(-15, 9, 'mountains', @second_realm_id), (-14, 9, 'mountains', @second_realm_id), (-13, 9, 'mountains', @second_realm_id), (-12, 9, 'mountains', @second_realm_id), (-11, 9, 'mountains', @second_realm_id), (-10, 9, 'mountains', @second_realm_id), (-9, 9, 'mountains', @second_realm_id), (-8, 9, 'mountains', @second_realm_id), (-7, 9, 'mountains', @second_realm_id), (-6, 9, 'mountains', @second_realm_id), (-5, 9, 'mountains', @second_realm_id), (-4, 9, 'mountains', @second_realm_id), (-3, 9, 'mountains', @second_realm_id), (-2, 9, 'mountains', @second_realm_id), (-1, 9, 'mountains', @second_realm_id), (0, 9, 'mountains', @second_realm_id), (1, 9, 'mountains', @second_realm_id), (2, 9, 'mountains', @second_realm_id), (3, 9, 'mountains', @second_realm_id), (4, 9, 'mountains', @second_realm_id), (5, 9, 'mountains', @second_realm_id), (6, 9, 'mountains', @second_realm_id), (7, 9, 'mountains', @second_realm_id), (8, 9, 'mountains', @second_realm_id), (9, 9, 'mountains', @second_realm_id), (10, 9, 'mountains', @second_realm_id), (11, 9, 'mountains', @second_realm_id), (12, 9, 'mountains', @second_realm_id), (13, 9, 'mountains', @second_realm_id), (14, 9, 'mountains', @second_realm_id);

-- Insert sample unit classes
INSERT INTO unit_classes (name, description, unit_type, melee_combat, ranged_combat, defence, attack_range, hitpoints, strategic_speed) VALUES
('Swordsman', 'Basic infantry unit with sword and shield', 'infantry', 3, 0, 2, 1, 10, 1),
('Archer', 'Ranged infantry unit with bow', 'infantry', 1, 4, 1, 6, 8, 1),
('Knight', 'Heavy cavalry with lance and armor', 'cavalry', 5, 0, 4, 1, 15, 2),
('Dragon', 'Flying monster with devastating attacks', 'monster', 8, 6, 3, 3, 25, 4),
('Hero', 'Legendary warrior with exceptional abilities', 'hero', 7, 3, 5, 2, 20, 1),
('Ballista', 'Siege weapon for long-range attacks', 'warmachine', 1, 8, 2, 12, 12, 1);

-- Link unit classes to keywords
INSERT INTO unit_classes_keywords (unit_class_id, keyword) VALUES
(1, 'chaos'),  -- Swordsman is chaotic
(4, 'flying'), -- Dragon can fly
(5, 'chaos');  -- Hero is chaotic

-- Insert sample armies
INSERT INTO army (name, realm_id, x_coord, y_coord) VALUES
('First Army', @first_realm_id, -1, -1),
('Defense Force', @first_realm_id, 0, -2),
('Invasion Force', @second_realm_id, 1, 1),
('Border Patrol', @second_realm_id, 2, 0);

-- Insert sample units
-- Get unit class IDs for reference
SET @swordsman_id = (SELECT id FROM unit_classes WHERE name = 'Swordsman' LIMIT 1);
SET @archer_id = (SELECT id FROM unit_classes WHERE name = 'Archer' LIMIT 1);
SET @knight_id = (SELECT id FROM unit_classes WHERE name = 'Knight' LIMIT 1);
SET @dragon_id = (SELECT id FROM unit_classes WHERE name = 'Dragon' LIMIT 1);
SET @hero_id = (SELECT id FROM unit_classes WHERE name = 'Hero' LIMIT 1);
SET @ballista_id = (SELECT id FROM unit_classes WHERE name = 'Ballista' LIMIT 1);

-- Get army IDs for reference
SET @first_army_id = (SELECT id FROM army WHERE name = 'First Army' LIMIT 1);
SET @defense_force_id = (SELECT id FROM army WHERE name = 'Defense Force' LIMIT 1);
SET @invasion_force_id = (SELECT id FROM army WHERE name = 'Invasion Force' LIMIT 1);
SET @border_patrol_id = (SELECT id FROM army WHERE name = 'Border Patrol' LIMIT 1);

-- Insert units for First Army
INSERT INTO unit (name, realm_id, unit_class_id, army_id, current_hitpoints) VALUES
('Swordsman Alpha', @first_realm_id, @swordsman_id, @first_army_id, 10),
('Swordsman Beta', @first_realm_id, @swordsman_id, @first_army_id, 8),
('Archer Charlie', @first_realm_id, @archer_id, @first_army_id, 6),
('Knight Delta', @first_realm_id, @knight_id, @first_army_id, 15);

-- Insert units for Defense Force
INSERT INTO unit (name, realm_id, unit_class_id, army_id, current_hitpoints) VALUES
('Archer Echo', @first_realm_id, @archer_id, @defense_force_id, 8),
('Ballista Foxtrot', @first_realm_id, @ballista_id, @defense_force_id, 12),
('Hero Gamma', @first_realm_id, @hero_id, @defense_force_id, 18);

-- Insert units for Invasion Force
INSERT INTO unit (name, realm_id, unit_class_id, army_id, current_hitpoints) VALUES
('Dragon Omega', @second_realm_id, @dragon_id, @invasion_force_id, 22),
('Knight Zeta', @second_realm_id, @knight_id, @invasion_force_id, 14),
('Swordsman Eta', @second_realm_id, @swordsman_id, @invasion_force_id, 9);

-- Insert units for Border Patrol
INSERT INTO unit (name, realm_id, unit_class_id, army_id, current_hitpoints) VALUES
('Archer Theta', @second_realm_id, @archer_id, @border_patrol_id, 7),
('Knight Iota', @second_realm_id, @knight_id, @border_patrol_id, 13);

-- Insert sample game turns (4 completed turns in past, current turn active)
-- Each turn lasts 24 hours, command deadline at 20:00 each day
INSERT INTO game_turns (turn_number, start_time, end_time, command_deadline, status) VALUES
(1, DATE_SUB(CURDATE(), INTERVAL 4 DAY) + INTERVAL 0 HOUR, 
     DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 0 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 4 DAY) + INTERVAL 20 HOUR, 'completed'),
(2, DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 0 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 0 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 20 HOUR, 'completed'),
(3, DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 0 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 0 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 20 HOUR, 'completed'),
(4, DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 0 HOUR,
     CURDATE() + INTERVAL 0 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 20 HOUR, 'completed'),
(5, CURDATE() + INTERVAL 0 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 0 HOUR,
     CURDATE() + INTERVAL 20 HOUR, 'active');

-- You can add more sample data here as needed 