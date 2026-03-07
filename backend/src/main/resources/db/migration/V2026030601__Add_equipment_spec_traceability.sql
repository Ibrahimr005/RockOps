-- Add purchase_spec_id to equipment table for spec-to-equipment traceability
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_spec_id UUID;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS received_via_procurement BOOLEAN;

-- Add foreign key constraint
ALTER TABLE equipment
    ADD CONSTRAINT fk_equipment_purchase_spec
    FOREIGN KEY (purchase_spec_id) REFERENCES equipment_purchase_spec(id);

-- Drop the unique constraint on purchase_order_id if it exists (equipment POs can have multiple items)
-- Check if constraint exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'equipment_purchase_order_id_key'
        OR conname = 'uk_equipment_purchase_order_id'
    ) THEN
        ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_purchase_order_id_key;
        ALTER TABLE equipment DROP CONSTRAINT IF EXISTS uk_equipment_purchase_order_id;
    END IF;
END $$;
