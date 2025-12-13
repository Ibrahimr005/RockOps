-- Add remaining and remaining_manually_set fields to maintenance_steps table
ALTER TABLE maintenance_steps
ADD COLUMN remaining DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN remaining_manually_set BOOLEAN DEFAULT FALSE;

-- Add check constraint for remaining field
ALTER TABLE maintenance_steps
ADD CONSTRAINT chk_remaining_non_negative CHECK (remaining IS NULL OR remaining >= 0);

-- Update existing rows to calculate remaining as expected_cost - down_payment
UPDATE maintenance_steps
SET remaining = COALESCE(expected_cost, 0) - COALESCE(down_payment, 0)
WHERE remaining = 0 OR remaining IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN maintenance_steps.remaining IS 'Remaining amount to be paid (expected_cost - down_payment, or manually set)';
COMMENT ON COLUMN maintenance_steps.remaining_manually_set IS 'Flag indicating if remaining was manually overridden by user';
