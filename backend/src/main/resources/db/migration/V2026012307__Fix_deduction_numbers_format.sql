-- V2026012307: Fix employee deduction numbers to use deduction type codes
-- ============================================================================
-- Problem: Existing deduction numbers were generated as DED-XXXX instead of
--          using the actual deduction type code (e.g., TAX-0007, LOAN-0012)
--
-- Solution:
-- 1. Create a backup table for rollback capability
-- 2. Join employee_deductions with deduction_types to get the correct code
-- 3. Update DED-XXXX → <CODE>-XXXXXX format
-- 4. Re-sequence deductions per deduction type code
-- 5. Provide rollback procedure
--
-- Format: <DEDUCTION_TYPE_CODE>-XXXX (e.g., TAX-0007, LOAN-0012, INS-0003)
-- ============================================================================

-- ============================================
-- STEP 1: Create backup table for rollback
-- ============================================
-- Store original deduction numbers before modification
CREATE TABLE IF NOT EXISTS employee_deductions_backup_v2026012307 (
    id UUID PRIMARY KEY,
    original_deduction_number VARCHAR(20),
    new_deduction_number VARCHAR(20),
    deduction_type_code VARCHAR(20),
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup existing deduction numbers that match DED-* pattern
INSERT INTO employee_deductions_backup_v2026012307 (id, original_deduction_number, deduction_type_code)
SELECT
    ed.id,
    ed.deduction_number,
    dt.code
FROM employee_deductions ed
LEFT JOIN deduction_types dt ON ed.deduction_type_id = dt.id
WHERE ed.deduction_number IS NOT NULL
  AND ed.deduction_number LIKE 'DED-%'
ON CONFLICT (id) DO UPDATE SET
    original_deduction_number = EXCLUDED.original_deduction_number,
    deduction_type_code = EXCLUDED.deduction_type_code,
    migrated_at = CURRENT_TIMESTAMP;

-- ============================================
-- STEP 2: Update deduction numbers to new format
-- ============================================
-- This CTE assigns new sequential numbers per deduction type code
-- Format: <CODE>-XXXX (4-digit, zero-padded)

WITH deduction_type_sequences AS (
    -- Get all deductions that need updating, with their new sequence numbers
    SELECT
        ed.id,
        ed.deduction_number as old_number,
        dt.code as type_code,
        ROW_NUMBER() OVER (
            PARTITION BY dt.code
            ORDER BY ed.created_at, ed.id
        ) as new_sequence
    FROM employee_deductions ed
    INNER JOIN deduction_types dt ON ed.deduction_type_id = dt.id
    WHERE ed.deduction_number IS NOT NULL
      AND ed.deduction_number LIKE 'DED-%'
      AND dt.code IS NOT NULL
),
-- Also handle deductions that already have CODE-XXXX format to get max sequence
existing_sequences AS (
    SELECT
        dt.code as type_code,
        COALESCE(MAX(
            CASE
                WHEN ed.deduction_number LIKE CONCAT(dt.code, '-%')
                     AND ed.deduction_number NOT LIKE 'DED-%'
                THEN CAST(SUBSTRING(ed.deduction_number FROM LENGTH(dt.code) + 2) AS INTEGER)
                ELSE 0
            END
        ), 0) as max_existing_seq
    FROM deduction_types dt
    LEFT JOIN employee_deductions ed ON ed.deduction_type_id = dt.id
    GROUP BY dt.code
)
UPDATE employee_deductions ed
SET deduction_number = dts.type_code || '-' || LPAD(
    (COALESCE(es.max_existing_seq, 0) + dts.new_sequence)::TEXT,
    6,
    '0'
)
FROM deduction_type_sequences dts
LEFT JOIN existing_sequences es ON es.type_code = dts.type_code
WHERE ed.id = dts.id;

-- Update backup table with new numbers
UPDATE employee_deductions_backup_v2026012307 b
SET new_deduction_number = ed.deduction_number
FROM employee_deductions ed
WHERE b.id = ed.id;

-- ============================================
-- STEP 3: Handle edge cases
-- ============================================

-- 3a: Handle deductions with NULL deduction_type_id (shouldn't happen, but be safe)
-- These will get a generic "UNK-" (Unknown) prefix
WITH unknown_deductions AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) as seq
    FROM employee_deductions
    WHERE deduction_number LIKE 'DED-%'
      AND deduction_type_id IS NULL
)
UPDATE employee_deductions ed
SET deduction_number = 'UNK-' || LPAD(ud.seq::TEXT, 6, '0')
FROM unknown_deductions ud
WHERE ed.id = ud.id;

