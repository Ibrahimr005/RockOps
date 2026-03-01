-- V20260125_2: Ensure core tables exist for fresh deploy
-- ============================================================================
-- On a fresh deploy, Flyway runs BEFORE Hibernate (ddl-auto=update).
-- V20260125 drops payroll/loan/deduction tables and deletes Flyway history,
-- expecting them to be recreated. But on a fresh deploy in a single Flyway
-- session, deleted history entries don't trigger re-runs.
--
-- This migration creates all tables that subsequent migrations depend on,
-- using CREATE TABLE IF NOT EXISTS so it's a no-op on existing databases.
-- ============================================================================

-- ============================================
-- 1. SITE table (referenced by many FKs)
-- ============================================
CREATE TABLE IF NOT EXISTS site (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    physical_address VARCHAR(255),
    company_address VARCHAR(255),
    site_no VARCHAR(255) UNIQUE,
    creation_date DATE,
    photo_url VARCHAR(500),
    total_balance DOUBLE PRECISION DEFAULT 0.0,
    balance_updated_at TIMESTAMP
);

-- ============================================
-- 2. EMPLOYEES table (referenced by payroll FKs)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    employee_number VARCHAR(20) UNIQUE,
    site_id UUID REFERENCES site(id),
    status VARCHAR(50),
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Also ensure singular 'employee' table alias exists (some FKs use it)
-- Note: The entity uses @Table(name = "employee") - check which name is used
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee') THEN
        -- If 'employees' exists but 'employee' doesn't, create a view or just skip
        -- The JPA entity uses 'employee' table name
        CREATE TABLE employee (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            email VARCHAR(255),
            employee_number VARCHAR(20) UNIQUE,
            site_id UUID REFERENCES site(id),
            status VARCHAR(50),
            hire_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- ============================================
-- 3. SITES table alias (some migrations use 'sites')
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    physical_address VARCHAR(255),
    company_address VARCHAR(255),
    site_no VARCHAR(255),
    creation_date DATE,
    photo_url VARCHAR(500),
    total_balance DOUBLE PRECISION DEFAULT 0.0,
    balance_updated_at TIMESTAMP
);

-- ============================================
-- 4. PAYROLLS table
-- ============================================
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_number VARCHAR(50) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PUBLIC_HOLIDAYS_REVIEW',
    total_gross_amount NUMERIC(15,2) DEFAULT 0,
    total_deductions NUMERIC(15,2) DEFAULT 0,
    total_net_amount NUMERIC(15,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    attendance_imported BOOLEAN NOT NULL DEFAULT false,
    attendance_import_count INTEGER DEFAULT 0,
    last_attendance_import_at TIMESTAMP,
    attendance_finalized BOOLEAN NOT NULL DEFAULT false,
    attendance_finalized_by VARCHAR(100),
    attendance_finalized_at TIMESTAMP,
    hr_notification_sent BOOLEAN NOT NULL DEFAULT false,
    hr_notification_sent_at TIMESTAMP,
    attendance_summary TEXT,
    override_continuity BOOLEAN DEFAULT false,
    continuity_override_reason VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    locked_at TIMESTAMP,
    locked_by VARCHAR(100),
    paid_at TIMESTAMP,
    paid_by VARCHAR(100),
    sent_to_finance_at TIMESTAMP,
    sent_to_finance_by VARCHAR(100),
    payment_source_type VARCHAR(50),
    payment_source_id UUID,
    payment_source_name VARCHAR(200),
    finance_reviewed_at TIMESTAMP,
    finance_reviewed_by VARCHAR(100),
    finance_notes TEXT,
    leave_processed BOOLEAN DEFAULT false,
    leave_finalized BOOLEAN DEFAULT false,
    last_leave_processed_at TIMESTAMP,
    leave_finalized_by VARCHAR(100),
    leave_finalized_at TIMESTAMP,
    leave_hr_notification_sent BOOLEAN DEFAULT false,
    leave_hr_notification_sent_at TIMESTAMP,
    leave_summary TEXT,
    overtime_processed BOOLEAN DEFAULT false,
    overtime_finalized BOOLEAN DEFAULT false,
    last_overtime_processed_at TIMESTAMP,
    overtime_finalized_by VARCHAR(100),
    overtime_finalized_at TIMESTAMP,
    overtime_hr_notification_sent BOOLEAN DEFAULT false,
    overtime_hr_notification_sent_at TIMESTAMP,
    overtime_summary TEXT,
    bonus_processed BOOLEAN DEFAULT false,
    bonus_finalized BOOLEAN DEFAULT false,
    last_bonus_processed_at TIMESTAMP,
    bonus_finalized_by VARCHAR(100),
    bonus_finalized_at TIMESTAMP,
    bonus_summary TEXT,
    deduction_processed BOOLEAN DEFAULT false,
    deduction_finalized BOOLEAN DEFAULT false,
    last_deduction_processed_at TIMESTAMP,
    deduction_finalized_by VARCHAR(100),
    deduction_finalized_at TIMESTAMP,
    deduction_hr_notification_sent BOOLEAN DEFAULT false,
    deduction_hr_notification_sent_at TIMESTAMP,
    deduction_summary TEXT,
    version BIGINT DEFAULT 0
);

