-- Drop old payroll tables that are no longer needed
-- These tables have been replaced by the new simplified payroll system

-- Drop tables in correct order to handle foreign key constraints

-- First drop tables that depend on others
DROP TABLE IF EXISTS repayment_schedule CASCADE;
DROP TABLE IF EXISTS payroll_journal_entry CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payslip CASCADE;
DROP TABLE IF EXISTS employer_contribution CASCADE;
DROP TABLE IF EXISTS earning CASCADE;
DROP TABLE IF EXISTS deduction CASCADE;
DROP TABLE IF EXISTS deduction_type CASCADE;

-- Also drop any related tables that might exist
DROP TABLE IF EXISTS employee_deduction CASCADE;
DROP TABLE IF EXISTS loan CASCADE;
