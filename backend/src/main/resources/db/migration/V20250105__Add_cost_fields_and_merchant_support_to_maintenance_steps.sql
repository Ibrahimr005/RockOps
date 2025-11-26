-- Add new cost fields to maintenance_steps table
ALTER TABLE maintenance_steps
ADD COLUMN down_payment DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN expected_cost DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN actual_cost DECIMAL(10, 2);

-- Add merchant support to maintenance_steps table
ALTER TABLE maintenance_steps
ADD COLUMN selected_merchant_id UUID REFERENCES merchant(id) ON DELETE SET NULL;

-- Create maintenance_step_merchant_items table
CREATE TABLE IF NOT EXISTS maintenance_step_merchant_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_step_id UUID NOT NULL REFERENCES maintenance_steps(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_merchant_item_cost_non_negative CHECK (cost >= 0)
);

-- Create index for faster lookups
CREATE INDEX idx_maintenance_step_merchant_items_step_id ON maintenance_step_merchant_items(maintenance_step_id);

-- Add check constraints for cost fields
ALTER TABLE maintenance_steps
ADD CONSTRAINT chk_down_payment_non_negative CHECK (down_payment >= 0),
ADD CONSTRAINT chk_expected_cost_non_negative CHECK (expected_cost >= 0),
ADD CONSTRAINT chk_actual_cost_non_negative CHECK (actual_cost IS NULL OR actual_cost >= 0);

-- Migrate existing stepCost to expectedCost for backward compatibility
UPDATE maintenance_steps
SET expected_cost = step_cost
WHERE expected_cost = 0 AND step_cost > 0;

-- Add comments for documentation
COMMENT ON COLUMN maintenance_steps.down_payment IS 'Initial down payment made for this maintenance step';
COMMENT ON COLUMN maintenance_steps.expected_cost IS 'Expected cost for completing this maintenance step';
COMMENT ON COLUMN maintenance_steps.actual_cost IS 'Actual cost incurred for this maintenance step (set after completion)';
COMMENT ON COLUMN maintenance_steps.selected_merchant_id IS 'Reference to merchant responsible for this step (if applicable)';
COMMENT ON TABLE maintenance_step_merchant_items IS 'Individual items/services provided by merchant for a maintenance step';
