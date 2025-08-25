-- Migration to update maintenance tables to use UUIDs and new contact-based structure
-- Version 2.0

-- First, add new UUID columns
ALTER TABLE maintenance_records ADD COLUMN id_new UUID;
ALTER TABLE maintenance_steps ADD COLUMN id_new UUID;
ALTER TABLE maintenance_steps ADD COLUMN maintenance_record_id_new UUID;

-- Generate UUIDs for existing records
UPDATE maintenance_records SET id_new = gen_random_uuid() WHERE id_new IS NULL;
UPDATE maintenance_steps SET id_new = gen_random_uuid() WHERE id_new IS NULL;

-- Update foreign key references
UPDATE maintenance_steps 
SET maintenance_record_id_new = mr.id_new 
FROM maintenance_records mr 
WHERE maintenance_steps.maintenance_record_id = mr.id;

-- Add new contact-related columns
ALTER TABLE maintenance_records ADD COLUMN current_responsible_contact_id UUID;
ALTER TABLE maintenance_steps ADD COLUMN responsible_contact_id UUID;

-- Drop old constraints
ALTER TABLE maintenance_steps DROP CONSTRAINT IF EXISTS fk_maintenance_record;
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_pkey;
ALTER TABLE maintenance_steps DROP CONSTRAINT IF EXISTS maintenance_steps_pkey;

-- Drop old columns
ALTER TABLE maintenance_records DROP COLUMN current_responsible_person;
ALTER TABLE maintenance_records DROP COLUMN current_responsible_phone;
ALTER TABLE maintenance_steps DROP COLUMN responsible_person;
ALTER TABLE maintenance_steps DROP COLUMN person_phone_number;

-- Rename new columns to replace old ones
ALTER TABLE maintenance_records DROP COLUMN id;
ALTER TABLE maintenance_records RENAME COLUMN id_new TO id;
ALTER TABLE maintenance_steps DROP COLUMN id;
ALTER TABLE maintenance_steps RENAME COLUMN id_new TO id;
ALTER TABLE maintenance_steps DROP COLUMN maintenance_record_id;
ALTER TABLE maintenance_steps RENAME COLUMN maintenance_record_id_new TO maintenance_record_id;

-- Add new primary key constraints
ALTER TABLE maintenance_records ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);
ALTER TABLE maintenance_steps ADD CONSTRAINT maintenance_steps_pkey PRIMARY KEY (id);

-- Add foreign key constraints
ALTER TABLE maintenance_steps 
ADD CONSTRAINT fk_maintenance_record 
FOREIGN KEY (maintenance_record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE;

-- Add foreign key constraints for contacts (assuming contacts table exists)
ALTER TABLE maintenance_records 
ADD CONSTRAINT fk_maintenance_record_contact 
FOREIGN KEY (current_responsible_contact_id) REFERENCES contacts(id);

ALTER TABLE maintenance_steps 
ADD CONSTRAINT fk_maintenance_step_contact 
FOREIGN KEY (responsible_contact_id) REFERENCES contacts(id);

-- Make responsible_contact_id NOT NULL for new records
ALTER TABLE maintenance_steps ALTER COLUMN responsible_contact_id SET NOT NULL;

-- Update indexes
DROP INDEX IF EXISTS idx_maintenance_records_id;
DROP INDEX IF EXISTS idx_maintenance_steps_id;
DROP INDEX IF EXISTS idx_maintenance_steps_record_id;

CREATE INDEX idx_maintenance_records_id ON maintenance_records(id);
CREATE INDEX idx_maintenance_steps_id ON maintenance_steps(id);
CREATE INDEX idx_maintenance_steps_record_id ON maintenance_steps(maintenance_record_id);
CREATE INDEX idx_maintenance_records_contact ON maintenance_records(current_responsible_contact_id);
CREATE INDEX idx_maintenance_steps_contact ON maintenance_steps(responsible_contact_id);

-- Add sequence for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 