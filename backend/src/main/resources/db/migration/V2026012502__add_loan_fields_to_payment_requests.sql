-- Add loan-related columns to payment_requests table

ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS loan_installment_id UUID;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS financial_institution_id UUID;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS institution_name VARCHAR(255);
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS institution_account_number VARCHAR(100);
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS institution_bank_name VARCHAR(255);
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS institution_contact_person VARCHAR(255);
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS institution_contact_phone VARCHAR(50);
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS institution_contact_email VARCHAR(255);

-- Add indexes for loan payment lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_loan_installment ON payment_requests(loan_installment_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_financial_institution ON payment_requests(financial_institution_id);
