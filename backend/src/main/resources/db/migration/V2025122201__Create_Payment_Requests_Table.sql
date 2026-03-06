-- Create payment_requests table
CREATE TABLE IF NOT EXISTS payment_requests (
                                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    purchase_order_id UUID NOT NULL,
    offer_financial_review_id UUID,
    requested_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    requested_by_user_id UUID NOT NULL,
    requested_by_user_name VARCHAR(255),
    requested_by_department VARCHAR(100),
    requested_at TIMESTAMP NOT NULL,
    reviewed_by_user_id UUID,
    reviewed_by_user_name VARCHAR(255),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    approved_by_user_id UUID,
    approved_by_user_name VARCHAR(255),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejected_by_user_id UUID,
    rejected_by_user_name VARCHAR(255),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    payment_due_date DATE,
    payment_scheduled_date DATE,
    total_paid_amount DECIMAL(15, 2),
    remaining_amount DECIMAL(15, 2),
    merchant_id UUID,
    merchant_name VARCHAR(255),
    merchant_account_number VARCHAR(100),
    merchant_bank_name VARCHAR(255),
    merchant_contact_person VARCHAR(255),
    merchant_contact_phone VARCHAR(50),
    merchant_contact_email VARCHAR(255),
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
    );

-- Add foreign key to purchase_orders (if that table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
ALTER TABLE payment_requests
    ADD CONSTRAINT fk_payment_request_purchase_order
        FOREIGN KEY (purchase_order_id)
            REFERENCES purchase_orders(id);
END IF;
END $$;

-- Add foreign key to merchants (if that table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'merchants') THEN
ALTER TABLE payment_requests
    ADD CONSTRAINT fk_payment_request_merchant
        FOREIGN KEY (merchant_id)
            REFERENCES merchants(id);
END IF;
END $$;

-- Add foreign key to offer_financial_reviews (if that table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'offer_financial_reviews') THEN
ALTER TABLE payment_requests
    ADD CONSTRAINT fk_payment_request_offer_financial_review
        FOREIGN KEY (offer_financial_review_id)
            REFERENCES offer_financial_reviews(id);
END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_purchase_order ON payment_requests(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_merchant ON payment_requests(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_requested_by ON payment_requests(requested_by_user_id);