-- Migration: Convert single merchant_type to multiple merchant_types
-- This preserves existing merchant data while supporting the new multi-type structure

DO $$
BEGIN
    -- Step 1: Check if the old merchant_type column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'merchant'
        AND column_name = 'merchant_type'
    ) THEN

        RAISE NOTICE 'Starting migration of merchant_type to merchant_types table';

        -- Step 2: Create the merchant_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS merchant_types (
                                              merchant_id UUID NOT NULL,
                                              merchant_type VARCHAR(255) NOT NULL,
    CONSTRAINT fk_merchant_types_merchant FOREIGN KEY (merchant_id) REFERENCES merchant(id) ON DELETE CASCADE
    );

-- Step 3: Migrate existing data from merchant_type to merchant_types table
INSERT INTO merchant_types (merchant_id, merchant_type)
SELECT id, merchant_type
FROM merchant
WHERE merchant_type IS NOT NULL
    ON CONFLICT DO NOTHING;

RAISE NOTICE 'Migrated % merchants', (SELECT COUNT(*) FROM merchant WHERE merchant_type IS NOT NULL);

        -- Step 4: Drop the old merchant_type column
ALTER TABLE merchant DROP COLUMN merchant_type;

RAISE NOTICE 'Successfully dropped merchant_type column';

ELSE
        RAISE NOTICE 'Column merchant_type does not exist, migration already completed';
END IF;

    -- Step 5: Ensure proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchant_types_merchant_id ON merchant_types(merchant_id);

END $$;

COMMENT ON TABLE merchant_types IS 'Stores multiple merchant types per merchant (SUPPLIER, SERVICE). Migrated from single merchant_type column on 2025-01-17';