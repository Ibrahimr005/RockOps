-- V2026012306: Fix and populate employee_number for existing employees
-- ============================================================================
-- NEW Format: EMP-YYYY-##### (e.g., EMP-2024-00027)
-- - YYYY: Derived from employee hire_date year
-- - #####: Sequential counter per year (resets each year)
--
-- OLD Format: EMP-XXXXXX (e.g., EMP-000001) - will be converted
--
-- This migration:
-- 1. Ensures the employee_number column exists
-- 2. Creates a backup table for rollback capability
-- 3. Backs up existing employee numbers
-- 4. Converts old format (EMP-XXXXXX) to new format (EMP-YYYY-#####)
-- 5. Populates NULL employee numbers
-- 6. Creates a unique index
-- ============================================================================

-- ============================================
-- STEP 1: Ensure the employee_number column exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee' AND column_name = 'employee_number'
    ) THEN
        ALTER TABLE employee ADD COLUMN employee_number VARCHAR(20);
        RAISE NOTICE 'Added employee_number column';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create backup table for rollback
-- ============================================
CREATE TABLE IF NOT EXISTS employee_numbers_backup_v2026012306 (
    id UUID PRIMARY KEY,
    original_employee_number VARCHAR(20),
    new_employee_number VARCHAR(20),
    hire_date DATE,
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 3: Backup existing employee numbers
-- ============================================
-- Backup all employees that have a number or will get one
INSERT INTO employee_numbers_backup_v2026012306 (id, original_employee_number, hire_date)
SELECT
    id,
    employee_number,
    hire_date
FROM employee
WHERE employee_number IS NOT NULL
   OR employee_number IS NULL  -- Include all for tracking
ON CONFLICT (id) DO UPDATE SET
    original_employee_number = EXCLUDED.original_employee_number,
    hire_date = EXCLUDED.hire_date,
    migrated_at = CURRENT_TIMESTAMP;

-- ============================================
-- STEP 4: Update employee numbers to new format
-- ============================================
-- This handles:
-- - NULL employee numbers
-- - Old format: EMP-XXXXXX (6 digits after EMP-)
-- - Any format that doesn't match EMP-YYYY-##### pattern

WITH employees_to_update AS (
    SELECT
        id,
        employee_number as old_number,
        hire_date,
        -- Determine the year from hire_date, or use current year
        COALESCE(EXTRACT(YEAR FROM hire_date)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) as hire_year
    FROM employee
    WHERE employee_number IS NULL
       -- Old format: EMP- followed by exactly 6 digits (no dash in middle)
       OR (employee_number LIKE 'EMP-%' AND employee_number NOT LIKE 'EMP-____-_%')
       -- Any other non-conforming format
       OR (employee_number IS NOT NULL AND employee_number NOT LIKE 'EMP-____-_____')
),
-- Assign sequential numbers per year, ordered by hire date then by id
sequenced_employees AS (
    SELECT
        id,
        old_number,
        hire_date,
        hire_year,
        ROW_NUMBER() OVER (
            PARTITION BY hire_year
            ORDER BY COALESCE(hire_date, '1900-01-01'::DATE), id
        ) as year_sequence
    FROM employees_to_update
),
-- Get max existing sequence per year (for employees already in new format)
existing_max_sequences AS (
    SELECT
        SUBSTRING(employee_number FROM 5 FOR 4)::INTEGER as year,
        MAX(SUBSTRING(employee_number FROM 10)::INTEGER) as max_seq
    FROM employee
    WHERE employee_number LIKE 'EMP-____-_____'
      AND employee_number ~ '^EMP-[0-9]{4}-[0-9]{5}$'
    GROUP BY SUBSTRING(employee_number FROM 5 FOR 4)::INTEGER
)
UPDATE employee e
SET employee_number = 'EMP-' || se.hire_year || '-' ||
    LPAD((COALESCE(ems.max_seq, 0) + se.year_sequence)::TEXT, 5, '0')
FROM sequenced_employees se
LEFT JOIN existing_max_sequences ems ON ems.year = se.hire_year
WHERE e.id = se.id;

-- ============================================
-- STEP 5: Update backup table with new numbers
-- ============================================
UPDATE employee_numbers_backup_v2026012306 b
SET new_employee_number = e.employee_number
FROM employee e
WHERE b.id = e.id;

-- ============================================
-- STEP 6: Create unique index if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'employee' AND indexname = 'idx_employee_number_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_employee_number_unique ON employee(employee_number) WHERE employee_number IS NOT NULL;
        RAISE NOTICE 'Created unique index on employee_number';
    END IF;
END $$;

-- ============================================
-- STEP 7: Log migration results
-- ============================================
DO $$
DECLARE
    total_employees INTEGER;
    employees_with_numbers INTEGER;
    converted_count INTEGER;
    year_counts TEXT;
BEGIN
    SELECT COUNT(*) INTO total_employees FROM employee;
    SELECT COUNT(*) INTO employees_with_numbers FROM employee WHERE employee_number IS NOT NULL;
    SELECT COUNT(*) INTO converted_count
    FROM employee_numbers_backup_v2026012306
    WHERE original_employee_number IS DISTINCT FROM new_employee_number;

    -- Get counts by year
    SELECT STRING_AGG(year || ': ' || cnt, ', ' ORDER BY year)
    INTO year_counts
    FROM (
        SELECT
            SUBSTRING(employee_number FROM 5 FOR 4) as year,
            COUNT(*) as cnt
        FROM employee
        WHERE employee_number LIKE 'EMP-____-_____'
        GROUP BY SUBSTRING(employee_number FROM 5 FOR 4)
    ) yearly;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration V2026012306 Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total employees: %', total_employees;
    RAISE NOTICE 'Employees with numbers: %', employees_with_numbers;
    RAISE NOTICE 'Records converted: %', converted_count;
    RAISE NOTICE 'Employee counts by year: %', COALESCE(year_counts, 'None');
    RAISE NOTICE 'Backup table: employee_numbers_backup_v2026012306';
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- STEP 8: Verify all employee numbers are valid
-- ============================================
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM employee
    WHERE employee_number IS NOT NULL
      AND employee_number !~ '^EMP-[0-9]{4}-[0-9]{5}$';

    IF invalid_count > 0 THEN
        RAISE WARNING 'WARNING: % employees have invalid employee_number format. Manual review needed.', invalid_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All employee numbers are in valid EMP-YYYY-##### format.';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK PROCEDURE (Run manually if needed)
-- ============================================================================
-- To rollback this migration:
--
-- 1. Restore original employee numbers from backup:
--    UPDATE employee e
--    SET employee_number = b.original_employee_number
--    FROM employee_numbers_backup_v2026012306 b
--    WHERE e.id = b.id;
--
-- 2. Optionally drop the backup table (after verifying rollback):
--    DROP TABLE IF EXISTS employee_numbers_backup_v2026012306;
--
-- 3. Optionally drop the unique index:
--    DROP INDEX IF EXISTS idx_employee_number_unique;
--
-- ============================================================================
