-- V202512280__Create_Offer_Financial_Reviews.sql

CREATE TABLE IF NOT EXISTS offer_financial_reviews (
                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                        offer_id UUID,
                                        total_amount DECIMAL(15, 2) NOT NULL,
                                        currency VARCHAR(3) NOT NULL,
                                        budget_category VARCHAR(100),
                                        department VARCHAR(100),
                                        reviewed_by_user_id UUID,
                                        reviewed_by_user_name VARCHAR(255),
                                        reviewed_at TIMESTAMP,
                                        status VARCHAR(50) NOT NULL,
                                        approval_notes TEXT,
                                        rejection_reason TEXT,
                                        expected_payment_date DATE,
                                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add maintenance_record_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'offer_financial_reviews'
                   AND column_name = 'maintenance_record_id') THEN
        ALTER TABLE offer_financial_reviews ADD COLUMN maintenance_record_id UUID;
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_offer_financial_review_offer') THEN
        ALTER TABLE offer_financial_reviews
            ADD CONSTRAINT fk_offer_financial_review_offer
                FOREIGN KEY (offer_id) REFERENCES offer(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_offer_financial_review_maintenance') THEN
        ALTER TABLE offer_financial_reviews
            ADD CONSTRAINT fk_offer_financial_review_maintenance
                FOREIGN KEY (maintenance_record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_offer_or_maintenance') THEN
        ALTER TABLE offer_financial_reviews
            ADD CONSTRAINT chk_offer_or_maintenance
                CHECK (
                    (offer_id IS NOT NULL AND maintenance_record_id IS NULL) OR
                    (offer_id IS NULL AND maintenance_record_id IS NOT NULL)
                );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offer_financial_reviews_offer_id ON offer_financial_reviews(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_financial_reviews_maintenance_id ON offer_financial_reviews(maintenance_record_id);
CREATE INDEX IF NOT EXISTS idx_offer_financial_reviews_status ON offer_financial_reviews(status);
