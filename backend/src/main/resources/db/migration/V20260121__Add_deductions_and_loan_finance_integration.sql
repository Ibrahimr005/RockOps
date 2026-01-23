-- ============================================================
-- V20260121__Add_deductions_and_loan_finance_integration.sql
-- Add deduction types, employee deductions, and loan finance integration
-- ============================================================

-- ============================================================
-- 1. DEDUCTION TYPES TABLE
-- Configurable deduction types that can be created by HR/Admin
-- ============================================================
CREATE TABLE IF NOT EXISTS deduction_types (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50) NOT NULL,
    is_system_defined BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_taxable BOOLEAN NOT NULL DEFAULT FALSE,
    show_on_payslip BOOLEAN NOT NULL DEFAULT TRUE,
    site_id UUID,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,

    CONSTRAINT uk_deduction_types_code UNIQUE (code),
    CONSTRAINT uk_deduction_types_name_site UNIQUE (name, site_id),
    CONSTRAINT fk_deduction_types_site FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Index for faster lookups
CREATE INDEX idx_deduction_types_category ON deduction_types(category);
CREATE INDEX idx_deduction_types_active ON deduction_types(is_active);
CREATE INDEX idx_deduction_types_site ON deduction_types(site_id);

-- ============================================================
-- 2. EMPLOYEE DEDUCTIONS TABLE
-- Configured recurring deductions for individual employees
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_deductions (
    id UUID PRIMARY KEY,
    deduction_number VARCHAR(20) NOT NULL,
    employee_id UUID NOT NULL,
    deduction_type_id UUID NOT NULL,
    custom_name VARCHAR(100),
    description VARCHAR(500),
    amount DECIMAL(15, 2) NOT NULL,
    calculation_method VARCHAR(50) NOT NULL DEFAULT 'FIXED_AMOUNT',
    percentage_value DECIMAL(5, 2),
    max_amount DECIMAL(15, 2),
    frequency VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    reference_id UUID,
    reference_type VARCHAR(50),
    total_deducted DECIMAL(15, 2) DEFAULT 0,
    deduction_count INTEGER DEFAULT 0,
    last_deduction_date DATE,
    priority INTEGER NOT NULL DEFAULT 100,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,

    CONSTRAINT uk_employee_deductions_number UNIQUE (deduction_number),
    CONSTRAINT fk_employee_deductions_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_employee_deductions_type FOREIGN KEY (deduction_type_id) REFERENCES deduction_types(id)
);

-- Indexes for faster lookups
CREATE INDEX idx_employee_deductions_employee ON employee_deductions(employee_id);
CREATE INDEX idx_employee_deductions_type ON employee_deductions(deduction_type_id);
CREATE INDEX idx_employee_deductions_active ON employee_deductions(is_active);
CREATE INDEX idx_employee_deductions_dates ON employee_deductions(effective_start_date, effective_end_date);
CREATE INDEX idx_employee_deductions_reference ON employee_deductions(reference_id, reference_type);

-- ============================================================
-- 3. ADD COLUMNS TO LOANS TABLE
-- Add loan number and finance integration fields
-- ============================================================

-- Add loan_number column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loans' AND column_name = 'loan_number') THEN
        ALTER TABLE loans ADD COLUMN loan_number VARCHAR(30);
    END IF;
END $$;

-- Add HR approval tracking columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loans' AND column_name = 'hr_approved_by') THEN
        ALTER TABLE loans ADD COLUMN hr_approved_by VARCHAR(100);
        ALTER TABLE loans ADD COLUMN hr_approved_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN hr_rejected_by VARCHAR(100);
        ALTER TABLE loans ADD COLUMN hr_rejected_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN hr_rejection_reason VARCHAR(500);
    END IF;
END $$;

