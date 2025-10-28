-- Migration to ensure contact type names are case-insensitive
-- This prevents duplicates like "Customer" and "CUSTOMER"

-- Step 1: Create a case-insensitive unique index
-- First, let's identify and merge duplicates (keeping the first occurrence)

-- Create a temporary table to identify duplicates
CREATE TEMP TABLE contact_type_duplicates AS
SELECT 
    LOWER(name) as lower_name,
    MIN(created_at) as first_created,
    array_agg(id ORDER BY created_at) as duplicate_ids,
    COUNT(*) as duplicate_count
FROM contact_types
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;

-- For each set of duplicates, keep the oldest one and update references
DO $$
DECLARE
    dup_record RECORD;
    keep_id UUID;
    delete_ids UUID[];
    delete_id UUID;
BEGIN
    FOR dup_record IN SELECT * FROM contact_type_duplicates LOOP
        -- Keep the first (oldest) ID
        keep_id := dup_record.duplicate_ids[1];
        delete_ids := dup_record.duplicate_ids[2:array_length(dup_record.duplicate_ids, 1)];
        
        -- Log what we're doing
        RAISE NOTICE 'Processing duplicates for "%": keeping %, removing %', 
            dup_record.lower_name, keep_id, delete_ids;
        
        -- Update all contacts that reference the duplicate IDs to use the kept ID
        FOREACH delete_id IN ARRAY delete_ids LOOP
            UPDATE contacts 
            SET contact_type_id = keep_id 
            WHERE contact_type_id = delete_id;
            
            RAISE NOTICE 'Updated contacts from % to %', delete_id, keep_id;
        END LOOP;
        
        -- Delete the duplicate contact types
        FOREACH delete_id IN ARRAY delete_ids LOOP
            DELETE FROM contact_types WHERE id = delete_id;
            RAISE NOTICE 'Deleted duplicate contact type %', delete_id;
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Handle any remaining naming conflicts before standardization
-- If both "INTERNAL_STAFF" and "Internal Staff" exist, merge them
DO $$
DECLARE
    dup_record RECORD;
    keep_id UUID;
    delete_ids UUID[];
    delete_id UUID;
BEGIN
    -- Find pairs like ('INTERNAL_STAFF', 'Internal Staff') that would conflict
    FOR dup_record IN 
        SELECT 
            LOWER(REPLACE(name, '_', ' ')) as normalized_name,
            (array_agg(id ORDER BY created_at))[1] as keep_id,
            (array_agg(id ORDER BY created_at))[2:] as delete_ids
        FROM contact_types
        GROUP BY LOWER(REPLACE(name, '_', ' '))
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Merging conflicting contact types for "%": keeping %, removing %', 
            dup_record.normalized_name, dup_record.keep_id, dup_record.delete_ids;
        
        -- Update contacts to use the kept ID for each duplicate
        FOREACH delete_id IN ARRAY dup_record.delete_ids LOOP
            UPDATE contacts 
            SET contact_type_id = dup_record.keep_id 
            WHERE contact_type_id = delete_id;
            
            -- Delete the duplicate
            DELETE FROM contact_types WHERE id = delete_id;
            
            RAISE NOTICE 'Merged and deleted contact type %', delete_id;
        END LOOP;
    END LOOP;
END $$;

-- Step 3: Now standardize the remaining names to Title Case
UPDATE contact_types 
SET name = INITCAP(LOWER(REPLACE(name, '_', ' ')))
WHERE name != INITCAP(LOWER(REPLACE(name, '_', ' ')));

-- Step 4: Drop the old unique constraint if it exists
ALTER TABLE contact_types DROP CONSTRAINT IF EXISTS contact_types_name_key;

-- Step 5: Create a case-insensitive unique index using LOWER()
-- This will prevent inserting "Customer" if "customer" or "CUSTOMER" already exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_types_name_lower 
ON contact_types (LOWER(name));

-- Step 6: Add a comment to document the constraint
COMMENT ON INDEX idx_contact_types_name_lower IS 
'Case-insensitive unique constraint on contact type names';

-- Step 7: Log completion
DO $$
BEGIN
    RAISE NOTICE 'Contact type case-insensitive constraint migration completed successfully';
END $$;

