-- Add equipment purchase spec references to procurement item tables
-- and purchase order traceability to equipment table

-- RequestOrderItem: allow equipment specs alongside warehouse ItemTypes
ALTER TABLE request_order_item
    ADD COLUMN equipment_purchase_spec_id UUID REFERENCES equipment_purchase_spec(id);

-- PurchaseOrderItem: allow equipment specs alongside warehouse ItemTypes
ALTER TABLE purchase_order_item
    ADD COLUMN equipment_purchase_spec_id UUID REFERENCES equipment_purchase_spec(id);

-- Equipment: track which PO created this equipment (for idempotent auto-creation)
ALTER TABLE equipment
    ADD COLUMN purchase_order_id UUID UNIQUE;
