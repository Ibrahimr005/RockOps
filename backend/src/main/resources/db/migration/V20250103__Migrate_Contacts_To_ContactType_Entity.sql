-- Migration to convert Contact.contactType from enum to ContactType entity reference
-- Step 1: Add new column for contact_type_id
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type_id UUID;

-- Step 2: Insert existing enum values as ContactType entities if they don't exist
INSERT INTO contact_types (id, name, description, is_active, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'TECHNICIAN', 'Technical maintenance personnel', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SUPERVISOR', 'Maintenance supervisor', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'MANAGER', 'Site or department manager', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SUPPLIER', 'Equipment or parts supplier', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CONTRACTOR', 'External contractor', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CUSTOMER', 'Customer or client', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'INTERNAL_STAFF', 'Internal staff member', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Map existing enum values to ContactType entity IDs
UPDATE contacts c
SET contact_type_id = (
    SELECT ct.id 
    FROM contact_types ct 
    WHERE ct.name = c.contact_type
)
WHERE c.contact_type IS NOT NULL;

-- Step 4: Make contact_type_id NOT NULL after migration
ALTER TABLE contacts ALTER COLUMN contact_type_id SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE contacts ADD CONSTRAINT fk_contact_type 
    FOREIGN KEY (contact_type_id) REFERENCES contact_types(id);

-- Step 6: Drop the old enum column
ALTER TABLE contacts DROP COLUMN IF EXISTS contact_type;

-- Step 7: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type_id ON contacts(contact_type_id);

