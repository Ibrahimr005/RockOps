-- Create logistics table
CREATE TABLE IF NOT EXISTS logistics (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL,
    delivery_session_id UUID,
    delivery_fee DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) NOT NULL,
    carrier_company VARCHAR(255) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP,
    CONSTRAINT fk_logistics_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id) ON DELETE CASCADE,
    CONSTRAINT fk_logistics_delivery_session FOREIGN KEY (delivery_session_id) REFERENCES delivery_sessions(id) ON DELETE SET NULL
    );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_logistics_purchase_order ON logistics(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_delivery_session ON logistics(delivery_session_id);