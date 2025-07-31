-- Add equipmentReceivedQuantity field to transaction_item table
-- This field represents the quantity that equipment claims to have received
-- It separates equipment claims from warehouse validation quantities

ALTER TABLE transaction_item 
ADD COLUMN equipment_received_quantity INTEGER;

-- Add resolution tracking fields to transaction_item table
-- These fields allow transaction items to reflect resolution status for better history display
ALTER TABLE transaction_item 
ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN resolution_type VARCHAR(50),
ADD COLUMN resolution_notes TEXT,
ADD COLUMN resolved_by VARCHAR(255),
ADD COLUMN corrected_quantity INTEGER,
ADD COLUMN fully_resolved BOOLEAN DEFAULT FALSE;

-- Add comments to clarify field usage
COMMENT ON COLUMN transaction_item.equipment_received_quantity IS 'Quantity that equipment claims to have received - used when equipment is the receiver';
COMMENT ON COLUMN transaction_item.quantity IS 'Quantity that warehouse claims to have sent - used as base quantity';
COMMENT ON COLUMN transaction_item.received_quantity IS 'Quantity confirmed during warehouse validation - used primarily in warehouse-to-warehouse transactions';
COMMENT ON COLUMN transaction_item.is_resolved IS 'Whether any discrepancy for this item has been resolved';
COMMENT ON COLUMN transaction_item.resolution_type IS 'Type of resolution applied to this item (if any)';
COMMENT ON COLUMN transaction_item.resolution_notes IS 'Notes about the resolution (if any)';
COMMENT ON COLUMN transaction_item.resolved_by IS 'Who resolved the discrepancy (if any)';
COMMENT ON COLUMN transaction_item.corrected_quantity IS 'Corrected quantity for counting error resolutions';
COMMENT ON COLUMN transaction_item.fully_resolved IS 'Whether the resolution was fully completed';