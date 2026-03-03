-- ========================================
-- Migration: Add Finance Review Fields to Payroll
-- Date: 2026-01-18
-- Description:
--   Adds fields for finance review workflow:
--   - sent_to_finance_at, sent_to_finance_by
--   - payment_source_type, payment_source_id, payment_source_name
--   - finance_reviewed_at, finance_reviewed_by, finance_notes
-- ========================================

-- Add finance review fields to payrolls table
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS sent_to_finance_at TIMESTAMP;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS sent_to_finance_by VARCHAR(100);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_source_type VARCHAR(50);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_source_id UUID;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_source_name VARCHAR(200);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS finance_reviewed_at TIMESTAMP;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS finance_reviewed_by VARCHAR(100);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS finance_notes TEXT;

-- Create index for finance review queries
CREATE INDEX IF NOT EXISTS idx_payroll_finance_status ON payrolls(status) WHERE status IN ('PENDING_FINANCE_REVIEW', 'PAID');
