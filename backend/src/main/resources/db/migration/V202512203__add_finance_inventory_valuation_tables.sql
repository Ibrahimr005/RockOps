-- Finance Inventory Valuation: Item Price Approval table
CREATE TABLE IF NOT EXISTS item_price_approval (
                                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID,
    warehouse_id UUID NOT NULL,
    suggested_price DOUBLE PRECISION,
    approved_price DOUBLE PRECISION,
    requested_by VARCHAR(255),
    requested_at TIMESTAMP,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT fk_item_price_approval_item FOREIGN KEY (item_id)
    REFERENCES item(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_price_approval_warehouse FOREIGN KEY (warehouse_id)
    REFERENCES warehouse(id) ON DELETE CASCADE
    );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_item_price_approval_item_id ON item_price_approval(item_id);
CREATE INDEX IF NOT EXISTS idx_item_price_approval_warehouse_id ON item_price_approval(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_item_price_approval_status ON item_price_approval(approval_status);
CREATE INDEX IF NOT EXISTS idx_item_price_approval_requested_at ON item_price_approval(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_price_approval_approved_at ON item_price_approval(approved_at DESC);