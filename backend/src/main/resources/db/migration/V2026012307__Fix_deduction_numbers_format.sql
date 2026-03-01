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
--
-- NOTE: This migration is wrapped in existence checks because V20260125
--       drops the employee_deductions table and deletes earlier migration
--       history. On a fresh deploy, the table may not exist yet when this
--       migration runs. It will be recreated on the next startup.
-- ============================================================================

DO $$
BEGIN
    -- Only proceed if employee_deductions table exists AND has the deduction_number column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee_deductions'
        AND column_name = 'deduction_number'
    ) THEN

        -- ============================================
        -- STEP 1: Create backup table for rollback
        -- ============================================
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
        WITH deduction_type_sequences AS (
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

        -- 3a: Handle deductions with NULL deduction_type_id
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

        RAISE NOTICE 'Migration V2026012307: Deduction numbers updated successfully.';
    ELSE
        RAISE NOTICE 'Migration V2026012307: employee_deductions table or deduction_number column not found. Skipping (tables will be recreated on next startup).';
    END IF;
END $$;
