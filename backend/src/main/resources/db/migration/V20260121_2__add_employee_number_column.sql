-- ============================================================
-- V20260121_2__add_employee_number_column.sql
-- Add employee_number column to employee table and LOAN sequence
-- ============================================================

-- Add employee_number column to employee table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'employee'
                   AND column_name = 'employee_number') THEN
        ALTER TABLE employee ADD COLUMN employee_number VARCHAR(20) UNIQUE;
    END IF;
END $$;

-- Create index on employee_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_employee_number ON employee(employee_number);

-- Initialize LOAN sequence in entity_id_sequences if not exists
INSERT INTO entity_id_sequences (entity_type, current_sequence, version)
VALUES ('LOAN', 0, 0)
ON CONFLICT (entity_type) DO NOTHING;

-- Add comment for documentation
COMMENT ON COLUMN employee.employee_number IS 'Human-readable employee identifier (e.g., EMP-000001)';
