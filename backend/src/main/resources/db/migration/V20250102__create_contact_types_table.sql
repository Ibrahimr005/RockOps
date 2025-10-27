-- Create contact_types table
CREATE TABLE contact_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX idx_contact_types_name ON contact_types(name);
CREATE INDEX idx_contact_types_active ON contact_types(is_active);

-- Insert default contact types (proper case)
INSERT INTO contact_types (name, description, is_active) VALUES
('Technician', 'Technical maintenance personnel', true),
('Supervisor', 'Maintenance supervisor or team lead', true),
('Manager', 'Maintenance manager', true),
('Supplier', 'Equipment or parts supplier', true),
('Contractor', 'External contractor', true),
('Customer', 'Customer or client contact', true),
('Internal Staff', 'Internal company staff', true);

-- Add comment to table
COMMENT ON TABLE contact_types IS 'Defines different types of contacts that can be used in the maintenance system';
COMMENT ON COLUMN contact_types.name IS 'Unique name of the contact type';
COMMENT ON COLUMN contact_types.description IS 'Description of what this contact type represents';
COMMENT ON COLUMN contact_types.is_active IS 'Whether this contact type is active and available for use';
