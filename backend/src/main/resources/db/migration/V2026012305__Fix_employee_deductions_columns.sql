-- V2026012305: Fix employee_deductions table column names
-- The database has 'effective_from' but entity uses 'effective_start_date'

-- Option 1: Make effective_from nullable if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_deductions'
        AND column_name = 'effective_from'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE employee_deductions ALTER COLUMN effective_from DROP NOT NULL;
        RAISE NOTICE 'Made effective_from column nullable';
    END IF;
END $$;

-- Copy data from effective_from to effective_start_date if both exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_deductions' AND column_name = 'effective_from'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_deductions' AND column_name = 'effective_start_date'
    ) THEN
        UPDATE employee_deductions
        SET effective_start_date = effective_from
        WHERE effective_start_date IS NULL AND effective_from IS NOT NULL;
        RAISE NOTICE 'Copied data from effective_from to effective_start_date';
    END IF;
END $$;

-- Also handle effective_to if it exists (map to effective_end_date)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_deductions'
        AND column_name = 'effective_to'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE employee_deductions ALTER COLUMN effective_to DROP NOT NULL;
        RAISE NOTICE 'Made effective_to column nullable';
    END IF;
END $$;

-- Copy data from effective_to to effective_end_date if both exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_deductions' AND column_name = 'effective_to'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_deductions' AND column_name = 'effective_end_date'
    ) THEN
        UPDATE employee_deductions
        SET effective_end_date = effective_to
        WHERE effective_end_date IS NULL AND effective_to IS NOT NULL;
        RAISE NOTICE 'Copied data from effective_to to effective_end_date';
    END IF;
END $$;
