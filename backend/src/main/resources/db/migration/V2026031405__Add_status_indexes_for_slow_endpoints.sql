-- Add indexes on status columns for frequently filtered tables
-- These support the slow endpoints: salary increase requests, offer filtering,
-- promotion requests, and demotion requests

-- Index on salary_increase_requests.status (supports /api/v1/hr/salary-increase-requests filtering)
CREATE INDEX IF NOT EXISTS idx_salary_increase_requests_status
    ON salary_increase_requests (status);

-- Index on offer.status (supports offer filtering and dashboard queries)
CREATE INDEX IF NOT EXISTS idx_offer_status
    ON offer (status);

-- Index on offer.finance_validation_status (supports /api/v1/finance/offer-reviews/pending)
CREATE INDEX IF NOT EXISTS idx_offer_finance_validation_status
    ON offer (finance_validation_status);

-- Index on promotion_requests.status (supports promotion statistics and filtering)
CREATE INDEX IF NOT EXISTS idx_promotion_requests_status
    ON promotion_requests (status);

-- Index on demotion_requests.status (supports demotion statistics and filtering)
CREATE INDEX IF NOT EXISTS idx_demotion_requests_status
    ON demotion_requests (status);
