-- V2026012301: Drop the type column from deduction_types
-- This column causes "null value in column type violates not-null constraint" errors
-- because it was added by Hibernate auto-DDL but is not in the DeductionType entity

-- Drop ALL constraints associated with the type column first
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Find and drop all constraints on the type column
    FOR constraint_rec IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'deduction_types'
        AND a.attname = 'type'
    LOOP
        EXECUTE 'ALTER TABLE deduction_types DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.conname) || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping constraints: %', SQLERRM;
END $$;

-- Drop any check constraint that might exist
ALTER TABLE deduction_types DROP CONSTRAINT IF EXISTS deduction_types_type_check;

-- Now drop the column with CASCADE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE deduction_types DROP COLUMN type CASCADE;
        RAISE NOTICE 'Successfully dropped type column from deduction_types';
    ELSE
        RAISE NOTICE 'Column type does not exist in deduction_types - nothing to drop';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping column: %', SQLERRM;
END $$;
