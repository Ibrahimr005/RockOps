-- V2026021302__Create_Purchase_Order_Returns.sql
-- Create tables for Purchase Order Returns functionality

-- Step 1: Create purchase_order_returns table
CREATE TABLE IF NOT EXISTS purchase_order_returns (
                                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    return_number VARCHAR(100) UNIQUE NOT NULL,
    total_return_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reason TEXT,
    requested_by VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_por_purchase_order FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_order(id) ON DELETE RESTRICT,
    CONSTRAINT fk_por_merchant FOREIGN KEY (merchant_id)
    REFERENCES merchant(id) ON DELETE RESTRICT
    );

-- Step 2: Create purchase_order_return_items table
CREATE TABLE IF NOT EXISTS purchase_order_return_items (
                                                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_return_id UUID NOT NULL,
    purchase_order_item_id UUID NOT NULL,
    item_type_name VARCHAR(255) NOT NULL,
    return_quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_return_amount DECIMAL(15, 2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pori_po_return FOREIGN KEY (purchase_order_return_id)
    REFERENCES purchase_order_returns(id) ON DELETE CASCADE,
    CONSTRAINT fk_pori_po_item FOREIGN KEY (purchase_order_item_id)
    REFERENCES purchase_order_item(id) ON DELETE RESTRICT
    );

-- Step 3: Create indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_po_returns_po') THEN
CREATE INDEX idx_po_returns_po ON purchase_order_returns(purchase_order_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_po_returns_merchant') THEN
CREATE INDEX idx_po_returns_merchant ON purchase_order_returns(merchant_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_po_returns_status') THEN
CREATE INDEX idx_po_returns_status ON purchase_order_returns(status);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_po_returns_created_at') THEN
CREATE INDEX idx_po_returns_created_at ON purchase_order_returns(created_at);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_po_return_items_return') THEN
CREATE INDEX idx_po_return_items_return ON purchase_order_return_items(purchase_order_return_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_po_return_items_po_item') THEN
CREATE INDEX idx_po_return_items_po_item ON purchase_order_return_items(purchase_order_item_id);
END IF;
END $$;

-- Step 4: Add comments
COMMENT ON TABLE purchase_order_returns IS 'Tracks purchase order return requests grouped by merchant';
COMMENT ON TABLE purchase_order_return_items IS 'Individual items being returned in a PO return request';
COMMENT ON COLUMN purchase_order_returns.status IS 'Status: PENDING, CONFIRMED, REJECTED';