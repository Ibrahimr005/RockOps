-- V20260122_2: Fix loan date columns to be nullable
-- disbursement_date and first_payment_date should be nullable
-- as they are only set when the loan is actually disbursed

-- Make disbursement_date nullable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loans'
        AND column_name = 'disbursement_date'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE loans ALTER COLUMN disbursement_date DROP NOT NULL;
    END IF;
END $$;

-- Make first_payment_date nullable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loans'
        AND column_name = 'first_payment_date'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE loans ALTER COLUMN first_payment_date DROP NOT NULL;
    END IF;
END $$;
