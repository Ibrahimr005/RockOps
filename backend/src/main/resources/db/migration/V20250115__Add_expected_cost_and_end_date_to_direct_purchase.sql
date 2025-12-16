-- Add expected cost and end date fields to direct_purchase_tickets table
-- These are optional fields added in Step 1 of the workflow

ALTER TABLE direct_purchase_tickets
ADD COLUMN expected_cost DECIMAL(10, 2),
ADD COLUMN expected_end_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN direct_purchase_tickets.expected_cost IS 'Optional estimated total cost entered during ticket creation (Step 1)';
COMMENT ON COLUMN direct_purchase_tickets.expected_end_date IS 'Optional target completion date entered during ticket creation (Step 1)';
