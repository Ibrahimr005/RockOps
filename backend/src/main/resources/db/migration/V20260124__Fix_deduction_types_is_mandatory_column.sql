-- V20260124: Fix deduction_types is_mandatory, is_percentage, and type columns
-- These columns may have been added by JPA auto-DDL as NOT NULL
-- This migration ensures the columns exist with the correct constraints

-- ============================================================
-- FIX TYPE COLUMN (added by Hibernate auto-DDL but not in entity)
-- ============================================================
-- If type column exists and is NOT NULL, make it nullable with default
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'type'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE deduction_types ALTER COLUMN type DROP NOT NULL;
    END IF;
END $$;

-- Set a default value for type column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE deduction_types ALTER COLUMN type SET DEFAULT 'STANDARD';
        UPDATE deduction_types SET type = 'STANDARD' WHERE type IS NULL;
    END IF;
END $$;

-- ============================================================
-- FIX IS_MANDATORY COLUMN
-- ============================================================
-- Add is_mandatory column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'is_mandatory'
    ) THEN
        ALTER TABLE deduction_types ADD COLUMN is_mandatory BOOLEAN DEFAULT false;
    END IF;
END $$;

-- If is_mandatory exists but is NOT NULL, make it nullable and set default
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'is_mandatory'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE deduction_types ALTER COLUMN is_mandatory DROP NOT NULL;
    END IF;
END $$;

-- Set default value for is_mandatory
ALTER TABLE deduction_types ALTER COLUMN is_mandatory SET DEFAULT false;

-- Update any NULL values to false
UPDATE deduction_types SET is_mandatory = false WHERE is_mandatory IS NULL;

-- Add is_percentage column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'is_percentage'
    ) THEN
        ALTER TABLE deduction_types ADD COLUMN is_percentage BOOLEAN DEFAULT false;
    END IF;
END $$;

-- If is_percentage exists but is NOT NULL, make it nullable and set default
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deduction_types'
        AND column_name = 'is_percentage'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE deduction_types ALTER COLUMN is_percentage DROP NOT NULL;
    END IF;
END $$;

-- Set default value for is_percentage
ALTER TABLE deduction_types ALTER COLUMN is_percentage SET DEFAULT false;

-- Update any NULL values to false
UPDATE deduction_types SET is_percentage = false WHERE is_percentage IS NULL;
