-- =============================================
-- Migration: Add record_number to maintenance_records
-- Description: Adds human-readable record number (MR-YYYY-NNNNNN)
-- =============================================

-- Add record_number column
ALTER TABLE maintenance_records
ADD COLUMN IF NOT EXISTS record_number VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_records_record_number
ON maintenance_records(record_number);

-- Backfill existing records with generated numbers
-- Format: MR-YYYY-NNNNNN where YYYY is the year from creation_date
WITH numbered_records AS (
    SELECT
        id,
        EXTRACT(YEAR FROM creation_date)::INTEGER AS record_year,
        ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM creation_date) ORDER BY creation_date, id) AS seq
    FROM maintenance_records
    WHERE record_number IS NULL
)
UPDATE maintenance_records mr
SET record_number = 'MR-' || nr.record_year || '-' || LPAD(nr.seq::TEXT, 6, '0')
FROM numbered_records nr
WHERE mr.id = nr.id;

-- Add entity_id_sequence entry for MAINTENANCE_RECORD if not exists
INSERT INTO entity_id_sequences (entity_type, current_sequence, prefix, padding_length, created_at, updated_at)
SELECT 'MAINTENANCE_RECORD',
       COALESCE((SELECT MAX(CAST(SUBSTRING(record_number FROM 9) AS INTEGER)) FROM maintenance_records WHERE record_number IS NOT NULL), 0),
       'MR',
       6,
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM entity_id_sequences WHERE entity_type = 'MAINTENANCE_RECORD');
