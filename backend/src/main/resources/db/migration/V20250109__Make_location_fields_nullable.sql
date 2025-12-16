-- Make from_location and to_location nullable in maintenance_steps table
-- These fields should be optional for non-transport steps

ALTER TABLE maintenance_steps
ALTER COLUMN from_location DROP NOT NULL;

ALTER TABLE maintenance_steps
ALTER COLUMN to_location DROP NOT NULL;
