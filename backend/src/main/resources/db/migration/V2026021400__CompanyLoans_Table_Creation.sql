-- Migration: Create loan-related tables (financial_institutions, company_loans, loan_installments)

-- Step 1: Create financial_institutions table
CREATE TABLE IF NOT EXISTS financial_institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(100),
    address VARCHAR(500),
    city VARCHAR(100),
    country VARCHAR(100),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    contact_person_name VARCHAR(255),
    contact_person_phone VARCHAR(50),
    contact_person_email VARCHAR(255),
    payment_bank_name VARCHAR(255),
    payment_account_number VARCHAR(100),
    payment_iban VARCHAR(50),
    payment_swift_code VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP
);

-- Step 2: Create company_loans table
CREATE TABLE IF NOT EXISTS company_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_number VARCHAR(50) NOT NULL UNIQUE,
    financial_institution_id UUID NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL,
    remaining_principal NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(6, 3) NOT NULL,
    interest_type VARCHAR(20) NOT NULL,
    variable_rate_base VARCHAR(100),
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    disbursement_date DATE NOT NULL,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    term_months INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    disbursed_to_account_id UUID NOT NULL,
    disbursed_to_account_type VARCHAR(30) NOT NULL,
    disbursed_to_account_name VARCHAR(255),
    purpose TEXT,
    collateral TEXT,
    guarantor VARCHAR(255),
    contract_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    total_interest_paid NUMERIC(15, 2) DEFAULT 0,
    total_principal_paid NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_company_loans_financial_institution
        FOREIGN KEY (financial_institution_id) REFERENCES financial_institutions(id)
);

-- Step 3: Create loan_installments table
CREATE TABLE IF NOT EXISTS loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_loan_id UUID NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL,
    interest_amount NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    remaining_amount NUMERIC(15, 2) NOT NULL,
    payment_request_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_loan_installments_company_loan
        FOREIGN KEY (company_loan_id) REFERENCES company_loans(id)
);

-- Step 4: Add indexes
CREATE INDEX IF NOT EXISTS idx_company_loans_financial_institution ON company_loans(financial_institution_id);
CREATE INDEX IF NOT EXISTS idx_company_loans_status ON company_loans(status);
CREATE INDEX IF NOT EXISTS idx_company_loans_loan_number ON company_loans(loan_number);
CREATE INDEX IF NOT EXISTS idx_loan_installments_company_loan ON loan_installments(company_loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_status ON loan_installments(status);
CREATE INDEX IF NOT EXISTS idx_loan_installments_due_date ON loan_installments(due_date);