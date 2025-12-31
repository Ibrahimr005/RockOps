-- Fix Maintenance Record Status Constraint
-- Ensures the database constraint matches the MaintenanceStatus enum in the code

-- Drop potential existing constraints with different names to clean up
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_status_check;

-- Add the correct constraint with all current enum values
ALTER TABLE maintenance_records ADD CONSTRAINT maintenance_records_status_check 
    CHECK (status IN (
        'DRAFT',
        'PENDING_MANAGER_APPROVAL',
        'PENDING_FINANCE_APPROVAL',
        'APPROVED_BY_FINANCE',
        'ACTIVE',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
        'ON_HOLD'
    ));
