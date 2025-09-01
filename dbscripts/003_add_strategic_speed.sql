-- Add commands table to warlordlands database
USE warlordlands;

-- Add strategic_speed column to unit_classes table
-- Strategic speed determines how fast a unit can move on the strategic map

ALTER TABLE unit_classes ADD COLUMN strategic_speed INT NOT NULL DEFAULT 1 AFTER hitpoints;

-- Update existing unit classes with appropriate strategic speed values
-- Infantry units: moderate speed
UPDATE unit_classes SET strategic_speed = 1 WHERE unit_type = 'infantry';

-- Cavalry units: fast speed
UPDATE unit_classes SET strategic_speed = 3 WHERE unit_type = 'cavalry';

-- Flying units: very fast speed
UPDATE unit_classes SET strategic_speed = 4 WHERE name = 'Dragon';

-- War machines: slow speed
UPDATE unit_classes SET strategic_speed = 1 WHERE unit_type = 'warmachine';

-- Heroes: fast speed (individual units)
UPDATE unit_classes SET strategic_speed = 1 WHERE name = 'Hero';
