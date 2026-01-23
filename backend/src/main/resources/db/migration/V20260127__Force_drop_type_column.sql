-- V20260127: Force drop the type column from deduction_types
-- This column was added by Hibernate auto-DDL but is not needed

-- Drop ALL constraints on the type column first
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'deduction_types'
        AND a.attname = 'type'
    LOOP
        EXECUTE 'ALTER TABLE deduction_types DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.conname);
    END LOOP;
END $$;

-- Now drop the column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE deduction_types DROP COLUMN type CASCADE;
    END IF;
END $$;
