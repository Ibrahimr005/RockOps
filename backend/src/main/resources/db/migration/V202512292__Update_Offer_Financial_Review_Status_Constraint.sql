-- Update check constraint for offer_financial_reviews status
ALTER TABLE offer_financial_reviews DROP CONSTRAINT IF EXISTS offer_financial_reviews_status_check;

ALTER TABLE offer_financial_reviews ADD CONSTRAINT offer_financial_reviews_status_check 
    CHECK (status IN (
        'PENDING',
        'APPROVED',
        'REJECTED'
    ));
