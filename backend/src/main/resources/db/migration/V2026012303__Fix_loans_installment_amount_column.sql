-- V2026012303: Fix the installment_amount column in loans table
-- The database has installment_amount column but entity uses monthly_installment
-- Make installment_amount nullable to prevent NOT NULL constraint violations

-- Option 1: Make installment_amount nullable if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loans'
        AND column_name = 'installment_amount'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE loans ALTER COLUMN installment_amount DROP NOT NULL;
        RAISE NOTICE 'Made installment_amount column nullable in loans table';
    END IF;
END $$;

-- Option 2: Copy monthly_installment to installment_amount if both exist
-- This ensures data consistency
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loans' AND column_name = 'installment_amount'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loans' AND column_name = 'monthly_installment'
    ) THEN
        -- Update installment_amount from monthly_installment where installment_amount is null
        UPDATE loans
        SET installment_amount = monthly_installment
        WHERE installment_amount IS NULL AND monthly_installment IS NOT NULL;
        RAISE NOTICE 'Synced installment_amount from monthly_installment';
    END IF;
END $$;

-- Also fix end_date if still causing issues (make nullable)
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
