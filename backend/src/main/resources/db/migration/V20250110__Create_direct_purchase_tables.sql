-- Create direct_purchase_tickets table
CREATE TABLE IF NOT EXISTS direct_purchase_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    responsible_person_id UUID NOT NULL,
    spare_part VARCHAR(255) NOT NULL,
    expected_parts_cost DECIMAL(10, 2) NOT NULL CHECK (expected_parts_cost >= 0),
    expected_transportation_cost DECIMAL(10, 2) NOT NULL CHECK (expected_transportation_cost >= 0),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,

    CONSTRAINT fk_direct_purchase_equipment
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
    CONSTRAINT fk_direct_purchase_merchant
        FOREIGN KEY (merchant_id) REFERENCES merchant(id) ON DELETE RESTRICT,
    CONSTRAINT fk_direct_purchase_responsible_person
        FOREIGN KEY (responsible_person_id) REFERENCES contacts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_direct_purchase_status
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

-- Create direct_purchase_steps table
CREATE TABLE IF NOT EXISTS direct_purchase_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direct_purchase_ticket_id UUID NOT NULL,
    step_number INTEGER NOT NULL CHECK (step_number IN (1, 2)),
    step_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    responsible_person VARCHAR(255),
    phone_number VARCHAR(50),
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    expected_cost DECIMAL(10, 2) NOT NULL CHECK (expected_cost >= 0),
    advanced_payment DECIMAL(10, 2) DEFAULT 0.00 CHECK (advanced_payment >= 0),
    actual_cost DECIMAL(10, 2) CHECK (actual_cost >= 0),
    description TEXT,
    last_checked TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,

    CONSTRAINT fk_direct_purchase_step_ticket
        FOREIGN KEY (direct_purchase_ticket_id) REFERENCES direct_purchase_tickets(id) ON DELETE CASCADE,
    CONSTRAINT chk_direct_purchase_step_status
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT chk_advanced_payment_le_actual_cost
        CHECK (actual_cost IS NULL OR advanced_payment <= actual_cost),
    CONSTRAINT uk_direct_purchase_step_number
        UNIQUE (direct_purchase_ticket_id, step_number)
);

-- Create indexes for better performance
CREATE INDEX idx_direct_purchase_tickets_equipment ON direct_purchase_tickets(equipment_id);
CREATE INDEX idx_direct_purchase_tickets_merchant ON direct_purchase_tickets(merchant_id);
CREATE INDEX idx_direct_purchase_tickets_responsible_person ON direct_purchase_tickets(responsible_person_id);
CREATE INDEX idx_direct_purchase_tickets_status ON direct_purchase_tickets(status);
CREATE INDEX idx_direct_purchase_tickets_created_at ON direct_purchase_tickets(created_at DESC);

CREATE INDEX idx_direct_purchase_steps_ticket ON direct_purchase_steps(direct_purchase_ticket_id);
CREATE INDEX idx_direct_purchase_steps_status ON direct_purchase_steps(status);
CREATE INDEX idx_direct_purchase_steps_step_number ON direct_purchase_steps(step_number);

-- Add comments for documentation
COMMENT ON TABLE direct_purchase_tickets IS 'Direct purchase tickets for equipment spare parts and transportation';
COMMENT ON TABLE direct_purchase_steps IS 'Auto-generated steps for direct purchase workflow (Purchasing and Transporting)';

COMMENT ON COLUMN direct_purchase_tickets.spare_part IS 'Name of the spare part being purchased';
COMMENT ON COLUMN direct_purchase_tickets.expected_parts_cost IS 'Expected cost for purchasing the spare parts';
COMMENT ON COLUMN direct_purchase_tickets.expected_transportation_cost IS 'Expected cost for transporting the spare parts';
COMMENT ON COLUMN direct_purchase_tickets.status IS 'Ticket status: IN_PROGRESS, COMPLETED, or CANCELLED';

COMMENT ON COLUMN direct_purchase_steps.step_number IS 'Step number: 1 for Purchasing, 2 for Transporting';
COMMENT ON COLUMN direct_purchase_steps.step_name IS 'Step name: Purchasing or Transporting';
COMMENT ON COLUMN direct_purchase_steps.advanced_payment IS 'Amount paid in advance';
COMMENT ON COLUMN direct_purchase_steps.actual_cost IS 'Actual cost after step completion';
