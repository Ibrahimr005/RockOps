-- External Maintenance Tracking System Database Schema
-- Version 1.0

-- Maintenance Records Table
CREATE TABLE maintenance_records (
    id BIGSERIAL PRIMARY KEY,
    equipment_id UUID NOT NULL,
    equipment_info VARCHAR(255),
    initial_issue_description TEXT NOT NULL,
    final_description TEXT,
    creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_completion_date TIMESTAMP NOT NULL,
    actual_completion_date TIMESTAMP,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    current_responsible_person VARCHAR(255) NOT NULL,
    current_responsible_phone VARCHAR(20),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0,
    
    CONSTRAINT fk_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    CONSTRAINT chk_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED')),
    CONSTRAINT chk_total_cost CHECK (total_cost >= 0),
    CONSTRAINT chk_expected_completion_future CHECK (expected_completion_date > creation_date)
);

-- Maintenance Steps Table
CREATE TABLE maintenance_steps (
    id BIGSERIAL PRIMARY KEY,
    maintenance_record_id BIGINT NOT NULL,
    step_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    responsible_person VARCHAR(255) NOT NULL,
    person_phone_number VARCHAR(20),
    last_contact_date TIMESTAMP,
    start_date TIMESTAMP NOT NULL,
    expected_end_date TIMESTAMP NOT NULL,
    actual_end_date TIMESTAMP,
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    step_cost DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0,
    
    CONSTRAINT fk_maintenance_record FOREIGN KEY (maintenance_record_id) 
        REFERENCES maintenance_records(id) ON DELETE CASCADE,
    CONSTRAINT chk_step_type CHECK (step_type IN ('TRANSPORT', 'INSPECTION', 'REPAIR', 'TESTING', 'DIAGNOSIS', 'ESCALATION', 'RETURN_TO_SERVICE')),
    CONSTRAINT chk_step_cost CHECK (step_cost >= 0),
    CONSTRAINT chk_expected_end_future CHECK (expected_end_date > start_date),
    CONSTRAINT chk_phone_format CHECK (person_phone_number ~ '^\+?[1-9]\d{1,14}$')
);

-- Contact Logs Table
CREATE TABLE contact_logs (
    id BIGSERIAL PRIMARY KEY,
    maintenance_step_id BIGINT NOT NULL,
    maintenance_record_id BIGINT NOT NULL,
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
    CONSTRAINT chk_contact_status CHECK (contact_status IN ('SUCCESSFUL', 'NO_ANSWER', 'LEFT_MESSAGE', 'CALL_BACK_REQUESTED', 'EMAIL_SENT', 'SMS_SENT'))
);

-- Indexes for Performance
CREATE INDEX idx_maintenance_records_equipment_id ON maintenance_records(equipment_id);
CREATE INDEX idx_maintenance_records_status ON maintenance_records(status);
CREATE INDEX idx_maintenance_records_equipment ON maintenance_records(equipment_info);
CREATE INDEX idx_maintenance_records_responsible ON maintenance_records(current_responsible_person);
CREATE INDEX idx_maintenance_records_creation_date ON maintenance_records(creation_date);
CREATE INDEX idx_maintenance_records_expected_completion ON maintenance_records(expected_completion_date);
CREATE INDEX idx_maintenance_records_actual_completion ON maintenance_records(actual_completion_date);

CREATE INDEX idx_maintenance_steps_record_id ON maintenance_steps(maintenance_record_id);
CREATE INDEX idx_maintenance_steps_type ON maintenance_steps(step_type);
CREATE INDEX idx_maintenance_steps_responsible ON maintenance_steps(responsible_person);
CREATE INDEX idx_maintenance_steps_start_date ON maintenance_steps(start_date);
CREATE INDEX idx_maintenance_steps_expected_end ON maintenance_steps(expected_end_date);
CREATE INDEX idx_maintenance_steps_actual_end ON maintenance_steps(actual_end_date);
CREATE INDEX idx_maintenance_steps_location ON maintenance_steps(from_location, to_location);

CREATE INDEX idx_contact_logs_step_id ON contact_logs(maintenance_step_id);
CREATE INDEX idx_contact_logs_record_id ON contact_logs(maintenance_record_id);
CREATE INDEX idx_contact_logs_contact_person ON contact_logs(contact_person);
CREATE INDEX idx_contact_logs_contact_date ON contact_logs(contact_date);
CREATE INDEX idx_contact_logs_follow_up ON contact_logs(follow_up_required, follow_up_date);
CREATE INDEX idx_contact_logs_status ON contact_logs(contact_status);

