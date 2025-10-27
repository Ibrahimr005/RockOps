-- Migration to update consumable table to support multiple transactions
-- This migration handles the transition from single transaction to list of transactions

-- Step 1: Create a new table to store consumable-transaction relationships
CREATE TABLE IF NOT EXISTS consumable_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumable_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consumable_id, transaction_id)
);

-- Step 2: Add foreign key constraints
ALTER TABLE consumable_transactions 
ADD CONSTRAINT fk_consumable_transactions_consumable 
FOREIGN KEY (consumable_id) REFERENCES consumable(id) ON DELETE CASCADE;

ALTER TABLE consumable_transactions 
ADD CONSTRAINT fk_consumable_transactions_transaction 
FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE CASCADE;

-- Step 3: Migrate existing data
-- For each consumable that has a transaction_id, create a relationship in the new table
INSERT INTO consumable_transactions (consumable_id, transaction_id)
SELECT id, transaction_id 
FROM consumable 
WHERE transaction_id IS NOT NULL;

-- Step 4: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_consumable_transactions_consumable_id 
ON consumable_transactions(consumable_id);

CREATE INDEX IF NOT EXISTS idx_consumable_transactions_transaction_id 
ON consumable_transactions(transaction_id);

-- Step 5: Drop the old transaction_id column (we'll do this in a separate migration to be safe)
-- ALTER TABLE consumable DROP COLUMN IF EXISTS transaction_id; 