-- ============================================
-- 5. EMPLOYEE_PAYROLLS table
-- ============================================
CREATE TABLE IF NOT EXISTS employee_payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_payroll_number VARCHAR(50) UNIQUE,
    payroll_id UUID NOT NULL REFERENCES payrolls(id),
    employee_id UUID NOT NULL,
    employee_name VARCHAR(200) NOT NULL DEFAULT '',
    job_position_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    job_position_name VARCHAR(200),
    department_name VARCHAR(200),
    contract_type VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME',
    monthly_base_salary NUMERIC(15,2),
    daily_rate NUMERIC(10,2),
    hourly_rate NUMERIC(10,2),
    absent_deduction NUMERIC(10,2),
    late_deduction NUMERIC(10,2),
    late_forgiveness_minutes INTEGER,
    late_forgiveness_count_per_quarter INTEGER,
    leave_deduction NUMERIC(10,2),
    gross_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_working_days INTEGER,
    attended_days INTEGER,
    absent_days INTEGER,
    late_days INTEGER,
    forgiven_late_days INTEGER,
    charged_late_days INTEGER,
    excess_leave_days INTEGER,
    total_worked_hours NUMERIC(10,2),
    overtime_hours NUMERIC(10,2),
    overtime_pay NUMERIC(15,2) DEFAULT 0,
    bonus_amount NUMERIC(15,2) DEFAULT 0,
    absence_deduction_amount NUMERIC(15,2) DEFAULT 0,
    late_deduction_amount NUMERIC(15,2) DEFAULT 0,
    leave_deduction_amount NUMERIC(15,2) DEFAULT 0,
    loan_deduction_amount NUMERIC(15,2) DEFAULT 0,
    other_deduction_amount NUMERIC(15,2) DEFAULT 0,
    calculated_at TIMESTAMP,
    payment_type_id UUID,
    payment_type_code VARCHAR(50),
    payment_type_name VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_holder_name VARCHAR(200),
    wallet_number VARCHAR(50),
    payroll_batch_id UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT uq_emp_payroll_composite UNIQUE (payroll_id, employee_id)
);

