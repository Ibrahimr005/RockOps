-- Migration: Add maintenance step linkage to payment_requests table
-- This allows payment requests to be created from maintenance steps (not just purchase orders)
-- Using IF NOT EXISTS to make this idempotent (safe to re-run)

DO $$
BEGIN
    -- Only proceed if payment_requests table exists
    IF EXISTS (SELECT FROM information_schema.tables
               WHERE table_name = 'payment_requests') THEN

        -- Step 1: Make purchase_order_id nullable (currently NOT NULL)
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'payment_requests'
                   AND column_name = 'purchase_order_id'
                   AND is_nullable = 'NO') THEN
ALTER TABLE payment_requests
    ALTER COLUMN purchase_order_id DROP NOT NULL;
END IF;

        -- Step 2: Add maintenance_step_id column (if not exists)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'payment_requests'
                       AND column_name = 'maintenance_step_id') THEN
ALTER TABLE payment_requests ADD COLUMN maintenance_step_id UUID;
END IF;

        -- Step 3: Add maintenance_record_id column (if not exists)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'payment_requests'
                       AND column_name = 'maintenance_record_id') THEN
ALTER TABLE payment_requests ADD COLUMN maintenance_record_id UUID;
END IF;

        -- Step 4: Add foreign key constraints (if not exist)
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'fk_payment_request_maintenance_step') THEN
ALTER TABLE payment_requests
    ADD CONSTRAINT fk_payment_request_maintenance_step
        FOREIGN KEY (maintenance_step_id)
            REFERENCES maintenance_steps(id);
END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'fk_payment_request_maintenance_record') THEN
ALTER TABLE payment_requests
    ADD CONSTRAINT fk_payment_request_maintenance_record
        FOREIGN KEY (maintenance_record_id)
            REFERENCES maintenance_records(id);
END IF;

        -- Step 5: Add unique constraint (if not exist)
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'uq_payment_request_maintenance_step') THEN
ALTER TABLE payment_requests
    ADD CONSTRAINT uq_payment_request_maintenance_step
        UNIQUE (maintenance_step_id);
END IF;

        -- Step 6: Add index (if not exists)
CREATE INDEX IF NOT EXISTS idx_payment_requests_maintenance_record
    ON payment_requests(maintenance_record_id);

END IF;
END $$;