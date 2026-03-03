-- =============================================
-- Demotion Request table
-- Status flow: PENDING → DEPT_HEAD_APPROVED → HR_APPROVED → APPLIED (or REJECTED)
-- =============================================

CREATE TABLE IF NOT EXISTS demotion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(20) UNIQUE,

    -- Employee reference
    employee_id UUID NOT NULL REFERENCES employee(id),

    -- Position change
    current_position_id UUID NOT NULL REFERENCES job_positions(id),
    new_position_id UUID NOT NULL REFERENCES job_positions(id),

    -- Grade change
    current_grade VARCHAR(50),
    new_grade VARCHAR(50),

    -- Salary change
    current_salary DECIMAL(12,2) NOT NULL,
    new_salary DECIMAL(12,2) NOT NULL,
    salary_reduction_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    salary_reduction_percentage DECIMAL(8,4) NOT NULL DEFAULT 0,

    -- Request details
    effective_date DATE,
    reason VARCHAR(2000) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    -- Approval steps (JSON array)
    approvals TEXT,

    -- Site reference
    site_id UUID NOT NULL REFERENCES site(id),

    -- Requester
    requested_by VARCHAR(255),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Department Head decision
    dept_head_approved_by VARCHAR(255),
    dept_head_decision_date TIMESTAMP,
    dept_head_comments VARCHAR(1000),
    dept_head_rejection_reason VARCHAR(1000),

    -- HR decision
    hr_approved_by VARCHAR(255),
    hr_decision_date TIMESTAMP,
    hr_comments VARCHAR(1000),
    hr_rejection_reason VARCHAR(1000),

    -- Application tracking
    applied_at TIMESTAMP,
    applied_by VARCHAR(255),

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demotion_requests_status ON demotion_requests(status);
CREATE INDEX IF NOT EXISTS idx_demotion_requests_employee_id ON demotion_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_demotion_requests_current_position ON demotion_requests(current_position_id);
CREATE INDEX IF NOT EXISTS idx_demotion_requests_new_position ON demotion_requests(new_position_id);
CREATE INDEX IF NOT EXISTS idx_demotion_requests_site_id ON demotion_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_demotion_requests_created_at ON demotion_requests(created_at);
