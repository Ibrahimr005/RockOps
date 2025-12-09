-- Change maintenance record responsible person from text fields to User reference
-- This migration updates the maintenance_records table to use a foreign key to the users table

DO $$
BEGIN
    -- Add new responsible_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'maintenance_records' AND column_name = 'responsible_user_id') THEN
        ALTER TABLE maintenance_records
        ADD COLUMN responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Drop old text-based responsible person columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'maintenance_records' AND column_name = 'current_responsible_person') THEN
        ALTER TABLE maintenance_records DROP COLUMN current_responsible_person;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'maintenance_records' AND column_name = 'current_responsible_phone') THEN
        ALTER TABLE maintenance_records DROP COLUMN current_responsible_phone;
    END IF;

    -- Create index for faster lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE indexname = 'idx_maintenance_records_responsible_user') THEN
        CREATE INDEX idx_maintenance_records_responsible_user ON maintenance_records(responsible_user_id);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN maintenance_records.responsible_user_id IS 'Reference to user responsible for this maintenance record (Admin, Maintenance Manager, or Maintenance Employee)';