-- Add Finance integration columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loans' AND column_name = 'finance_request_id') THEN
        ALTER TABLE loans ADD COLUMN finance_request_id UUID;
        ALTER TABLE loans ADD COLUMN finance_request_number VARCHAR(30);
        ALTER TABLE loans ADD COLUMN finance_status VARCHAR(50);
        ALTER TABLE loans ADD COLUMN finance_approved_by VARCHAR(100);
        ALTER TABLE loans ADD COLUMN finance_approved_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN finance_rejected_by VARCHAR(100);
        ALTER TABLE loans ADD COLUMN finance_rejected_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN finance_rejection_reason VARCHAR(500);
        ALTER TABLE loans ADD COLUMN finance_notes VARCHAR(1000);
        ALTER TABLE loans ADD COLUMN finance_approved_installments INTEGER;
        ALTER TABLE loans ADD COLUMN finance_approved_amount DECIMAL(15, 2);
    END IF;
END $$;

-- Add payment source tracking columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loans' AND column_name = 'payment_source_type') THEN
        ALTER TABLE loans ADD COLUMN payment_source_type VARCHAR(50);
        ALTER TABLE loans ADD COLUMN payment_source_id UUID;
        ALTER TABLE loans ADD COLUMN payment_source_name VARCHAR(100);
        ALTER TABLE loans ADD COLUMN disbursed_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN disbursed_by VARCHAR(100);
    END IF;
END $$;

-- Generate loan numbers for existing loans that don't have one
DO $$
DECLARE
    loan_rec RECORD;
    seq_num INTEGER := 1;
    loan_year INTEGER;
BEGIN
    FOR loan_rec IN
        SELECT id, EXTRACT(YEAR FROM loan_date) as loan_year
        FROM loans
        WHERE loan_number IS NULL
        ORDER BY loan_date ASC
    LOOP
        loan_year := COALESCE(loan_rec.loan_year, EXTRACT(YEAR FROM CURRENT_DATE));
        UPDATE loans
        SET loan_number = 'LOAN-' || loan_year || '-' || LPAD(seq_num::TEXT, 6, '0')
        WHERE id = loan_rec.id;
        seq_num := seq_num + 1;
    END LOOP;
END $$;

-- Make loan_number NOT NULL and unique after populating existing records
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_loans_loan_number') THEN
        ALTER TABLE loans ALTER COLUMN loan_number SET NOT NULL;
        ALTER TABLE loans ADD CONSTRAINT uk_loans_loan_number UNIQUE (loan_number);
    END IF;
END $$;

-- Add index on loan_number
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON loans(loan_number);
CREATE INDEX IF NOT EXISTS idx_loans_finance_status ON loans(finance_status);

