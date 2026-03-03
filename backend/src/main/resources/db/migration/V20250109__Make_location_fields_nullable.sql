-- Make from_location and to_location nullable in maintenance_steps table
-- These fields should be optional for non-transport steps
-- Made idempotent to handle cases where columns are already nullable

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_steps'
        AND column_name = 'from_location'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE maintenance_steps ALTER COLUMN from_location DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_steps'
        AND column_name = 'to_location'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE maintenance_steps ALTER COLUMN to_location DROP NOT NULL;
    END IF;
END $$;
