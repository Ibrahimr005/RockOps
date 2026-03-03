-- =============================================
-- Migration: Update payroll status check constraint
-- Description: Adds new finance workflow statuses to the payrolls_status_check constraint
-- Wrapped in existence check for fresh deploy compatibility
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') THEN
        -- Drop the old constraint
        ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_status_check;

        -- Add the updated constraint with all statuses
        ALTER TABLE payrolls ADD CONSTRAINT payrolls_status_check CHECK (
            status IN (
                'PUBLIC_HOLIDAYS_REVIEW',
                'ATTENDANCE_IMPORT',
                'LEAVE_REVIEW',
                'OVERTIME_REVIEW',
                'DEDUCTION_REVIEW',
                'CONFIRMED_AND_LOCKED',
                'PENDING_FINANCE_REVIEW',
                'FINANCE_APPROVED',
                'FINANCE_REJECTED',
                'PARTIALLY_PAID',
                'PAID'
            )
        );
        RAISE NOTICE 'V20260205: payroll status constraint updated.';
    ELSE
        RAISE NOTICE 'V20260205: payrolls table not found. Skipping.';
    END IF;
END $$;
