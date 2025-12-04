-- Migration: Add 4-step workflow fields to direct_purchase_tickets
-- This adds support for the new 4-step workflow while maintaining backwards compatibility with legacy tickets

-- ========== 1. Create direct_purchase_items table ==========
CREATE TABLE IF NOT EXISTS direct_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direct_purchase_ticket_id UUID NOT NULL REFERENCES direct_purchase_tickets(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    expected_cost_per_unit DECIMAL(10, 2) CHECK (expected_cost_per_unit >= 0),
    actual_cost_per_unit DECIMAL(10, 2) CHECK (actual_cost_per_unit >= 0),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    version BIGINT
);

CREATE INDEX idx_direct_purchase_items_ticket_id ON direct_purchase_items(direct_purchase_ticket_id);
CREATE INDEX idx_direct_purchase_items_created_at ON direct_purchase_items(created_at);

-- ========== 2. Add new columns to direct_purchase_tickets ==========

-- Title and legacy flag
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS is_legacy_ticket BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS current_step VARCHAR(50) NOT NULL DEFAULT 'CREATION';

-- Step 1 - Creation timestamps
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step1_started_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step1_completed_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step1_completed BOOLEAN NOT NULL DEFAULT false;

-- Step 2 - Purchasing
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS down_payment DECIMAL(10, 2) CHECK (down_payment >= 0);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step2_started_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step2_completed_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step2_completed BOOLEAN NOT NULL DEFAULT false;

-- Step 3 - Finalize Purchasing
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS actual_total_purchasing_cost DECIMAL(10, 2) CHECK (actual_total_purchasing_cost >= 0);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS remaining_payment DECIMAL(10, 2);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step3_started_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step3_completed_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step3_completed BOOLEAN NOT NULL DEFAULT false;

-- Step 4 - Transporting
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS transport_from_location VARCHAR(500);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS transport_to_site_id UUID REFERENCES site(id);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS actual_transportation_cost DECIMAL(10, 2) CHECK (actual_transportation_cost >= 0);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS transport_responsible_contact_id UUID REFERENCES contacts(id);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS transport_responsible_employee_id UUID REFERENCES employee(id);
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step4_started_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step4_completed_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE direct_purchase_tickets ADD COLUMN IF NOT EXISTS step4_completed BOOLEAN NOT NULL DEFAULT false;

-- Completion timestamp
ALTER TABLE  direct_purchase_tickets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE;

-- ========== 3. Mark all existing tickets as legacy ==========
UPDATE direct_purchase_tickets SET is_legacy_ticket = true WHERE is_legacy_ticket = false;

-- ========== 4. Modify existing columns to be nullable for new workflow ==========
-- For new workflow, spare_part is deprecated (use items instead)
-- For legacy tickets, these fields remain required
ALTER TABLE direct_purchase_tickets ALTER COLUMN spare_part DROP NOT NULL;
ALTER TABLE direct_purchase_tickets ALTER COLUMN expected_parts_cost DROP NOT NULL;
ALTER TABLE direct_purchase_tickets ALTER COLUMN expected_transportation_cost DROP NOT NULL;

-- ========== 5. Create indexes for performance ==========
CREATE INDEX IF NOT EXISTS idx_direct_purchase_tickets_current_step ON direct_purchase_tickets(current_step);
CREATE INDEX IF NOT EXISTS idx_direct_purchase_tickets_is_legacy ON direct_purchase_tickets(is_legacy_ticket);
CREATE INDEX IF NOT EXISTS idx_direct_purchase_tickets_transport_to_site ON direct_purchase_tickets(transport_to_site_id);
CREATE INDEX IF NOT EXISTS idx_direct_purchase_tickets_transport_contact ON direct_purchase_tickets(transport_responsible_contact_id);
CREATE INDEX IF NOT EXISTS idx_direct_purchase_tickets_transport_employee ON direct_purchase_tickets(transport_responsible_employee_id);
CREATE INDEX IF NOT EXISTS idx_direct_purchase_tickets_completed_at ON direct_purchase_tickets(completed_at);

-- ========== 6. Add constraints ==========
-- Ensure exactly one transport responsible person is set (either contact OR employee, not both)
ALTER TABLE direct_purchase_tickets ADD CONSTRAINT chk_transport_responsible_one_only
    CHECK (
        (transport_responsible_contact_id IS NOT NULL AND transport_responsible_employee_id IS NULL) OR
        (transport_responsible_contact_id IS NULL AND transport_responsible_employee_id IS NOT NULL) OR
        (transport_responsible_contact_id IS NULL AND transport_responsible_employee_id IS NULL)
    );

-- ========== 7. Comments for documentation ==========
COMMENT ON TABLE direct_purchase_items IS 'Individual items for direct purchase tickets (new 4-step workflow)';
COMMENT ON COLUMN direct_purchase_tickets.is_legacy_ticket IS 'True for old 2-step tickets, false for new 4-step workflow';
COMMENT ON COLUMN direct_purchase_tickets.current_step IS 'Current workflow step: CREATION, PURCHASING, FINALIZE_PURCHASING, TRANSPORTING, or COMPLETED';
COMMENT ON COLUMN direct_purchase_tickets.title IS 'Ticket title (new workflow only)';
COMMENT ON COLUMN direct_purchase_tickets.spare_part IS 'Legacy field for old tickets, deprecated for new workflow';
