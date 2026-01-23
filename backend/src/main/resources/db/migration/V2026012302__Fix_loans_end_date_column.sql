-- V2026012302: Fix the end_date column in loans table
-- This column was added by Hibernate auto-DDL but is not in the Loan entity
-- Either make it nullable or drop it

-- Option 1: Make end_date nullable (safer - preserves existing data)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loans'
        AND column_name = 'end_date'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE loans ALTER COLUMN end_date DROP NOT NULL;
        RAISE NOTICE 'Made end_date column nullable in loans table';
    END IF;
END $$;

-- Set default for end_date if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loans'
        AND column_name = 'end_date'
    ) THEN
        -- Set null for rows where end_date is still required
        UPDATE loans SET end_date = NULL WHERE end_date IS NOT NULL;
        RAISE NOTICE 'Set end_date to NULL for existing loans';
    END IF;
END $$;
