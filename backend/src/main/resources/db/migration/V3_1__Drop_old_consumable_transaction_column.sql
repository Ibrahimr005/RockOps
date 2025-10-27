-- Migration to drop the old transaction_id column from consumable table
-- This should be run after V2 migration has successfully migrated all data

-- Drop the old transaction_id column
ALTER TABLE consumable DROP COLUMN IF EXISTS transaction_id; 