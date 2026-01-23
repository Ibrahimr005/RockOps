-- V202512281__Offer_Financial_Review_Maintenance_Support.sql

-- 1. Update MaintenanceStatus constraint to allow new approval statuses
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_status_check;

ALTER TABLE maintenance_records
    ADD CONSTRAINT chk_status CHECK (status IN (
                                                'DRAFT',
                                                'PENDING_MANAGER_APPROVAL',
                                                'PENDING_FINANCE_APPROVAL',
                                                'ACTIVE',
                                                'COMPLETED',
                                                'REJECTED',
                                                'CANCELLED',
                                                'ON_HOLD'
        ));

-- 2. Make offer_id nullable (safe if already nullable)
DO $$
BEGIN
ALTER TABLE offer_financial_reviews
    ALTER COLUMN offer_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Add maintenance_record_id column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'offer_financial_reviews'
        AND column_name = 'maintenance_record_id'
    ) THEN
ALTER TABLE offer_financial_reviews
    ADD COLUMN maintenance_record_id UUID;
END IF;
END $$;