-- Composite indexes for common queries
CREATE INDEX idx_maintenance_records_equipment_status ON maintenance_records(equipment_id, status);
CREATE INDEX idx_maintenance_records_status_date ON maintenance_records(status, expected_completion_date);
CREATE INDEX idx_maintenance_steps_record_status ON maintenance_steps(maintenance_record_id, actual_end_date);
CREATE INDEX idx_contact_logs_step_date ON contact_logs(maintenance_step_id, contact_date);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_records_updated_at 
    BEFORE UPDATE ON maintenance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_steps_updated_at 
    BEFORE UPDATE ON maintenance_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total cost for a maintenance record
CREATE OR REPLACE FUNCTION calculate_maintenance_total_cost(record_id BIGINT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(step_cost), 0.00) INTO total
    FROM maintenance_steps
    WHERE maintenance_record_id = record_id;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to update total cost when steps are modified
CREATE OR REPLACE FUNCTION update_maintenance_total_cost()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE maintenance_records 
        SET total_cost = calculate_maintenance_total_cost(OLD.maintenance_record_id)
        WHERE id = OLD.maintenance_record_id;
        RETURN OLD;
    ELSE
        UPDATE maintenance_records 
        SET total_cost = calculate_maintenance_total_cost(NEW.maintenance_record_id)
        WHERE id = NEW.maintenance_record_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_total_cost_on_step_change
    AFTER INSERT OR UPDATE OR DELETE ON maintenance_steps
    FOR EACH ROW EXECUTE FUNCTION update_maintenance_total_cost();

-- Function to check for overdue records
CREATE OR REPLACE FUNCTION get_overdue_maintenance_records()
RETURNS TABLE (
    id BIGINT,
    equipment_id UUID,
    equipment_info VARCHAR(255),
    expected_completion_date TIMESTAMP,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mr.id,
        mr.equipment_id,
        mr.equipment_info,
        mr.expected_completion_date,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - mr.expected_completion_date))::INTEGER as days_overdue
    FROM maintenance_records mr
    WHERE mr.status = 'ACTIVE' 
    AND mr.expected_completion_date < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to get maintenance statistics
CREATE OR REPLACE FUNCTION get_maintenance_statistics()
RETURNS TABLE (
    total_records BIGINT,
    active_records BIGINT,
    completed_records BIGINT,
    overdue_records BIGINT,
    total_cost DECIMAL(10,2),
    avg_completion_days DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_records,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_records,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND expected_completion_date < CURRENT_TIMESTAMP) as overdue_records,
        COALESCE(SUM(total_cost), 0.00) as total_cost,
        COALESCE(AVG(EXTRACT(DAY FROM (actual_completion_date - creation_date))), 0.00) as avg_completion_days
    FROM maintenance_records;
END;
$$ LANGUAGE plpgsql;

-- Function to get maintenance records by equipment
CREATE OR REPLACE FUNCTION get_maintenance_records_by_equipment(equipment_uuid UUID)
RETURNS TABLE (
    id BIGINT,
    equipment_id UUID,
    equipment_info VARCHAR(255),
    initial_issue_description TEXT,
    creation_date TIMESTAMP,
    status VARCHAR(20),
    total_cost DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mr.id,
        mr.equipment_id,
        mr.equipment_info,
        mr.initial_issue_description,
        mr.creation_date,
        mr.status,
        mr.total_cost
    FROM maintenance_records mr
    WHERE mr.equipment_id = equipment_uuid
    ORDER BY mr.creation_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (requires existing equipment)
-- Note: This will only work if there's an equipment record with the specified UUID
-- INSERT INTO maintenance_records (
--     equipment_id,
--     equipment_info, 
--     initial_issue_description, 
--     expected_completion_date, 
--     current_responsible_person, 
--     current_responsible_phone
-- ) VALUES (
--     '550e8400-e29b-41d4-a716-446655440000', -- Replace with actual equipment UUID
--     'Generator Unit #G001',
--     'Engine failure - suspected air intake problem',
--     CURRENT_TIMESTAMP + INTERVAL '7 days',
--     'John Smith',
--     '+1-555-0123'
-- );

-- Comments for documentation
COMMENT ON TABLE maintenance_records IS 'Main table for tracking maintenance records from failure to completion';
COMMENT ON TABLE maintenance_steps IS 'Individual steps in the maintenance process with responsible parties and costs';
COMMENT ON TABLE contact_logs IS 'Communication tracking for all contact attempts with responsible parties';
COMMENT ON FUNCTION calculate_maintenance_total_cost(BIGINT) IS 'Calculates total cost for a maintenance record';
COMMENT ON FUNCTION get_overdue_maintenance_records() IS 'Returns all overdue maintenance records';
COMMENT ON FUNCTION get_maintenance_statistics() IS 'Returns overall maintenance statistics for dashboard';
COMMENT ON FUNCTION get_maintenance_records_by_equipment(UUID) IS 'Returns all maintenance records for a specific equipment'; 