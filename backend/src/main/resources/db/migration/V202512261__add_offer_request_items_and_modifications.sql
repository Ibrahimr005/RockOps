-- V<next_version>__add_offer_request_items_and_modifications.sql

-- Add new columns to Offer table if they don't exist
DO $$
BEGIN
    -- Check and add offerRequestItems relationship (this is handled by JPA, no column needed)
    -- Check and add requestItemModifications relationship (this is handled by JPA, no column needed)

    -- Add any new columns if needed (currently Offer model doesn't have new columns)
    -- All new fields are in separate tables

END $$;

-- Create OfferRequestItem table if not exists
CREATE TABLE IF NOT EXISTS offer_request_item (
                                                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL,
    item_type_id UUID NOT NULL,
    quantity DOUBLE PRECISION NOT NULL,
    comment TEXT,
    original_request_order_item_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    last_modified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(255) NOT NULL,

    CONSTRAINT fk_offer_request_item_offer
    FOREIGN KEY (offer_id) REFERENCES offer(id) ON DELETE CASCADE,
    CONSTRAINT fk_offer_request_item_item_type
    FOREIGN KEY (item_type_id) REFERENCES item_type(id) ON DELETE RESTRICT,
    CONSTRAINT fk_offer_request_item_original
    FOREIGN KEY (original_request_order_item_id) REFERENCES request_order_item(id) ON DELETE SET NULL
    );

-- Create indexes for OfferRequestItem if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_offer_request_item_offer_id') THEN
CREATE INDEX idx_offer_request_item_offer_id ON offer_request_item(offer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_offer_request_item_item_type_id') THEN
CREATE INDEX idx_offer_request_item_item_type_id ON offer_request_item(item_type_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_offer_request_item_original_id') THEN
CREATE INDEX idx_offer_request_item_original_id ON offer_request_item(original_request_order_item_id);
END IF;
END $$;

-- Create RequestItemModification table if not exists
CREATE TABLE IF NOT EXISTS request_item_modification (
                                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_by VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('ADD', 'EDIT', 'DELETE')),

    -- Item details at time of modification
    item_type_id UUID,
    item_type_name VARCHAR(255),
    item_type_measuring_unit VARCHAR(50),

    -- Tracking what changed
    old_quantity DOUBLE PRECISION,
    new_quantity DOUBLE PRECISION,
    old_comment TEXT,
    new_comment TEXT,

    -- Additional context
    notes TEXT,

    CONSTRAINT fk_request_item_modification_offer
    FOREIGN KEY (offer_id) REFERENCES offer(id) ON DELETE CASCADE
    );

-- Create indexes for RequestItemModification if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_request_item_modification_offer_id') THEN
CREATE INDEX idx_request_item_modification_offer_id ON request_item_modification(offer_id);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_request_item_modification_timestamp') THEN
CREATE INDEX idx_request_item_modification_timestamp ON request_item_modification(timestamp DESC);
END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_request_item_modification_action') THEN
CREATE INDEX idx_request_item_modification_action ON request_item_modification(action);
END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE offer_request_item IS 'Stores modified request items specific to each offer, overriding original RequestOrder items';
COMMENT ON TABLE request_item_modification IS 'Audit trail of all modifications made to request items within an offer';

COMMENT ON COLUMN offer_request_item.original_request_order_item_id IS 'Reference to the original RequestOrderItem this was copied from (if any)';
COMMENT ON COLUMN request_item_modification.action IS 'Type of modification: ADD, EDIT, or DELETE';
COMMENT ON COLUMN request_item_modification.item_type_id IS 'Snapshot of item type ID at time of modification';
COMMENT ON COLUMN request_item_modification.item_type_name IS 'Snapshot of item type name at time of modification';
COMMENT ON COLUMN request_item_modification.old_quantity IS 'Previous quantity value (for EDIT and DELETE actions)';
COMMENT ON COLUMN request_item_modification.new_quantity IS 'New quantity value (for ADD and EDIT actions)';

-- Grant permissions (adjust role names as needed)
DO $$
BEGIN
    -- Grant permissions if roles exist
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON offer_request_item TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON request_item_modification TO app_user;
END IF;
END $$;

-- Verify tables were created successfully
DO $$
DECLARE
table_count INTEGER;
BEGIN
SELECT COUNT(*) INTO table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('offer_request_item', 'request_item_modification');

IF table_count = 2 THEN
        RAISE NOTICE 'Successfully created/verified 2 tables: offer_request_item, request_item_modification';
ELSE
        RAISE WARNING 'Expected 2 tables but found %', table_count;
END IF;
END $$;