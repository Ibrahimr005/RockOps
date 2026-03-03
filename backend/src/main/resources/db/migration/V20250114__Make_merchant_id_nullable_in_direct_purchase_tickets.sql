-- Migration: Make merchant_id nullable in direct_purchase_tickets
-- Reason: In the 4-step workflow, merchant_id is not set until Step 2 (Purchasing)
--         Step 1 (Creation) only collects title, description, equipment, and items
--         This aligns with the business logic where merchant selection happens during purchasing
-- Made idempotent to handle re-runs

-- Make merchant_id nullable (idempotent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'direct_purchase_tickets'
        AND column_name = 'merchant_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE direct_purchase_tickets ALTER COLUMN merchant_id DROP NOT NULL;
    END IF;
END $$;

-- Add comment to document the change
COMMENT ON COLUMN direct_purchase_tickets.merchant_id IS 'Merchant for this purchase - NULL until Step 2 (Purchasing) for new workflow tickets';
