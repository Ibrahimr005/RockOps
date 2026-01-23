-- V2026012308: Fix existing employee numbers to new format
-- ============================================================================
-- This migration fixes employee numbers that are in the old format or NULL
--
-- OLD Format: EMP-XXXXXX (e.g., EMP-000001)
-- NEW Format: EMP-YYYY-##### (e.g., EMP-2024-00027)
--
-- - YYYY: Derived from employee hire_date year
-- - #####: Sequential counter per year (resets each year)
-- ============================================================================

-- ============================================
-- STEP 1: Create backup table for rollback
-- ============================================
CREATE TABLE IF NOT EXISTS employee_numbers_backup_v2026012308 (
    id UUID PRIMARY KEY,
    original_employee_number VARCHAR(20),
    new_employee_number VARCHAR(20),
    hire_date DATE,
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 2: Backup existing employee numbers that will be changed
-- ============================================
INSERT INTO employee_numbers_backup_v2026012308 (id, original_employee_number, hire_date)
SELECT
    id,
    employee_number,
    hire_date
FROM employee
WHERE employee_number IS NULL
   -- Old format: EMP- followed by digits without year separator
   OR (employee_number LIKE 'EMP-%' AND employee_number NOT LIKE 'EMP-____-_____')
   -- Doesn't match the new format pattern
   OR (employee_number IS NOT NULL AND employee_number !~ '^EMP-[0-9]{4}-[0-9]{5}$')
ON CONFLICT (id) DO UPDATE SET
    original_employee_number = EXCLUDED.original_employee_number,
    hire_date = EXCLUDED.hire_date,
    migrated_at = CURRENT_TIMESTAMP;

-- ============================================
-- STEP 3: Update employee numbers to new format
-- ============================================
WITH employees_to_update AS (
    -- Select employees that need updating
    SELECT
        id,
        employee_number as old_number,
        hire_date,
        COALESCE(EXTRACT(YEAR FROM hire_date)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) as hire_year
    FROM employee
    WHERE employee_number IS NULL
       OR (employee_number LIKE 'EMP-%' AND employee_number NOT LIKE 'EMP-____-_____')
       OR (employee_number IS NOT NULL AND employee_number !~ '^EMP-[0-9]{4}-[0-9]{5}$')
),
-- Get max existing sequence per year for employees already in new format
existing_max_sequences AS (
    SELECT
        SUBSTRING(employee_number FROM 5 FOR 4)::INTEGER as year,
        MAX(SUBSTRING(employee_number FROM 10)::INTEGER) as max_seq
    FROM employee
    WHERE employee_number ~ '^EMP-[0-9]{4}-[0-9]{5}$'
    GROUP BY SUBSTRING(employee_number FROM 5 FOR 4)::INTEGER
),
-- Assign new sequential numbers per year
sequenced_employees AS (
    SELECT
        etu.id,
        etu.old_number,
        etu.hire_date,
        etu.hire_year,
        COALESCE(ems.max_seq, 0) + ROW_NUMBER() OVER (
            PARTITION BY etu.hire_year
            ORDER BY COALESCE(etu.hire_date, '1900-01-01'::DATE), etu.id
        ) as new_sequence
    FROM employees_to_update etu
    LEFT JOIN existing_max_sequences ems ON ems.year = etu.hire_year
)
UPDATE employee e
SET employee_number = 'EMP-' || se.hire_year || '-' || LPAD(se.new_sequence::TEXT, 5, '0')
FROM sequenced_employees se
WHERE e.id = se.id;

-- ============================================
-- STEP 4: Update backup table with new numbers
-- ============================================
UPDATE employee_numbers_backup_v2026012308 b
SET new_employee_number = e.employee_number
FROM employee e
WHERE b.id = e.id;

-- ============================================
-- STEP 5: Log migration results
-- ============================================
DO $$
DECLARE
    total_employees INTEGER;
    updated_count INTEGER;
    year_counts TEXT;
BEGIN
    SELECT COUNT(*) INTO total_employees FROM employee;
    SELECT COUNT(*) INTO updated_count FROM employee_numbers_backup_v2026012308;

    SELECT STRING_AGG(year || ': ' || cnt, ', ' ORDER BY year)
    INTO year_counts
    FROM (
        SELECT
            SUBSTRING(employee_number FROM 5 FOR 4) as year,
            COUNT(*) as cnt
        FROM employee
        WHERE employee_number ~ '^EMP-[0-9]{4}-[0-9]{5}$'
        GROUP BY SUBSTRING(employee_number FROM 5 FOR 4)
    ) yearly;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration V2026012308 Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total employees: %', total_employees;
    RAISE NOTICE 'Records updated: %', updated_count;
    RAISE NOTICE 'Employee counts by year: %', COALESCE(year_counts, 'None');
    RAISE NOTICE 'Backup table: employee_numbers_backup_v2026012308';
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- STEP 6: Verify all employee numbers are valid
-- ============================================
DO $$
DECLARE
    invalid_count INTEGER;
    sample_invalid TEXT;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM employee
    WHERE employee_number IS NOT NULL
      AND employee_number !~ '^EMP-[0-9]{4}-[0-9]{5}$';

    IF invalid_count > 0 THEN
        SELECT STRING_AGG(employee_number, ', ' ORDER BY employee_number) INTO sample_invalid
        FROM (SELECT employee_number FROM employee WHERE employee_number !~ '^EMP-[0-9]{4}-[0-9]{5}$' LIMIT 5) t;
        RAISE WARNING 'WARNING: % employees have invalid format. Samples: %', invalid_count, sample_invalid;
    ELSE
        RAISE NOTICE 'SUCCESS: All employee numbers are in valid EMP-YYYY-##### format.';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK PROCEDURE (Run manually if needed)
-- ============================================================================
-- To rollback this migration:
--
-- 1. Restore original employee numbers:
--    UPDATE employee e
--    SET employee_number = b.original_employee_number
--    FROM employee_numbers_backup_v2026012308 b
--    WHERE e.id = b.id;
--
-- 2. Drop backup table:
--    DROP TABLE IF EXISTS employee_numbers_backup_v2026012308;
--
-- ============================================================================
