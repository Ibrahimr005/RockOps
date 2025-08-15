-- Fix foreign key constraint issues
-- Clean up orphaned transaction_item records that reference non-existent transactions

-- Delete transaction_item records that reference non-existent transactions
DELETE FROM transaction_item 
WHERE transaction_id NOT IN (SELECT id FROM transaction);

-- Delete item records that reference non-existent transaction_items
DELETE FROM item 
WHERE transaction_item_id NOT IN (SELECT id FROM transaction_item);

-- Clean up any other orphaned records that might cause foreign key issues
-- This is a safety measure to ensure data integrity

-- Verify the cleanup worked by checking for any remaining orphaned records
-- (This is just for verification, not an actual operation)
-- SELECT COUNT(*) FROM transaction_item ti 
-- LEFT JOIN transaction t ON ti.transaction_id = t.id 
-- WHERE t.id IS NULL; 