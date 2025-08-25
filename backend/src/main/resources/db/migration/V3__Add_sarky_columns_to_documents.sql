-- Add sarky-specific columns to documents table for monthly filtering
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sarky_month INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sarky_year INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_sarky_document BOOLEAN DEFAULT FALSE;

-- Create index for efficient sarky document queries
CREATE INDEX IF NOT EXISTS idx_documents_sarky_filter 
ON documents (entity_type, entity_id, is_sarky_document, sarky_year, sarky_month)
WHERE is_sarky_document = TRUE;

-- Create index for sarky month/year queries
CREATE INDEX IF NOT EXISTS idx_documents_sarky_month_year 
ON documents (sarky_year, sarky_month)
WHERE is_sarky_document = TRUE;

-- Update existing records to have is_sarky_document = false (which is already the default)
UPDATE documents SET is_sarky_document = FALSE WHERE is_sarky_document IS NULL; 