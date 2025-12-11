-- ==========================================
-- Step 1: Create entity_id_sequences table
-- ==========================================
CREATE TABLE IF NOT EXISTS entity_id_sequences (
                                                   entity_type VARCHAR(50) PRIMARY KEY,
    current_sequence BIGINT NOT NULL DEFAULT 0,
    version BIGINT DEFAULT 0
    );

-- ==========================================
-- Step 2: Initialize all entity type sequences
-- ==========================================
INSERT INTO entity_id_sequences (entity_type, current_sequence)
VALUES
    ('WAREHOUSE', 0),
    ('ITEM_CATEGORY', 0),
    ('ITEM_TYPE', 0),
    ('ITEM', 0),
    ('MERCHANT', 0),
    ('REQUEST_ORDER', 0),
    ('REQUEST_ORDER_ITEM', 0),
    ('PURCHASE_ORDER', 0),
    ('PURCHASE_ORDER_ITEM', 0),
    ('OFFER', 0),
    ('OFFER_ITEM', 0),
    ('EQUIPMENT', 0),
    ('EQUIPMENT_TYPE', 0),
    ('EQUIPMENT_BRAND', 0),
    ('EMPLOYEE', 0),
    ('DEPARTMENT', 0),
    ('JOB_POSITION', 0),
    ('VACANCY', 0),
    ('WORK_TYPE', 0),
    ('SITE', 0),
    ('TRANSACTION', 0)
    ON CONFLICT (entity_type) DO NOTHING;

-- ==========================================
-- Step 3: Add merchant_id column to merchant table
-- ==========================================
ALTER TABLE merchant ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(20);

-- ==========================================
-- Step 4: Generate merchant IDs for existing merchants
-- ==========================================
DO $$
DECLARE
merchant_record RECORD;
    counter INTEGER := 0;
    generated_id VARCHAR(20);
BEGIN
    -- Loop through all merchants that don't have a merchant_id yet
FOR merchant_record IN
SELECT id FROM merchant WHERE merchant_id IS NULL ORDER BY id
    LOOP
        counter := counter + 1;
-- Generate ID with format MCH000001, MCH000002, etc.
generated_id := 'MCH' || LPAD(counter::TEXT, 6, '0');

        -- Update the merchant with the generated ID
UPDATE merchant SET merchant_id = generated_id WHERE id = merchant_record.id;
END LOOP;

    -- Update the sequence to the current count
UPDATE entity_id_sequences
SET current_sequence = counter
WHERE entity_type = 'MERCHANT';

RAISE NOTICE 'Generated % merchant IDs', counter;
END $$;

-- ==========================================
-- Step 5: Make merchant_id NOT NULL and UNIQUE after populating
-- ==========================================
ALTER TABLE merchant ALTER COLUMN merchant_id SET NOT NULL;
ALTER TABLE merchant ADD CONSTRAINT unique_merchant_id UNIQUE (merchant_id);

-- ==========================================
-- Step 6: Create index for performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_merchant_merchant_id ON merchant(merchant_id);

-- ==========================================
-- Comments for documentation
-- ==========================================
COMMENT ON TABLE entity_id_sequences IS 'Centralized ID generation for all entities - prefixes and padding defined in EntityTypeConfig enum';
COMMENT ON COLUMN merchant.merchant_id IS 'Human-readable merchant ID (e.g., MCH000001)';