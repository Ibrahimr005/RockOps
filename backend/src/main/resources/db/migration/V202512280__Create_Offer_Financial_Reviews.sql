-- V202512280__Create_Offer_Financial_Reviews.sql

CREATE TABLE offer_financial_reviews (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                         offer_id UUID,
                                         maintenance_record_id UUID,
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

ALTER TABLE offer_financial_reviews
    ADD CONSTRAINT fk_offer_financial_review_offer
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;

ALTER TABLE offer_financial_reviews
    ADD CONSTRAINT fk_offer_financial_review_maintenance
        FOREIGN KEY (maintenance_record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE;

ALTER TABLE offer_financial_reviews
    ADD CONSTRAINT chk_offer_or_maintenance
        CHECK (
            (offer_id IS NOT NULL AND maintenance_record_id IS NULL) OR
            (offer_id IS NULL AND maintenance_record_id IS NOT NULL)
            );

CREATE INDEX idx_offer_financial_reviews_offer_id ON offer_financial_reviews(offer_id);
CREATE INDEX idx_offer_financial_reviews_maintenance_id ON offer_financial_reviews(maintenance_record_id);
CREATE INDEX idx_offer_financial_reviews_status ON offer_financial_reviews(status);