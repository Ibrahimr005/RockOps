-- =====================================================
-- V2026022801: Add salary_increase_requests and salary_history tables
-- Salary Increase Request with two-tier approval (HR → Finance)
-- =====================================================

-- 1. Create salary_increase_requests table
CREATE TABLE IF NOT EXISTS salary_increase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(20) UNIQUE NOT NULL,
    request_type VARCHAR(30) NOT NULL, -- EMPLOYEE_LEVEL or POSITION_LEVEL

    -- Employee and position references
    employee_id UUID NOT NULL REFERENCES employee(id),
    job_position_id UUID REFERENCES job_positions(id),
    site_id UUID NOT NULL REFERENCES site(id),

    -- Salary details
    current_salary DECIMAL(12, 2) NOT NULL,
    requested_salary DECIMAL(12, 2) NOT NULL,
    increase_amount DECIMAL(12, 2) NOT NULL,
    increase_percentage DECIMAL(8, 4) NOT NULL,
    effective_date DATE,

    -- Request details
    reason VARCHAR(2000) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_HR',

    -- HR decision
    hr_approved_by VARCHAR(255),
    hr_decision_date TIMESTAMP,
    hr_comments VARCHAR(1000),
    hr_rejection_reason VARCHAR(1000),

    -- Finance decision
    finance_approved_by VARCHAR(255),
    finance_decision_date TIMESTAMP,
    finance_comments VARCHAR(1000),
    finance_rejection_reason VARCHAR(1000),

    -- Application tracking
    applied_at TIMESTAMP,
    applied_by VARCHAR(255),

    -- Audit
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create salary_history table
CREATE TABLE IF NOT EXISTS salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee(id),
    previous_salary DECIMAL(12, 2) NOT NULL,
    new_salary DECIMAL(12, 2) NOT NULL,
    change_type VARCHAR(30) NOT NULL, -- EMPLOYEE_INCREASE, POSITION_INCREASE, PROMOTION, MANUAL
    change_reason VARCHAR(1000),
    reference_id UUID, -- links to salary_increase_request or promotion_request
    reference_type VARCHAR(50), -- SALARY_INCREASE_REQUEST, PROMOTION_REQUEST
    effective_date DATE,
    changed_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Indexes for salary_increase_requests
CREATE INDEX IF NOT EXISTS idx_sir_status ON salary_increase_requests(status);
CREATE INDEX IF NOT EXISTS idx_sir_employee_id ON salary_increase_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_sir_job_position_id ON salary_increase_requests(job_position_id);
CREATE INDEX IF NOT EXISTS idx_sir_site_id ON salary_increase_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_sir_request_type ON salary_increase_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_sir_created_at ON salary_increase_requests(created_at);

-- 4. Indexes for salary_history
CREATE INDEX IF NOT EXISTS idx_sh_employee_id ON salary_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_sh_reference_id ON salary_history(reference_id);
CREATE INDEX IF NOT EXISTS idx_sh_change_type ON salary_history(change_type);
CREATE INDEX IF NOT EXISTS idx_sh_created_at ON salary_history(created_at);
