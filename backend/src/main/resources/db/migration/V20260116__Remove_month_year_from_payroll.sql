-- ========================================
-- Migration: Remove month and year columns from payroll table
-- Date: 2026-01-16
-- Description:
--   - Drop the month and year columns from payrolls table
--   - Drop the index on month,year
--   - Payroll periods will now be identified solely by start_date and end_date
-- ========================================

-- Drop the index on month and year
DROP INDEX IF EXISTS idx_payroll_period;

-- Drop the month and year columns
ALTER TABLE payrolls DROP COLUMN IF EXISTS month;
ALTER TABLE payrolls DROP COLUMN IF EXISTS year;
