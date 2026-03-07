-- V2026030401: Fix deduction_types schema for successful deployment
-- =================================================================
-- Fixes two issues:
-- 1. The 'type' column may still exist with NOT NULL constraint on existing
--    databases, causing inserts to fail since the JPA entity has no 'type' field.
-- 2. The 'site_id' column is NOT NULL in the bootstrap migration, but system
--    deduction types (TAX, LOAN, etc.) have no site — they are global.
-- =================================================================

-- 1. Drop the 'type' column if it still exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'type'
    ) THEN
        -- DROP COLUMN CASCADE removes the column and any constraints that
        -- depend solely on it (CHECK, NOT NULL, etc.) without touching the PK
        -- or FK constraints from other tables.
        ALTER TABLE deduction_types DROP COLUMN IF EXISTS type CASCADE;
        RAISE NOTICE 'Dropped type column from deduction_types';
    ELSE
        RAISE NOTICE 'type column does not exist — nothing to drop';
    END IF;
END $$;

-- 2. Make site_id nullable (system deduction types have no site)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'site_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE deduction_types ALTER COLUMN site_id DROP NOT NULL;
        RAISE NOTICE 'Made site_id nullable on deduction_types';
    END IF;
END $$;

-- 3. Ensure all required columns exist (entity fields missing from bootstrap)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deduction_types' AND column_name = 'is_system_defined') THEN
        ALTER TABLE deduction_types ADD COLUMN is_system_defined BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deduction_types' AND column_name = 'is_taxable') THEN
        ALTER TABLE deduction_types ADD COLUMN is_taxable BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deduction_types' AND column_name = 'show_on_payslip') THEN
        ALTER TABLE deduction_types ADD COLUMN show_on_payslip BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deduction_types' AND column_name = 'is_percentage') THEN
        ALTER TABLE deduction_types ADD COLUMN is_percentage BOOLEAN DEFAULT false;
    END IF;
END $$;
