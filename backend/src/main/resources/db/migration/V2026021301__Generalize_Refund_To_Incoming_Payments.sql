-- V2026021301__Generalize_Refund_To_Incoming_Payments.sql
-- Rename refund tables to incoming_payment tables and add source tracking

-- Step 1: Add source column to refund_requests if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'refund_requests' AND column_name = 'source') THEN
ALTER TABLE refund_requests ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'REFUND';
END IF;
END $$;

-- Step 2: Add source_reference_id column for linking to source entity (PO Return, etc.)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'refund_requests' AND column_name = 'source_reference_id') THEN
ALTER TABLE refund_requests ADD COLUMN source_reference_id UUID;
END IF;
END $$;

-- Step 3: Rename refund_requests table to incoming_payment_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refund_requests') THEN
ALTER TABLE refund_requests RENAME TO incoming_payment_requests;
END IF;
END $$;

-- Step 4: Rename refund_request_items table to incoming_payment_request_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refund_request_items') THEN
ALTER TABLE refund_request_items RENAME TO incoming_payment_request_items;
END IF;
END $$;

-- Step 5: Rename foreign key column in items table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'incoming_payment_request_items' AND column_name = 'refund_request_id') THEN
ALTER TABLE incoming_payment_request_items
    RENAME COLUMN refund_request_id TO incoming_payment_request_id;
END IF;
END $$;

-- Step 6: Update constraint names (drop old, create new)
DO $$
BEGIN
    -- Drop old foreign key constraint if exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%refund_request_id%') THEN
ALTER TABLE incoming_payment_request_items
DROP CONSTRAINT IF EXISTS refund_request_items_refund_request_id_fkey;
END IF;

    -- Add new foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incoming_payment_request') THEN
ALTER TABLE incoming_payment_request_items
    ADD CONSTRAINT fk_incoming_payment_request
        FOREIGN KEY (incoming_payment_request_id) REFERENCES incoming_payment_requests(id) ON DELETE CASCADE;
END IF;
END $$;

-- Step 7: Create indexes for new columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incoming_payment_source') THEN
CREATE INDEX idx_incoming_payment_source ON incoming_payment_requests(source);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incoming_payment_source_ref') THEN
CREATE INDEX idx_incoming_payment_source_ref ON incoming_payment_requests(source_reference_id);
END IF;
END $$;

-- Step 8: Add comments
COMMENT ON TABLE incoming_payment_requests IS 'Tracks all incoming payments to the company (refunds, PO returns, etc.)';
COMMENT ON COLUMN incoming_payment_requests.source IS 'Source type: REFUND, PO_RETURN';
COMMENT ON COLUMN incoming_payment_requests.source_reference_id IS 'Optional reference to source entity (e.g., PurchaseOrderReturn ID)';