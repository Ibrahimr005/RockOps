-- Add the column without NOT NULL constraint first
ALTER TABLE merchant ADD COLUMN IF NOT EXISTS merchant_type VARCHAR(255);

-- Set default value for all existing rows
UPDATE merchant SET merchant_type = 'SUPPLIER' WHERE merchant_type IS NULL;

-- Now make it NOT NULL
ALTER TABLE merchant
    ALTER COLUMN merchant_type SET NOT NULL;

-- Add the check constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'merchant'
        AND constraint_name = 'merchant_type_check'
    ) THEN
ALTER TABLE merchant
    ADD CONSTRAINT merchant_type_check
        CHECK (merchant_type IN ('SUPPLIER','CUSTOMER','BOTH'));
END IF;
END $$;