-- V2026022201__Rename_loan_date_fields.sql
-- Rename loanDate to loanEffectiveDate and add loanStartDate

-- Step 1: Rename existing loan_date column to loan_effective_date
ALTER TABLE loans RENAME COLUMN loan_date TO loan_effective_date;

-- Step 2: Add new loan_start_date column
ALTER TABLE loans ADD COLUMN loan_start_date DATE;

-- Step 3: Populate loan_start_date from first_payment_date where available, else from loan_effective_date
UPDATE loans
SET loan_start_date = COALESCE(first_payment_date, loan_effective_date);

-- Step 4: Verify migration
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM loans WHERE loan_effective_date IS NULL AND loan_start_date IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Warning: % loans have NULL date fields', null_count;
    END IF;
END $$;
