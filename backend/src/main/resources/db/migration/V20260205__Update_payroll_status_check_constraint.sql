-- =============================================
-- Migration: Update payroll status check constraint
-- Description: Adds new finance workflow statuses to the payrolls_status_check constraint
-- =============================================

-- Drop the old constraint
ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_status_check;

-- Add the updated constraint with all statuses
ALTER TABLE payrolls ADD CONSTRAINT payrolls_status_check CHECK (
    status IN (
        -- HR Workflow Phases
        'PUBLIC_HOLIDAYS_REVIEW',
        'ATTENDANCE_IMPORT',
        'LEAVE_REVIEW',
        'OVERTIME_REVIEW',
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