-- 3b: Handle deductions with NULL deduction_number (assign based on type)
WITH null_deduction_numbers AS (
    SELECT
        ed.id,
        dt.code as type_code,
        ROW_NUMBER() OVER (
            PARTITION BY dt.code
            ORDER BY ed.created_at, ed.id
        ) as new_sequence
    FROM employee_deductions ed
    INNER JOIN deduction_types dt ON ed.deduction_type_id = dt.id
    WHERE ed.deduction_number IS NULL
      AND dt.code IS NOT NULL
),
max_sequences AS (
    SELECT
        dt.code as type_code,
        COALESCE(MAX(
            CASE
                WHEN ed.deduction_number LIKE CONCAT(dt.code, '-%')
                THEN CAST(SUBSTRING(ed.deduction_number FROM LENGTH(dt.code) + 2) AS INTEGER)
                ELSE 0
            END
        ), 0) as max_seq
    FROM deduction_types dt
    LEFT JOIN employee_deductions ed ON ed.deduction_type_id = dt.id
    GROUP BY dt.code
)
UPDATE employee_deductions ed
SET deduction_number = ndn.type_code || '-' || LPAD(
    (COALESCE(ms.max_seq, 0) + ndn.new_sequence)::TEXT,
    6,
    '0'
)
FROM null_deduction_numbers ndn
LEFT JOIN max_sequences ms ON ms.type_code = ndn.type_code
WHERE ed.id = ndn.id;

-- ============================================
-- STEP 4: Log migration results
-- ============================================
DO $$
DECLARE
    total_updated INTEGER;
    backup_count INTEGER;
    by_code_stats TEXT;
BEGIN
    -- Count updated records
    SELECT COUNT(*) INTO backup_count
    FROM employee_deductions_backup_v2026012307;

    -- Get stats by deduction type code
    SELECT STRING_AGG(
        code || ': ' || cnt,
        ', '
        ORDER BY code
    )
    INTO by_code_stats
    FROM (
        SELECT
            SPLIT_PART(deduction_number, '-', 1) as code,
            COUNT(*) as cnt
        FROM employee_deductions
        WHERE deduction_number IS NOT NULL
        GROUP BY SPLIT_PART(deduction_number, '-', 1)
    ) stats;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration V2026012307 Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Records backed up: %', backup_count;
    RAISE NOTICE 'Deduction counts by type code: %', COALESCE(by_code_stats, 'None');
    RAISE NOTICE 'Backup table: employee_deductions_backup_v2026012307';
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- STEP 5: Verify migration completed
-- ============================================
DO $$
DECLARE
    remaining_generic INTEGER;
BEGIN
    -- Check for any deduction numbers that don't match the expected pattern
    -- (should have a valid deduction type code prefix)
    SELECT COUNT(*) INTO remaining_generic
    FROM employee_deductions ed
    LEFT JOIN deduction_types dt ON ed.deduction_type_id = dt.id
    WHERE ed.deduction_number IS NOT NULL
      AND dt.code IS NOT NULL
      AND ed.deduction_number NOT LIKE CONCAT(dt.code, '-%');

    IF remaining_generic > 0 THEN
        RAISE WARNING 'WARNING: % records have mismatched deduction type code. Manual review may be needed.', remaining_generic;
    ELSE
        RAISE NOTICE 'SUCCESS: All deduction numbers now use their deduction type codes.';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK PROCEDURE (Run manually if needed)
-- ============================================================================
-- To rollback this migration:
--
-- 1. Restore original deduction numbers from backup:
--    UPDATE employee_deductions ed
--    SET deduction_number = b.original_deduction_number
--    FROM employee_deductions_backup_v2026012307 b
--    WHERE ed.id = b.id
--      AND b.original_deduction_number IS NOT NULL;
--
-- 2. Optionally drop the backup table (after verifying rollback):
--    DROP TABLE IF EXISTS employee_deductions_backup_v2026012307;
--
-- ============================================================================
