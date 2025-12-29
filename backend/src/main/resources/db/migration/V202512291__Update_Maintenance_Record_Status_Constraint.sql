-- Update check constraint for maintenance_records status
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_status_check;

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