-- ============================================
-- 6. LOANS table (payroll loans)
-- ============================================
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_number VARCHAR(30) UNIQUE,
    employee_id UUID NOT NULL,
    loan_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(15,2),
    installment_months INTEGER NOT NULL DEFAULT 1,
    monthly_installment NUMERIC(10,2) NOT NULL DEFAULT 0,
    installment_amount NUMERIC(10,2),
    interest_rate NUMERIC(5,2),
    loan_effective_date DATE,
    loan_start_date DATE,
    disbursement_date DATE,
    first_payment_date DATE,
    end_date DATE,
    last_payment_date DATE,
    completion_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    purpose VARCHAR(500),
    notes VARCHAR(1000),
    hr_approved_by VARCHAR(100),
    hr_approved_at TIMESTAMP,
    hr_rejected_by VARCHAR(100),
    hr_rejected_at TIMESTAMP,
    hr_rejection_reason VARCHAR(500),
    finance_request_id UUID,
    finance_request_number VARCHAR(30),
    finance_status VARCHAR(50),
    finance_approved_by VARCHAR(100),
    finance_approved_at TIMESTAMP,
    finance_rejected_by VARCHAR(100),
    finance_rejected_at TIMESTAMP,
    finance_rejection_reason VARCHAR(500),
    finance_notes VARCHAR(1000),
    finance_approved_installments INTEGER,
    finance_approved_amount NUMERIC(15,2),
    payment_source_type VARCHAR(50),
    payment_source_id UUID,
    payment_source_name VARCHAR(100),
    disbursed_at TIMESTAMP,
    disbursed_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    rejected_by VARCHAR(100),
    rejected_at TIMESTAMP,
    rejection_reason VARCHAR(500),
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

-- ============================================
-- 7. DEDUCTION_TYPES table
-- ============================================
CREATE TABLE IF NOT EXISTS deduction_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    is_mandatory BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    site_id UUID NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT uq_deduction_type_code_site UNIQUE (code, site_id)
);

-- ============================================
-- 8. EMPLOYEE_DEDUCTIONS table
-- ============================================
CREATE TABLE IF NOT EXISTS employee_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deduction_number VARCHAR(20),
    employee_id UUID NOT NULL,
    deduction_type_id UUID REFERENCES deduction_types(id),
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    effective_start_date DATE,
    effective_end_date DATE,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

-- ============================================
-- 9. COMPANY_LOANS table (finance module)
-- ============================================
CREATE TABLE IF NOT EXISTS company_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_number VARCHAR(50) UNIQUE,
    financial_institution_id UUID,
    lender_type VARCHAR(30) NOT NULL DEFAULT 'FINANCIAL_INSTITUTION',
    merchant_id UUID,
    lender_name VARCHAR(255),
    loan_type VARCHAR(50) NOT NULL DEFAULT 'TERM',
    principal_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining_principal NUMERIC(15,2) NOT NULL DEFAULT 0,
    interest_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
    interest_type VARCHAR(20) NOT NULL DEFAULT 'FIXED',
    variable_rate_base VARCHAR(100),
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    disbursement_date DATE,
    start_date DATE,
    maturity_date DATE,
    term_months INTEGER NOT NULL DEFAULT 0,
    total_installments INTEGER NOT NULL DEFAULT 0,
    disbursed_to_account_id UUID,
    disbursed_to_account_type VARCHAR(30),
    disbursed_to_account_name VARCHAR(255),
    purpose TEXT,
    collateral TEXT,
    guarantor VARCHAR(255),
    contract_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    total_interest_paid NUMERIC(15,2) DEFAULT 0,
    total_principal_paid NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- ============================================
-- 10. MERCHANT table (referenced by company_loans FK)
-- ============================================
CREATE TABLE IF NOT EXISTS merchant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    contact_person_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. FINANCIAL_INSTITUTIONS table (referenced by company_loans)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- ============================================
-- 12. PAYMENT_REQUESTS table (referenced by payroll_batches)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13. Create indexes for new tables
-- ============================================
CREATE INDEX IF NOT EXISTS idx_payroll_dates ON payrolls(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payrolls(status);
CREATE INDEX IF NOT EXISTS idx_emp_payroll_employee ON employee_payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_payroll_payroll ON employee_payrolls(payroll_id);
CREATE INDEX IF NOT EXISTS idx_loans_employee ON loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_deduction_types_site ON deduction_types(site_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee ON employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_type ON employee_deductions(deduction_type_id);

RAISE NOTICE 'V20260125_2: Core tables ensured for fresh deploy compatibility.';
