-- Add the column without NOT NULL constraint first
ALTER TABLE merchant ADD COLUMN IF NOT EXISTS merchant_type VARCHAR(255);

-- Set default value for all existing rows
UPDATE merchant SET merchant_type = 'SUPPLIER' WHERE merchant_type IS NULL;

-- Now make it NOT NULL and add the check constraint
ALTER TABLE merchant
    ALTER COLUMN merchant_type SET NOT NULL;

ALTER TABLE merchant
    ADD CONSTRAINT merchant_type_check
        CHECK (merchant_type IN ('SUPPLIER','CUSTOMER','BOTH'));