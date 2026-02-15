-- =============================================
-- Migration: Add BONUS_REVIEW to payroll status check constraint
-- Description: The BONUS_REVIEW status was added to the PayrollStatus enum
--              but was missing from the database CHECK constraint
-- =============================================

-- Drop the old constraint
ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_status_check;

-- Add the updated constraint with BONUS_REVIEW included
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