-- V20260126: Drop the type column and its check constraint from deduction_types
-- This column was added by Hibernate auto-DDL but is not needed in the entity

-- Drop the check constraint first (try multiple possible names)
DO $$
BEGIN
    ALTER TABLE deduction_types DROP CONSTRAINT IF EXISTS deduction_types_type_check;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Drop the type column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE deduction_types DROP COLUMN type;
    END IF;
END $$;
