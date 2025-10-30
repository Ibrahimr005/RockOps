-- Migration to update contacts table to use UUIDs and remove phone number constraints for Egypt

-- Drop existing foreign key constraints that reference contacts
ALTER TABLE maintenance_steps DROP CONSTRAINT IF EXISTS fk_maintenance_steps_contact;
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS fk_maintenance_records_contact;
ALTER TABLE contact_logs DROP CONSTRAINT IF EXISTS fk_contact_logs_contact;

-- Drop existing contacts table if it exists
DROP TABLE IF EXISTS contacts CASCADE;

-- Create new contacts table with UUID
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(50),
    alternate_phone VARCHAR(50),
    contact_type VARCHAR(50) NOT NULL,
    company VARCHAR(255),
    position VARCHAR(255),
    department VARCHAR(255),
    specialization VARCHAR(255),
    availability_hours VARCHAR(255),
    emergency_contact BOOLEAN DEFAULT FALSE,
    preferred_contact_method VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Add contact_id columns to related tables with UUID type
ALTER TABLE maintenance_steps ADD COLUMN IF NOT EXISTS responsible_contact_id UUID;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS current_responsible_contact_id UUID;
ALTER TABLE contact_logs ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Add foreign key constraints
ALTER TABLE maintenance_steps 
ADD CONSTRAINT fk_maintenance_steps_contact 
FOREIGN KEY (responsible_contact_id) REFERENCES contacts(id);

ALTER TABLE maintenance_records 
ADD CONSTRAINT fk_maintenance_records_contact 
FOREIGN KEY (current_responsible_contact_id) REFERENCES contacts(id);

ALTER TABLE contact_logs 
ADD CONSTRAINT fk_contact_logs_contact 
FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_maintenance_steps_contact ON maintenance_steps(responsible_contact_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_contact ON maintenance_records(current_responsible_contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_contact ON contact_logs(contact_id);

-- Insert sample contacts for testing
INSERT INTO contacts (
    id, first_name, last_name, email, phone_number, contact_type, 
    company, position, is_active, created_at
) VALUES 
    (gen_random_uuid(), 'Ahmed', 'Mohamed', 'ahmed.mohamed@example.com', '01234567890', 'TECHNICIAN', 'Egyptian Engineering Co.', 'Senior Technician', true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Fatima', 'Ali', 'fatima.ali@example.com', '01234567891', 'SUPERVISOR', 'Cairo Maintenance Ltd.', 'Maintenance Supervisor', true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Omar', 'Hassan', 'omar.hassan@example.com', '01234567892', 'MANAGER', 'Alexandria Equipment Co.', 'Operations Manager', true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Aisha', 'Mahmoud', 'aisha.mahmoud@example.com', '01234567893', 'SUPPLIER', 'Delta Parts Supply', 'Sales Representative', true, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Khalid', 'Ibrahim', 'khalid.ibrahim@example.com', '01234567894', 'CONTRACTOR', 'Sinai Contracting', 'Project Manager', true, CURRENT_TIMESTAMP); 