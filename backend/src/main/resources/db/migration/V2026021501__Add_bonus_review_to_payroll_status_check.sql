-- =============================================
-- Migration: Add BONUS_REVIEW to payroll status check constraint
-- Wrapped in existence check for fresh deploy compatibility
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') THEN
        -- Drop the old constraint
        ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_status_check;

        -- Add the updated constraint with BONUS_REVIEW included
        ALTER TABLE payrolls ADD CONSTRAINT payrolls_status_check CHECK (
            status IN (
                'PUBLIC_HOLIDAYS_REVIEW',
                'ATTENDANCE_IMPORT',
                'LEAVE_REVIEW',
                'OVERTIME_REVIEW',
                'BONUS_REVIEW',
                'DEDUCTION_REVIEW',
                'CONFIRMED_AND_LOCKED',
                'PENDING_FINANCE_REVIEW',
                'FINANCE_APPROVED',
                'FINANCE_REJECTED',
                'PARTIALLY_PAID',
                'PAID'
            )
        );
        RAISE NOTICE 'V2026021501: BONUS_REVIEW added to payroll status constraint.';
    ELSE
        RAISE NOTICE 'V2026021501: payrolls table not found. Skipping.';
    END IF;
END $$;
