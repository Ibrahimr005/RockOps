-- ============================================================================
-- Migration: Add LOSS to PartyType Check Constraints
-- Version: V2026021408
-- Description: Updates check constraints to allow LOSS party type
-- ============================================================================

-- Drop existing check constraints
ALTER TABLE transaction
DROP CONSTRAINT IF EXISTS transaction_sender_type_check,
    DROP CONSTRAINT IF EXISTS transaction_receiver_type_check;

-- Recreate constraints with LOSS included
ALTER TABLE transaction
    ADD CONSTRAINT transaction_sender_type_check
        CHECK (sender_type IN ('WAREHOUSE', 'MERCHANT', 'EQUIPMENT', 'PROCUREMENT', 'LOSS'));

ALTER TABLE transaction
    ADD CONSTRAINT transaction_receiver_type_check
        CHECK (receiver_type IN ('WAREHOUSE', 'MERCHANT', 'EQUIPMENT', 'PROCUREMENT', 'LOSS'));

-- Verify constraints were created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'transaction_receiver_type_check'
    ) THEN
        RAISE NOTICE 'Successfully updated transaction check constraints to include LOSS';
ELSE
        RAISE EXCEPTION 'Failed to create transaction_receiver_type_check constraint';
END IF;
END $$;