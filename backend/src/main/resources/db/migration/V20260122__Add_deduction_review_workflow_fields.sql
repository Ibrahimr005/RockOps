-- ============================================================
-- V20260122__Add_deduction_review_workflow_fields.sql
-- Add deduction review phase workflow fields to payrolls table
-- This enables the new DEDUCTION_REVIEW phase in payroll workflow
-- ============================================================

-- ============================================================
-- 1. ADD DEDUCTION REVIEW WORKFLOW COLUMNS TO PAYROLLS TABLE
-- ============================================================

-- Whether deduction review has been processed at least once
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS deduction_processed BOOLEAN DEFAULT FALSE;

-- Whether deduction review is finalized and locked
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS deduction_finalized BOOLEAN DEFAULT FALSE;

-- Timestamp of last deduction processing
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS last_deduction_processed_at TIMESTAMP;

-- Who finalized the deduction review
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS deduction_finalized_by VARCHAR(100);

-- When deduction review was finalized
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS deduction_finalized_at TIMESTAMP;

-- Whether HR notification has been sent for deduction issues
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS deduction_hr_notification_sent BOOLEAN DEFAULT FALSE;

-- When HR notification was sent
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS deduction_hr_notification_sent_at TIMESTAMP;

-- JSON summary of deduction processing results
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS deduction_summary TEXT;

-- ============================================================
-- 2. CREATE INDEXES FOR DEDUCTION REVIEW QUERIES
-- ============================================================

-- Index for finding payrolls in deduction review status
CREATE INDEX IF NOT EXISTS idx_payroll_deduction_status
ON payrolls(status)
WHERE status = 'DEDUCTION_REVIEW';

-- Index for finding payrolls with pending deduction review
CREATE INDEX IF NOT EXISTS idx_payroll_deduction_pending
ON payrolls(deduction_processed, deduction_finalized)
WHERE deduction_processed = FALSE OR deduction_finalized = FALSE;

-- ============================================================
-- 3. UPDATE PAYROLL STATUS CONSTRAINT
-- The status constraint needs to include DEDUCTION_REVIEW
-- ============================================================

-- Drop existing constraint if it exists (only if it's a CHECK constraint on status)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payrolls_status_check'
        AND conrelid = 'payrolls'::regclass
    ) THEN
        ALTER TABLE payrolls DROP CONSTRAINT payrolls_status_check;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Constraint doesn't exist, nothing to do
        NULL;
END $$;

-- Add new constraint with DEDUCTION_REVIEW included
-- Note: Only add if we need to enforce at DB level (Spring handles via enum)
-- ALTER TABLE payrolls ADD CONSTRAINT payrolls_status_check
-- CHECK (status IN ('PUBLIC_HOLIDAYS_REVIEW', 'ATTENDANCE_IMPORT', 'LEAVE_REVIEW',
--                   'OVERTIME_REVIEW', 'DEDUCTION_REVIEW', 'CONFIRMED_AND_LOCKED',
--                   'PENDING_FINANCE_REVIEW', 'PAID'));

-- ============================================================
-- 4. UPDATE EXISTING PAYROLLS
-- Set default values for existing payrolls based on current status
-- ============================================================

-- For payrolls that are past the deduction phase, mark deduction as processed and finalized
UPDATE payrolls
SET
    deduction_processed = TRUE,
    deduction_finalized = TRUE,
    deduction_finalized_at = COALESCE(locked_at, CURRENT_TIMESTAMP),
    deduction_finalized_by = COALESCE(locked_by, 'SYSTEM')
WHERE status IN ('CONFIRMED_AND_LOCKED', 'PENDING_FINANCE_REVIEW', 'PAID')
AND deduction_processed IS NULL;

-- For payrolls in earlier statuses, ensure deduction fields are initialized
UPDATE payrolls
SET
    deduction_processed = FALSE,
    deduction_finalized = FALSE
WHERE status IN ('PUBLIC_HOLIDAYS_REVIEW', 'ATTENDANCE_IMPORT', 'LEAVE_REVIEW', 'OVERTIME_REVIEW')
AND deduction_processed IS NULL;

-- ============================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN payrolls.deduction_processed IS 'Whether deduction review has been processed at least once';
COMMENT ON COLUMN payrolls.deduction_finalized IS 'Whether deduction review is finalized and locked';
COMMENT ON COLUMN payrolls.last_deduction_processed_at IS 'Timestamp of last deduction processing';
COMMENT ON COLUMN payrolls.deduction_finalized_by IS 'Username of who finalized the deduction review';
COMMENT ON COLUMN payrolls.deduction_finalized_at IS 'Timestamp when deduction review was finalized';
COMMENT ON COLUMN payrolls.deduction_hr_notification_sent IS 'Whether HR notification was sent for deduction issues';
COMMENT ON COLUMN payrolls.deduction_hr_notification_sent_at IS 'Timestamp when HR notification was sent';
COMMENT ON COLUMN payrolls.deduction_summary IS 'JSON summary of deduction processing results (totals, issues, etc.)';
