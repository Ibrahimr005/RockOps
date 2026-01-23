-- Add expected_cost column for budget request
ALTER TABLE maintenance_records 
ADD COLUMN IF NOT EXISTS expected_cost DECIMAL(10, 2) DEFAULT 0;

-- Add approved_budget column for finance-approved amount
ALTER TABLE maintenance_records 
ADD COLUMN IF NOT EXISTS approved_budget DECIMAL(10, 2);

-- Migrate existing data: set expected_cost = total_cost for existing records
UPDATE maintenance_records 
SET expected_cost = COALESCE(total_cost, 0)
WHERE expected_cost IS NULL OR expected_cost = 0;
