-- Migration: Add lender type support (Financial Institution OR Merchant) to company_loans
-- This allows a company loan to be linked to either a FinancialInstitution or a Merchant

-- Step 1: Add new columns
ALTER TABLE company_loans
    ADD COLUMN lender_type VARCHAR(30) NOT NULL DEFAULT 'FINANCIAL_INSTITUTION';

ALTER TABLE company_loans
    ADD COLUMN merchant_id UUID NULL;

ALTER TABLE company_loans
    ADD COLUMN lender_name VARCHAR(255);

-- Step 2: Make financial_institution_id nullable (was NOT NULL before)
ALTER TABLE company_loans
    ALTER COLUMN financial_institution_id DROP NOT NULL;

-- Step 3: Backfill lender_name from existing financial institutions
UPDATE company_loans cl
SET lender_name = fi.name
    FROM financial_institutions fi
WHERE cl.financial_institution_id = fi.id
  AND cl.lender_name IS NULL;

-- Step 4: Add foreign key constraint for merchant
ALTER TABLE company_loans
    ADD CONSTRAINT fk_company_loans_merchant
        FOREIGN KEY (merchant_id) REFERENCES merchant(id);

-- Step 5: Add check constraint — must have one of the two set based on lender_type
ALTER TABLE company_loans
    ADD CONSTRAINT chk_lender_type_reference CHECK (
        (lender_type = 'FINANCIAL_INSTITUTION' AND financial_institution_id IS NOT NULL)
            OR
        (lender_type = 'MERCHANT' AND merchant_id IS NOT NULL)
        );

-- Step 6: Add index on the new columns
CREATE INDEX idx_company_loans_lender_type ON company_loans(lender_type);
CREATE INDEX idx_company_loans_merchant_id ON company_loans(merchant_id);