-- Check if sarky columns exist in documents table
-- Run this script first to verify the migration status

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('sarky_month', 'sarky_year', 'is_sarky_document')
ORDER BY column_name;

-- If the above query returns no rows, run the migration script
-- If it returns rows, the migration has already been applied 