-- ============================================================
-- 4. LOAN FINANCE REQUESTS TABLE
-- Tracks loan requests sent to Finance for approval
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_finance_requests (
    id UUID PRIMARY KEY,
    request_number VARCHAR(30) NOT NULL,
    loan_id UUID NOT NULL,

    -- Employee snapshot
    employee_id UUID NOT NULL,
    employee_name VARCHAR(200) NOT NULL,
    employee_number VARCHAR(50),
    department_name VARCHAR(100),
    job_position_name VARCHAR(100),
    employee_monthly_salary DECIMAL(15, 2),

    -- Loan snapshot
    loan_number VARCHAR(30) NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    requested_installments INTEGER NOT NULL,
    requested_monthly_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2),
    loan_purpose VARCHAR(500),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',

    -- Finance decision
    approved_installments INTEGER,
    approved_monthly_amount DECIMAL(15, 2),
    first_deduction_date DATE,
    deduction_start_payroll_date DATE,
    finance_notes VARCHAR(1000),

    -- Payment source
    payment_source_type VARCHAR(50),
    payment_source_id UUID,
    payment_source_name VARCHAR(100),

    -- Requester info
    requested_by_user_id UUID,
    requested_by_user_name VARCHAR(100),
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Reviewer info
    reviewed_by_user_id UUID,
    reviewed_by_user_name VARCHAR(100),
    reviewed_at TIMESTAMP,

    -- Approval info
    approved_by_user_id UUID,
    approved_by_user_name VARCHAR(100),
    approved_at TIMESTAMP,
    approval_notes VARCHAR(1000),

    -- Rejection info
    rejected_by_user_id UUID,
    rejected_by_user_name VARCHAR(100),
    rejected_at TIMESTAMP,
    rejection_reason VARCHAR(1000),

    -- Disbursement info
    disbursed_at TIMESTAMP,
    disbursed_by_user_id UUID,
    disbursed_by_user_name VARCHAR(100),
    disbursement_reference VARCHAR(100),

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT uk_loan_finance_requests_number UNIQUE (request_number),
    CONSTRAINT uk_loan_finance_requests_loan UNIQUE (loan_id),
    CONSTRAINT fk_loan_finance_requests_loan FOREIGN KEY (loan_id) REFERENCES loans(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loan_finance_requests_status ON loan_finance_requests(status);
CREATE INDEX IF NOT EXISTS idx_loan_finance_requests_employee ON loan_finance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_finance_requests_requested_at ON loan_finance_requests(requested_at);

-- ============================================================
-- 5. LOAN FINANCE REQUEST STATUS HISTORY TABLE
-- Tracks status changes for audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_finance_request_status_history (
    id UUID PRIMARY KEY,
    loan_finance_request_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_by_user_id UUID,
    changed_by_user_name VARCHAR(100),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(1000),

    CONSTRAINT fk_loan_finance_request_history_request
        FOREIGN KEY (loan_finance_request_id) REFERENCES loan_finance_requests(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_loan_finance_request_history_request
    ON loan_finance_request_status_history(loan_finance_request_id);

-- ============================================================
-- 6. INSERT SYSTEM-DEFINED DEDUCTION TYPES
-- ============================================================
INSERT INTO deduction_types (id, code, name, description, category, is_system_defined, is_active, is_taxable, show_on_payslip, created_by, created_at)
VALUES
    (gen_random_uuid(), 'TAX', 'Income Tax', 'Statutory income tax deduction', 'STATUTORY', true, true, true, true, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SSEC', 'Social Security', 'Social security contribution', 'STATUTORY', true, true, false, true, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'HLTH', 'Health Insurance', 'Health insurance premium', 'BENEFITS', true, true, false, true, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LIFE', 'Life Insurance', 'Life insurance premium', 'BENEFITS', true, true, false, true, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PENS', 'Pension', 'Pension contribution', 'BENEFITS', true, true, false, true, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LOAN', 'Loan Repayment', 'Employee loan repayment', 'LOANS', true, true, false, true, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'ADVS', 'Salary Advance', 'Salary advance deduction', 'LOANS', true, true, false, true, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'UNON', 'Union Dues', 'Trade union membership dues', 'VOLUNTARY', true, true, false, true, 'SYSTEM', CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================
COMMENT ON TABLE deduction_types IS 'Configurable deduction types (Tax, Insurance, Pension, etc.)';
COMMENT ON TABLE employee_deductions IS 'Configured recurring deductions for individual employees';
COMMENT ON TABLE loan_finance_requests IS 'Loan requests sent to Finance for approval and disbursement';
COMMENT ON TABLE loan_finance_request_status_history IS 'Audit trail for loan finance request status changes';

COMMENT ON COLUMN loans.loan_number IS 'Human-readable loan identifier (e.g., LOAN-2024-000001)';
COMMENT ON COLUMN loans.finance_status IS 'Finance approval status (NOT_SUBMITTED, PENDING, APPROVED, REJECTED)';
COMMENT ON COLUMN loans.finance_approved_installments IS 'Number of payroll cycles for deduction (decided by Finance)';
COMMENT ON COLUMN loans.finance_approved_amount IS 'Monthly deduction amount (decided by Finance)';

COMMENT ON COLUMN employee_deductions.calculation_method IS 'How to calculate: FIXED_AMOUNT, PERCENTAGE_OF_GROSS, PERCENTAGE_OF_BASIC, PERCENTAGE_OF_NET';
COMMENT ON COLUMN employee_deductions.frequency IS 'When to apply: PER_PAYROLL, MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL, ONE_TIME';
COMMENT ON COLUMN employee_deductions.reference_id IS 'Reference to source entity (e.g., loan ID for loan deductions)';
