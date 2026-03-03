-- V2026022201: Rename loanDate to loanEffectiveDate and add loanStartDate
-- Wrapped in existence check for fresh deploy compatibility

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans') THEN

        -- Step 1: Rename existing loan_date column to loan_effective_date (if old column exists)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'loan_date') THEN
            ALTER TABLE loans RENAME COLUMN loan_date TO loan_effective_date;
        END IF;

        -- Step 2: Add new loan_start_date column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'loan_start_date') THEN
            ALTER TABLE loans ADD COLUMN loan_start_date DATE;
        END IF;

        -- Step 3: Populate loan_start_date from first_payment_date where available
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'loan_effective_date') THEN
            UPDATE loans
            SET loan_start_date = COALESCE(first_payment_date, loan_effective_date)
            WHERE loan_start_date IS NULL;
        END IF;

        RAISE NOTICE 'V2026022201: Loan date fields migration completed.';
    ELSE
        RAISE NOTICE 'V2026022201: loans table not found. Skipping.';
    END IF;
END $$;
