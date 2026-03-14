-- V2026031404: Additional performance indexes for transaction and purchase_order tables
-- =====================================================================================

CREATE INDEX IF NOT EXISTS idx_transaction_status ON transaction(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_offer_id ON purchase_order(offer_id);
