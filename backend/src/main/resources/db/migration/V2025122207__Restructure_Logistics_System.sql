-- V2025122207__Restructure_Logistics_System.sql
-- Safe migration with full condition checks

-- Step 1: Drop old foreign keys if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_logistics_purchase_order') THEN
ALTER TABLE logistics DROP CONSTRAINT fk_logistics_purchase_order;
END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_logistics_delivery_session') THEN
ALTER TABLE logistics DROP CONSTRAINT fk_logistics_delivery_session;
END IF;
END $$;

-- Step 2: Drop old columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'logistics' AND column_name = 'purchase_order_id') THEN
ALTER TABLE logistics DROP COLUMN purchase_order_id;
END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'logistics' AND column_name = 'delivery_session_id') THEN
ALTER TABLE logistics DROP COLUMN delivery_session_id;
END IF;
END $$;

-- Step 3: Rename delivery_fee to total_cost if not already renamed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'logistics' AND column_name = 'delivery_fee') THEN
ALTER TABLE logistics RENAME COLUMN delivery_fee TO total_cost;
END IF;
END $$;

-- Step 4: Change total_cost to DECIMAL if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'logistics' AND column_name = 'total_cost'
               AND data_type != 'numeric') THEN
ALTER TABLE logistics ALTER COLUMN total_cost TYPE DECIMAL(15, 2);
END IF;
END $$;

-- Step 5: Add new columns to logistics table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'logistics_number') THEN
ALTER TABLE logistics ADD COLUMN logistics_number VARCHAR(50) UNIQUE;
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'merchant_id') THEN
ALTER TABLE logistics ADD COLUMN merchant_id UUID;
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'merchant_name') THEN
ALTER TABLE logistics ADD COLUMN merchant_name VARCHAR(255);
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'status') THEN
ALTER TABLE logistics ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL';
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'payment_request_id') THEN
ALTER TABLE logistics ADD COLUMN payment_request_id UUID;
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'requested_at') THEN
ALTER TABLE logistics ADD COLUMN requested_at TIMESTAMP;
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'approved_at') THEN
ALTER TABLE logistics ADD COLUMN approved_at TIMESTAMP;
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'approved_by') THEN
ALTER TABLE logistics ADD COLUMN approved_by VARCHAR(255);
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'rejected_at') THEN
ALTER TABLE logistics ADD COLUMN rejected_at TIMESTAMP;
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'rejected_by') THEN
ALTER TABLE logistics ADD COLUMN rejected_by VARCHAR(255);
END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'logistics' AND column_name = 'rejection_reason') THEN
ALTER TABLE logistics ADD COLUMN rejection_reason TEXT;
END IF;
END $$;

-- Step 6: Add foreign key for merchant if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_logistics_merchant') THEN
ALTER TABLE logistics ADD CONSTRAINT fk_logistics_merchant
    FOREIGN KEY (merchant_id) REFERENCES merchant(id);
END IF;
END $$;

-- Step 7: Add foreign key for payment request if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_logistics_payment_request') THEN
ALTER TABLE logistics ADD CONSTRAINT fk_logistics_payment_request
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id);
END IF;
END $$;

-- Step 8: Create logistics_purchase_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS logistics_purchase_orders (
                                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logistics_id UUID NOT NULL,
    purchase_order_id UUID NOT NULL,
    allocated_cost DECIMAL(15, 2) NOT NULL,
    cost_percentage DECIMAL(5, 2) NOT NULL,
    total_items_value DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- Step 9: Add foreign keys for logistics_purchase_orders if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lpo_logistics') THEN
ALTER TABLE logistics_purchase_orders
    ADD CONSTRAINT fk_lpo_logistics
        FOREIGN KEY (logistics_id) REFERENCES logistics(id) ON DELETE CASCADE;
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lpo_purchase_order') THEN
ALTER TABLE logistics_purchase_orders
    ADD CONSTRAINT fk_lpo_purchase_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id) ON DELETE CASCADE;
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_logistics_po') THEN
ALTER TABLE logistics_purchase_orders
    ADD CONSTRAINT uk_logistics_po UNIQUE (logistics_id, purchase_order_id);
END IF;
END $$;

-- Step 10: Create logistics_purchase_order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS logistics_purchase_order_items (
                                                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logistics_purchase_order_id UUID NOT NULL,
    purchase_order_item_id UUID NOT NULL,
    item_type_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- Step 11: Add foreign keys for logistics_purchase_order_items if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lpoi_logistics_po') THEN
ALTER TABLE logistics_purchase_order_items
    ADD CONSTRAINT fk_lpoi_logistics_po
        FOREIGN KEY (logistics_purchase_order_id) REFERENCES logistics_purchase_orders(id) ON DELETE CASCADE;
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lpoi_po_item') THEN
ALTER TABLE logistics_purchase_order_items
    ADD CONSTRAINT fk_lpoi_po_item
        FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_item(id) ON DELETE CASCADE;
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_lpo_item') THEN
ALTER TABLE logistics_purchase_order_items
    ADD CONSTRAINT uk_lpo_item UNIQUE (logistics_purchase_order_id, purchase_order_item_id);
END IF;
END $$;

-- Step 12: Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logistics_status') THEN
CREATE INDEX idx_logistics_status ON logistics(status);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logistics_merchant') THEN
CREATE INDEX idx_logistics_merchant ON logistics(merchant_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logistics_payment_request') THEN
CREATE INDEX idx_logistics_payment_request ON logistics(payment_request_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logistics_created_at') THEN
CREATE INDEX idx_logistics_created_at ON logistics(created_at);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logistics_number') THEN
CREATE INDEX idx_logistics_number ON logistics(logistics_number);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lpo_logistics') THEN
CREATE INDEX idx_lpo_logistics ON logistics_purchase_orders(logistics_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lpo_purchase_order') THEN
CREATE INDEX idx_lpo_purchase_order ON logistics_purchase_orders(purchase_order_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lpoi_lpo') THEN
CREATE INDEX idx_lpoi_lpo ON logistics_purchase_order_items(logistics_purchase_order_id);
END IF;
END $$;

-- Step 13: Add table comments
COMMENT ON TABLE logistics IS 'Main logistics table - tracks delivery logistics with payment integration';
COMMENT ON TABLE logistics_purchase_orders IS 'Join table linking logistics to purchase orders with cost allocation';
COMMENT ON TABLE logistics_purchase_order_items IS 'Tracks specific PO items included in each logistics-PO relationship';
COMMENT ON COLUMN logistics.status IS 'Status: PENDING_APPROVAL, APPROVED, REJECTED, PAID';
COMMENT ON COLUMN logistics_purchase_orders.cost_percentage IS 'Percentage of total logistics cost allocated to this PO';