-- ============================================================
-- MIGRATION: Add Payroll Batching and Payment Types System
-- Version: V20260202
-- Description: Adds payroll numbers, payment types, payroll batches,
--              and generalizes payment requests for multi-source support
-- ============================================================

-- ============================================================
-- PART 1: Add payroll_number to payrolls table
-- ============================================================

ALTER TABLE payrolls
ADD COLUMN IF NOT EXISTS payroll_number VARCHAR(50) UNIQUE;

-- Generate payroll numbers for existing records (format: PRL-YYYY-NNNNNN)
DO $$
DECLARE
    rec RECORD;
    year_val INT;
    seq_num INT := 0;
    last_year INT := 0;
BEGIN
    FOR rec IN
        SELECT id, start_date
        FROM payrolls
        WHERE payroll_number IS NULL
        ORDER BY start_date ASC, created_at ASC
    LOOP
        year_val := EXTRACT(YEAR FROM rec.start_date);

        -- Reset sequence for new year
        IF year_val != last_year THEN
            seq_num := (
                SELECT COALESCE(MAX(
                    CAST(SUBSTRING(payroll_number FROM 10 FOR 6) AS INTEGER)
                ), 0)
                FROM payrolls
                WHERE payroll_number LIKE 'PRL-' || year_val || '-%'
            );
            last_year := year_val;
        END IF;

        seq_num := seq_num + 1;

        UPDATE payrolls
        SET payroll_number = 'PRL-' || year_val || '-' || LPAD(seq_num::TEXT, 6, '0')
        WHERE id = rec.id;
    END LOOP;
END $$;

-- Make payroll_number NOT NULL after populating
ALTER TABLE payrolls
ALTER COLUMN payroll_number SET NOT NULL;

-- ============================================================
-- PART 2: Add employee_payroll_number to employee_payrolls table
-- ============================================================

ALTER TABLE employee_payrolls
ADD COLUMN IF NOT EXISTS employee_payroll_number VARCHAR(50) UNIQUE;

-- Generate employee payroll numbers (format: EPRL-YYYY-NNNNNN)
DO $$
DECLARE
    rec RECORD;
    year_val INT;
    seq_num INT := 0;
    last_year INT := 0;
BEGIN
    FOR rec IN
        SELECT ep.id, p.start_date
        FROM employee_payrolls ep
        JOIN payrolls p ON ep.payroll_id = p.id
        WHERE ep.employee_payroll_number IS NULL
        ORDER BY p.start_date ASC, ep.id ASC
    LOOP
        year_val := EXTRACT(YEAR FROM rec.start_date);

        IF year_val != last_year THEN
            seq_num := (
                SELECT COALESCE(MAX(
                    CAST(SUBSTRING(employee_payroll_number FROM 11 FOR 6) AS INTEGER)
                ), 0)
                FROM employee_payrolls
                WHERE employee_payroll_number LIKE 'EPRL-' || year_val || '-%'
            );
            last_year := year_val;
        END IF;

        seq_num := seq_num + 1;

        UPDATE employee_payrolls
        SET employee_payroll_number = 'EPRL-' || year_val || '-' || LPAD(seq_num::TEXT, 6, '0')
        WHERE id = rec.id;
    END LOOP;
END $$;

-- Make employee_payroll_number NOT NULL after populating
ALTER TABLE employee_payrolls
ALTER COLUMN employee_payroll_number SET NOT NULL;

-- ============================================================
-- PART 3: Create payment_types table
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    requires_bank_details BOOLEAN NOT NULL DEFAULT FALSE,
    requires_wallet_details BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP,
    updated_by VARCHAR(100)
);

