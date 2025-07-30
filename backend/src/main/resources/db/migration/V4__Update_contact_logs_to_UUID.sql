-- Migration to update contact_logs table to use UUIDs for maintenance references
-- Version 4.0

-- Drop existing foreign key constraints
ALTER TABLE contact_logs DROP CONSTRAINT IF EXISTS fk_maintenance_step;
ALTER TABLE contact_logs DROP CONSTRAINT IF EXISTS fk_maintenance_record_contact;

-- Drop existing contact_logs table if it exists
DROP TABLE IF EXISTS contact_logs CASCADE;

-- Recreate contact_logs table with UUID references
CREATE TABLE contact_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_step_id UUID NOT NULL,
    maintenance_record_id UUID NOT NULL,
    contact_id UUID,
    contact_method VARCHAR(50) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_details TEXT,
    contact_status VARCHAR(20) NOT NULL,
    response_received BOOLEAN DEFAULT FALSE,
    response_details TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP,
    contact_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    CONSTRAINT fk_maintenance_step FOREIGN KEY (maintenance_step_id) 
        REFERENCES maintenance_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_record_contact FOREIGN KEY (maintenance_record_id) 
        REFERENCES maintenance_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_contact_logs_contact FOREIGN KEY (contact_id) 
        REFERENCES contacts(id),
    CONSTRAINT chk_contact_status CHECK (contact_status IN ('SUCCESSFUL', 'NO_ANSWER', 'LEFT_MESSAGE', 'CALL_BACK_REQUESTED', 'EMAIL_SENT', 'SMS_SENT'))
);

-- Create indexes for better performance
CREATE INDEX idx_contact_logs_step_id ON contact_logs(maintenance_step_id);
CREATE INDEX idx_contact_logs_record_id ON contact_logs(maintenance_record_id);
CREATE INDEX idx_contact_logs_contact_person ON contact_logs(contact_person);
CREATE INDEX idx_contact_logs_contact_date ON contact_logs(contact_date);
CREATE INDEX idx_contact_logs_follow_up ON contact_logs(follow_up_required, follow_up_date);
CREATE INDEX idx_contact_logs_status ON contact_logs(contact_status);
CREATE INDEX idx_contact_logs_step_date ON contact_logs(maintenance_step_id, contact_date);
CREATE INDEX idx_contact_logs_contact ON contact_logs(contact_id); 