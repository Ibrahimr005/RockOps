-- V20260125: Drop payroll-related tables for clean rebuild
-- This migration removes corrupted/inconsistent tables so they can be recreated properly

-- First drop the type check constraint that's causing issues
ALTER TABLE IF EXISTS deduction_types DROP CONSTRAINT IF EXISTS deduction_types_type_check;

-- Drop the type column entirely (not needed in entity)
ALTER TABLE IF EXISTS deduction_types DROP COLUMN IF EXISTS type;

-- Drop tables in correct order (respecting foreign key dependencies)

-- Drop loan finance request related tables first
DROP TABLE IF EXISTS loan_finance_request_status_history CASCADE;
DROP TABLE IF EXISTS loan_finance_requests CASCADE;

-- Drop employee deductions (depends on deduction_types and employees)
DROP TABLE IF EXISTS employee_deductions CASCADE;

-- Drop deduction_types
DROP TABLE IF EXISTS deduction_types CASCADE;

-- Drop employee payroll records
DROP TABLE IF EXISTS employee_payroll CASCADE;

-- Drop payroll (main payroll runs)
DROP TABLE IF EXISTS payroll CASCADE;

-- Drop loans table
DROP TABLE IF EXISTS loans CASCADE;

-- Drop loan repayments if exists
DROP TABLE IF EXISTS loan_repayments CASCADE;

-- Clean up any leftover indexes (will be silently ignored if they don't exist)
DROP INDEX IF EXISTS idx_deduction_types_category;
DROP INDEX IF EXISTS idx_deduction_types_active;
DROP INDEX IF EXISTS idx_deduction_types_site;
DROP INDEX IF EXISTS idx_employee_deductions_employee;
DROP INDEX IF EXISTS idx_employee_deductions_type;
DROP INDEX IF EXISTS idx_employee_deductions_active;
DROP INDEX IF EXISTS idx_employee_deductions_dates;
DROP INDEX IF EXISTS idx_employee_deductions_reference;
DROP INDEX IF EXISTS idx_loans_loan_number;
DROP INDEX IF EXISTS idx_loans_finance_status;
DROP INDEX IF EXISTS idx_loan_finance_requests_status;
DROP INDEX IF EXISTS idx_loan_finance_requests_employee;
DROP INDEX IF EXISTS idx_loan_finance_requests_requested_at;
DROP INDEX IF EXISTS idx_loan_finance_request_history_request;

-- Clean up flyway history for migrations that created these tables
-- so they can be re-run
DELETE FROM flyway_schema_history WHERE version IN ('20260121', '20260122', '20260123', '20260124');
