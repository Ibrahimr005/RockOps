-- Remove merchant_id from purchase_order_returns since merchant belongs to individual items
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'purchase_order_returns'
        AND column_name = 'merchant_id'
    ) THEN
ALTER TABLE purchase_order_returns
DROP COLUMN merchant_id;

        RAISE NOTICE 'Removed merchant_id from purchase_order_returns';
ELSE
        RAISE NOTICE 'merchant_id column does not exist in purchase_order_returns';
END IF;
END $$;