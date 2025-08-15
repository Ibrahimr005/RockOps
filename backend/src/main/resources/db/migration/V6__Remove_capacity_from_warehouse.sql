-- Remove capacity column from warehouse table
-- This column was removed from the Warehouse entity but still exists in the database
ALTER TABLE warehouse DROP COLUMN IF EXISTS capacity;