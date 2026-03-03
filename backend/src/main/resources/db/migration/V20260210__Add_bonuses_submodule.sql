-- =============================================
-- Migration: Add Bonuses Submodule
-- Description: Creates bonus_types and bonuses tables,
--   adds bonus fields to employee_payrolls and payrolls,
--   updates payroll status constraint to include BONUS_REVIEW
-- =============================================

-- =============================================
-- 1. Create bonus_types table
-- =============================================
CREATE TABLE IF NOT EXISTS bonus_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    site_id UUID NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_bonus_type_site FOREIGN KEY (site_id) REFERENCES sites(id),
    CONSTRAINT uq_bonus_type_code_site UNIQUE (code, site_id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_type_site ON bonus_types(site_id);
CREATE INDEX IF NOT EXISTS idx_bonus_type_active ON bonus_types(is_active);

-- =============================================
-- 2. Create bonuses table
-- =============================================
CREATE TABLE IF NOT EXISTS bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bonus_number VARCHAR(30) NOT NULL UNIQUE,
    employee_id UUID NOT NULL,
    bonus_type_id UUID NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    effective_month INT,
    effective_year INT,
    status VARCHAR(30) NOT NULL,
    reason VARCHAR(500),
    notes TEXT,

    -- HR approval fields
    hr_approved_by VARCHAR(100),
    hr_approved_at TIMESTAMP,
    hr_rejected_by VARCHAR(100),
    hr_rejected_at TIMESTAMP,
    hr_rejection_reason VARCHAR(500),

    -- Finance link
    payment_request_id UUID,
    payment_request_number VARCHAR(30),

    -- Bulk tracking
    bulk_bonus_id UUID,

    -- Payroll link
    payroll_id UUID,

    -- Audit fields
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,

    -- Site
    site_id UUID NOT NULL,

    -- Constraints
    CONSTRAINT fk_bonus_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_bonus_type FOREIGN KEY (bonus_type_id) REFERENCES bonus_types(id),
    CONSTRAINT fk_bonus_payroll FOREIGN KEY (payroll_id) REFERENCES payrolls(id),
    CONSTRAINT fk_bonus_site FOREIGN KEY (site_id) REFERENCES sites(id),
    CONSTRAINT bonuses_status_check CHECK (
        status IN (
            'DRAFT',
            'PENDING_HR_APPROVAL',
            'HR_APPROVED',
            'HR_REJECTED',
            'PENDING_PAYMENT',
            'PAID',
            'CANCELLED'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_bonus_site ON bonuses(site_id);
CREATE INDEX IF NOT EXISTS idx_bonus_employee ON bonuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonus_type ON bonuses(bonus_type_id);
CREATE INDEX IF NOT EXISTS idx_bonus_status ON bonuses(status);
CREATE INDEX IF NOT EXISTS idx_bonus_effective ON bonuses(effective_month, effective_year);
CREATE INDEX IF NOT EXISTS idx_bonus_payroll ON bonuses(payroll_id);
CREATE INDEX IF NOT EXISTS idx_bonus_bulk ON bonuses(bulk_bonus_id);

-- =============================================
-- 3. Add bonus_amount to employee_payrolls
-- =============================================
ALTER TABLE employee_payrolls ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(15, 2) DEFAULT 0;

-- =============================================
-- 4. Add bonus workflow fields to payrolls
-- =============================================
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS bonus_processed BOOLEAN DEFAULT false;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS bonus_finalized BOOLEAN DEFAULT false;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS last_bonus_processed_at TIMESTAMP;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS bonus_finalized_by VARCHAR(100);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS bonus_finalized_at TIMESTAMP;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS bonus_summary TEXT;

-- =============================================
-- 5. Update payroll status CHECK constraint to include BONUS_REVIEW
-- =============================================
ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_status_check;

ALTER TABLE payrolls ADD CONSTRAINT payrolls_status_check CHECK (
    status IN (
        -- HR Workflow Phases
        'PUBLIC_HOLIDAYS_REVIEW',
        'ATTENDANCE_IMPORT',
        'LEAVE_REVIEW',
        'OVERTIME_REVIEW',
        'BONUS_REVIEW',
        'DEDUCTION_REVIEW',
        'CONFIRMED_AND_LOCKED',
        -- Finance Workflow Phases
        'PENDING_FINANCE_REVIEW',
        'FINANCE_APPROVED',
        'FINANCE_REJECTED',
        'PARTIALLY_PAID',
        'PAID'
    )
);
