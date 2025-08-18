-- Sample data for testing
USE warlordlands;

-- Insert sample admin user
-- Note: In production, use proper password hashing (e.g., bcrypt)
-- Password: admin123 (bcrypt hash with salt rounds 10)
INSERT INTO users (nick, fullname, email, password_hash) 
VALUES ('admin', 'System Administrator', 'admin@warlordlands.com.example', '$2b$10$2CshI/rXAmnNAjIs/PoRGuQG6TNiogqP5Lin4wTioI4IXt5eCqpaS');

-- Insert sample player
-- Note: In production, use proper password hashing (e.g., bcrypt)
-- Password: player123 (bcrypt hash with salt rounds 10)
INSERT INTO player (nick, fullname, email, password_hash) 
VALUES ('player1', 'Player One', 'player@example.com.invalid', '$2b$10$IhxK9b.1XbtI0ABFlTMOAOpFR/e2U.LlfmwicJBYHK.8tnbaVUqh2');

-- Store the player's ID for multiple realm insertions
SET @player_id = LAST_INSERT_ID();

-- Insert sample realms for the player
INSERT INTO realm (name, player_id) VALUES 
('First Realm', @player_id),
('Sample Realm', @player_id);

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

-- Create a small 5x5 sample map
-- Store realm IDs for map assignment
SET @first_realm_id = (SELECT id FROM realm WHERE name = 'First Realm' LIMIT 1);
SET @sample_realm_id = (SELECT id FROM realm WHERE name = 'Sample Realm' LIMIT 1);

-- Insert map tiles (5x5 grid from -2 to 2)
INSERT INTO map (x_coord, y_coord, terrain_type, realm_id) VALUES
-- Row -2 (y = -2)
(-2, -2, 'mountains', @first_realm_id),
(-1, -2, 'forest', @first_realm_id),
(0, -2, 'forest', @first_realm_id),
(1, -2, 'open', @first_realm_id),
(2, -2, 'mountains', @first_realm_id),

-- Row -1 (y = -1)
(-2, -1, 'forest', @first_realm_id),
(-1, -1, 'open', @first_realm_id),
(0, -1, 'open', @first_realm_id),
(1, -1, 'open', @first_realm_id),
(2, -1, 'forest', @first_realm_id),

-- Row 0 (y = 0) - center with water
(-2, 0, 'open', @first_realm_id),
(-1, 0, 'open', @first_realm_id),
(0, 0, 'water', NULL),  -- Neutral territory
(1, 0, 'open', @sample_realm_id),
(2, 0, 'open', @sample_realm_id),

-- Row 1 (y = 1)
(-2, 1, 'forest', @sample_realm_id),
(-1, 1, 'open', @sample_realm_id),
(0, 1, 'open', @sample_realm_id),
(1, 1, 'open', @sample_realm_id),
(2, 1, 'forest', @sample_realm_id),

-- Row 2 (y = 2)
(-2, 2, 'mountains', @sample_realm_id),
(-1, 2, 'forest', @sample_realm_id),
(0, 2, 'forest', @sample_realm_id),
(1, 2, 'open', @sample_realm_id),
(2, 2, 'mountains', @sample_realm_id);

-- Insert sample unit classes
INSERT INTO unit_classes (name, description, unit_type, melee_combat, ranged_combat, defence, attack_range, hitpoints) VALUES
('Swordsman', 'Basic infantry unit with sword and shield', 'infantry', 3, 0, 2, 1, 10),
('Archer', 'Ranged infantry unit with bow', 'infantry', 1, 4, 1, 6, 8),
('Knight', 'Heavy cavalry with lance and armor', 'cavalry', 5, 0, 4, 1, 15),
('Dragon', 'Flying monster with devastating attacks', 'monster', 8, 6, 3, 3, 25),
('Hero', 'Legendary warrior with exceptional abilities', 'hero', 7, 3, 5, 2, 20),
('Ballista', 'Siege weapon for long-range attacks', 'warmachine', 1, 8, 2, 12, 12);

-- Link unit classes to keywords
INSERT INTO unit_classes_keywords (unit_class_id, keyword) VALUES
(1, 'chaos'),  -- Swordsman is chaotic
(4, 'flying'), -- Dragon can fly
(5, 'chaos');  -- Hero is chaotic

-- Insert sample armies
INSERT INTO army (name, realm_id, x_coord, y_coord) VALUES
('First Army', @first_realm_id, -1, -1),
('Defense Force', @first_realm_id, 0, -2),
('Invasion Force', @sample_realm_id, 1, 1),
('Border Patrol', @sample_realm_id, 2, 0);

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
('Dragon Omega', @sample_realm_id, @dragon_id, @invasion_force_id, 22),
('Knight Zeta', @sample_realm_id, @knight_id, @invasion_force_id, 14),
('Swordsman Eta', @sample_realm_id, @swordsman_id, @invasion_force_id, 9);

-- Insert units for Border Patrol
INSERT INTO unit (name, realm_id, unit_class_id, army_id, current_hitpoints) VALUES
('Archer Theta', @sample_realm_id, @archer_id, @border_patrol_id, 7),
('Knight Iota', @sample_realm_id, @knight_id, @border_patrol_id, 13);

-- You can add more sample data here as needed 