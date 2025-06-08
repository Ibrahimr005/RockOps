-- Add resolved column to consumable table
ALTER TABLE consumable ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;

-- Update existing records to have resolved = false (which is already the default)
UPDATE consumable SET resolved = FALSE WHERE resolved IS NULL; 