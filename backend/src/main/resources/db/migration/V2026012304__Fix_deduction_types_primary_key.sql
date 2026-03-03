-- V2026012304: Fix the deduction_types table - add primary key
-- The table is missing a primary key which prevents foreign key constraints

-- First, add the id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types' AND column_name = 'id'
    ) THEN
        ALTER TABLE deduction_types ADD COLUMN id UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id column to deduction_types table';
    END IF;
END $$;

-- Update any null id values
UPDATE deduction_types SET id = gen_random_uuid() WHERE id IS NULL;

-- Make id not null
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'id'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE deduction_types ALTER COLUMN id SET NOT NULL;
        RAISE NOTICE 'Made id column NOT NULL in deduction_types table';
    END IF;
END $$;

-- Add primary key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'deduction_types'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE deduction_types ADD PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key constraint to deduction_types table';
    END IF;
END $$;
