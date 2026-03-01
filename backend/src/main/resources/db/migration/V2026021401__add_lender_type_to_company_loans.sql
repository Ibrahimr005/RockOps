-- Migration: Add lender type support (Financial Institution OR Merchant) to company_loans
-- This allows a company loan to be linked to either a FinancialInstitution or a Merchant
-- Wrapped in existence checks for fresh deploy compatibility

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_loans') THEN

        -- Step 1: Add new columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_loans' AND column_name = 'lender_type') THEN
            ALTER TABLE company_loans ADD COLUMN lender_type VARCHAR(30) NOT NULL DEFAULT 'FINANCIAL_INSTITUTION';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_loans' AND column_name = 'merchant_id') THEN
            ALTER TABLE company_loans ADD COLUMN merchant_id UUID NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_loans' AND column_name = 'lender_name') THEN
            ALTER TABLE company_loans ADD COLUMN lender_name VARCHAR(255);
        END IF;

        -- Step 2: Make financial_institution_id nullable (was NOT NULL before)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_loans' AND column_name = 'financial_institution_id') THEN
            ALTER TABLE company_loans ALTER COLUMN financial_institution_id DROP NOT NULL;
        END IF;

        -- Step 3: Backfill lender_name from existing financial institutions
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_institutions') THEN
            UPDATE company_loans cl
            SET lender_name = fi.name
            FROM financial_institutions fi
            WHERE cl.financial_institution_id = fi.id
              AND cl.lender_name IS NULL;
        END IF;

        -- Step 4: Add foreign key constraint for merchant
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_company_loans_merchant') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant') THEN
                ALTER TABLE company_loans ADD CONSTRAINT fk_company_loans_merchant
                    FOREIGN KEY (merchant_id) REFERENCES merchant(id);
            END IF;
        END IF;

        -- Step 5: Add check constraint
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_lender_type_reference') THEN
            ALTER TABLE company_loans ADD CONSTRAINT chk_lender_type_reference CHECK (
                (lender_type = 'FINANCIAL_INSTITUTION' AND financial_institution_id IS NOT NULL)
                OR
                (lender_type = 'MERCHANT' AND merchant_id IS NOT NULL)
            );
        END IF;

        -- Step 6: Add indexes
        CREATE INDEX IF NOT EXISTS idx_company_loans_lender_type ON company_loans(lender_type);
        CREATE INDEX IF NOT EXISTS idx_company_loans_merchant_id ON company_loans(merchant_id);

        RAISE NOTICE 'V2026021401: company_loans lender type columns added successfully.';
    ELSE
        RAISE NOTICE 'V2026021401: company_loans table not found. Skipping (Hibernate will create it).';
    END IF;
END $$;
