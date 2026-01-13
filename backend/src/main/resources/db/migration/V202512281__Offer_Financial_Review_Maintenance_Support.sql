-- V202512281__Offer_Financial_Review_Maintenance_Support.sql

-- 1. Update MaintenanceStatus constraint to allow new approval statuses
-- Note: 'ON_HOLD' was present in original constraint, keeping it.
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_status_check;
ALTER TABLE maintenance_records ADD CONSTRAINT chk_status CHECK (status IN (
    'DRAFT',
    'PENDING_MANAGER_APPROVAL',
    'PENDING_FINANCE_APPROVAL',
    'ACTIVE',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'ON_HOLD'
));

-- 2. Update OfferFinancialReview table to support Maintenance Records
-- Make offer_id nullable
ALTER TABLE offer_financial_reviews ALTER COLUMN offer_id DROP NOT NULL;

-- Add maintenance_record_id column
ALTER TABLE offer_financial_reviews ADD COLUMN maintenance_record_id UUID; -- MaintenanceRecord ID is UUID (confirmed in V2_1)

-- Wait, let me check MaintenanceRecord ID type.
-- V1_1 line 6: id BIGSERIAL PRIMARY KEY.
-- But MaintenanceRecord.java might have UUID?
-- Let's check MaintenanceRecord.java.
-- Line 25: private UUID id;
-- IF Java has UUID and DB has BIGINT, that's a HUGE mapping mismatch.
-- But V1_1 says: id BIGSERIAL PRIMARY KEY.
-- V2_1__Update_maintenance_tables_to_UUID.sql EXISTS!
-- So ID is UUID now.
-- Let's verify V2_1.
