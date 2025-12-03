-- Change direct purchase ticket responsible person from Contact to User
-- This migration updates the direct_purchase_tickets table to use a foreign key to the users table

DO $$
BEGIN
    -- Add new responsible_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'direct_purchase_tickets' AND column_name = 'responsible_user_id') THEN
        ALTER TABLE direct_purchase_tickets
        ADD COLUMN responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Drop old responsible_person_id column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'direct_purchase_tickets' AND column_name = 'responsible_person_id') THEN
        ALTER TABLE direct_purchase_tickets DROP COLUMN responsible_person_id;
    END IF;

    -- Create index for faster lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE indexname = 'idx_direct_purchase_tickets_responsible_user') THEN
        CREATE INDEX idx_direct_purchase_tickets_responsible_user ON direct_purchase_tickets(responsible_user_id);
    END IF;

    -- Make responsible_user_id NOT NULL after migration (assuming data is migrated)
    -- Note: If you have existing data, you'll need to populate this column first before making it NOT NULL
    -- ALTER TABLE direct_purchase_tickets ALTER COLUMN responsible_user_id SET NOT NULL;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN direct_purchase_tickets.responsible_user_id IS 'Reference to user responsible for this direct purchase ticket (Admin, Maintenance Manager, or Maintenance Employee)';
