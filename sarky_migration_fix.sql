-- SARKY DOCUMENT MIGRATION SCRIPT
-- Run this script in DataGrip if the columns don't exist

-- Step 1: Add the missing columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sarky_month INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sarky_year INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_sarky_document BOOLEAN DEFAULT FALSE;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_sarky_filter 
ON documents (entity_type, entity_id, is_sarky_document, sarky_year, sarky_month)
WHERE is_sarky_document = TRUE;

CREATE INDEX IF NOT EXISTS idx_documents_sarky_month_year 
ON documents (sarky_year, sarky_month)
WHERE is_sarky_document = TRUE;

-- Step 3: Update existing records to have is_sarky_document = false (if NULL)
UPDATE documents SET is_sarky_document = FALSE WHERE is_sarky_document IS NULL;

-- Step 4: Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('sarky_month', 'sarky_year', 'is_sarky_document')
ORDER BY column_name;

-- Step 5: Test a sample query that was failing
SELECT COUNT(*) as total_documents FROM documents;
SELECT COUNT(*) as sarky_documents FROM documents WHERE is_sarky_document = TRUE; 