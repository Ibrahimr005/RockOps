-- V2026012401__drop_account_name_from_bank_accounts.sql
-- Drop the unused account_name column from bank_accounts table

ALTER TABLE bank_accounts
DROP COLUMN IF EXISTS account_name;
