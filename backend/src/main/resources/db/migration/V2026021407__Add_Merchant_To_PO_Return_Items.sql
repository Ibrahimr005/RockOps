-- Add merchant_id to purchase_order_return_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'purchase_order_return_items'
        AND column_name = 'merchant_id'
    ) THEN
ALTER TABLE purchase_order_return_items
    ADD COLUMN merchant_id UUID;

-- Add foreign key constraint
ALTER TABLE purchase_order_return_items
    ADD CONSTRAINT fk_purchase_order_return_items_merchant
        FOREIGN KEY (merchant_id) REFERENCES merchant(id);

-- Populate merchant_id from purchase_order_item for existing records
UPDATE purchase_order_return_items pri
SET merchant_id = poi.merchant_id
    FROM purchase_order_item poi
WHERE pri.purchase_order_item_id = poi.id;

-- Make it NOT NULL after populating
ALTER TABLE purchase_order_return_items
    ALTER COLUMN merchant_id SET NOT NULL;

RAISE NOTICE 'Added merchant_id to purchase_order_return_items';
ELSE
        RAISE NOTICE 'merchant_id already exists in purchase_order_return_items';
END IF;
END $$;