-- Create index for active payment types
CREATE INDEX IF NOT EXISTS idx_payment_types_active ON payment_types(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_types_code ON payment_types(code);

-- Insert default payment types
INSERT INTO payment_types (id, code, name, description, is_active, requires_bank_details, requires_wallet_details, display_order, created_at, created_by)
VALUES
    (gen_random_uuid(), 'BANK_TRANSFER', 'Bank Transfer', 'Payment via bank transfer to employee account', TRUE, TRUE, FALSE, 1, NOW(), 'system'),
    (gen_random_uuid(), 'CASH', 'Cash', 'Cash payment in person', TRUE, FALSE, FALSE, 2, NOW(), 'system'),
    (gen_random_uuid(), 'CHEQUE', 'Cheque', 'Payment via cheque', TRUE, FALSE, FALSE, 3, NOW(), 'system'),
    (gen_random_uuid(), 'MOBILE_WALLET', 'Mobile Wallet', 'Payment to mobile wallet (e.g., Vodafone Cash, Fawry)', TRUE, FALSE, TRUE, 4, NOW(), 'system')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- PART 4: Add payment_type_id to employees table
-- ============================================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS payment_type_id UUID REFERENCES payment_types(id);

-- Add bank details columns for employees (for bank transfer payments)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_account_holder_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS wallet_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_employees_payment_type ON employees(payment_type_id);

-- ============================================================
-- PART 5: Create payroll_batches table
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    payment_type_id UUID NOT NULL REFERENCES payment_types(id),

    -- Batch financial summary
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    employee_count INT NOT NULL DEFAULT 0,

    -- Status tracking (uses PayrollStatus values for finance workflow)
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_FINANCE_REVIEW',

    -- Payment request link (created when batch is sent to finance)
    payment_request_id UUID REFERENCES payment_requests(id),

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP,
    sent_to_finance_at TIMESTAMP,
    sent_to_finance_by VARCHAR(100),

    CONSTRAINT unique_payroll_payment_type UNIQUE(payroll_id, payment_type_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_batches_payroll ON payroll_batches(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_status ON payroll_batches(status);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_payment_type ON payroll_batches(payment_type_id);

-- Add batch_id to employee_payrolls for grouping
ALTER TABLE employee_payrolls
ADD COLUMN IF NOT EXISTS payroll_batch_id UUID REFERENCES payroll_batches(id);

CREATE INDEX IF NOT EXISTS idx_emp_payroll_batch ON employee_payrolls(payroll_batch_id);

-- Add payment type snapshot fields to employee_payrolls
ALTER TABLE employee_payrolls
ADD COLUMN IF NOT EXISTS payment_type_id UUID,
ADD COLUMN IF NOT EXISTS payment_type_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_type_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_account_holder_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS wallet_number VARCHAR(50);

-- ============================================================
-- PART 6: Generalize payment_requests with source/target
-- ============================================================

-- Add source polymorphism columns
ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id UUID,
ADD COLUMN IF NOT EXISTS source_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_description TEXT;

-- Add target polymorphism columns (payee can be merchant, employee, or external)
ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS target_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS target_id UUID,
ADD COLUMN IF NOT EXISTS target_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_details JSONB;

-- Add payroll batch reference
ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS payroll_batch_id UUID REFERENCES payroll_batches(id);

-- Create indexes for source/target lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_source ON payment_requests(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_target ON payment_requests(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_payroll_batch ON payment_requests(payroll_batch_id);

-- Migrate existing data to use source_type
UPDATE payment_requests
SET source_type = 'PURCHASE_ORDER',
    source_id = purchase_order_id,
    source_number = (SELECT po_number FROM purchase_orders WHERE id = purchase_order_id)
WHERE purchase_order_id IS NOT NULL AND source_type IS NULL;

UPDATE payment_requests
SET source_type = 'MAINTENANCE',
    source_id = maintenance_record_id
WHERE maintenance_record_id IS NOT NULL AND source_type IS NULL;

-- Migrate merchant as target
UPDATE payment_requests
SET target_type = 'MERCHANT',
    target_id = merchant_id,
    target_name = merchant_name
WHERE merchant_id IS NOT NULL AND target_type IS NULL;

-- ============================================================
-- PART 7: Add entity type configs for new IDs
-- ============================================================

INSERT INTO entity_id_sequences (entity_type, current_sequence)
VALUES
    ('PAYROLL', 0),
    ('EMPLOYEE_PAYROLL', 0),
    ('PAYROLL_BATCH', 0),
    ('PAYMENT_TYPE', 0)
ON CONFLICT (entity_type) DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
BEGIN
    -- Verify payroll_number column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'payrolls' AND column_name = 'payroll_number') THEN
        RAISE EXCEPTION 'payroll_number column not created';
    END IF;

    -- Verify employee_payroll_number column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'employee_payrolls' AND column_name = 'employee_payroll_number') THEN
        RAISE EXCEPTION 'employee_payroll_number column not created';
    END IF;

    -- Verify payment_types table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_name = 'payment_types') THEN
        RAISE EXCEPTION 'payment_types table not created';
    END IF;

    -- Verify payroll_batches table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_name = 'payroll_batches') THEN
        RAISE EXCEPTION 'payroll_batches table not created';
    END IF;

    RAISE NOTICE 'Migration V20260202 completed successfully';
END $$;
