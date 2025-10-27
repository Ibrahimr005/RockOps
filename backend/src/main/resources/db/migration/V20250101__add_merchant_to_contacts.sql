-- Add merchant_id column to contacts table
ALTER TABLE contacts ADD COLUMN merchant_id UUID;

-- Add foreign key constraint with ON DELETE SET NULL
-- This ensures contacts remain when merchant is deleted
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_merchant 
    FOREIGN KEY (merchant_id) REFERENCES merchant(id) ON DELETE SET NULL;

-- Create index for performance when querying contacts by merchant
CREATE INDEX idx_contacts_merchant_id ON contacts(merchant_id);

-- Add comment to document the relationship
COMMENT ON COLUMN contacts.merchant_id IS 'Optional reference to the merchant this contact belongs to. Null if contact is not associated with a merchant.';
