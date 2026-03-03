-- Add numeric vacation_days column to job_positions
-- Previously, vacation allocation was stored as free-text in the 'vacations' column (e.g. "21 days annual leave")
-- This migration adds a proper integer column and backfills from existing data

ALTER TABLE job_positions ADD COLUMN IF NOT EXISTS vacation_days INTEGER DEFAULT 21;

-- Backfill vacation_days from existing vacations text where possible
-- Extract the number from patterns like "21 days", "30 Days annual leave", etc.
UPDATE job_positions
SET vacation_days = CAST(
    substring(vacations FROM '(\d+)\s*[Dd]ays?')
    AS INTEGER
)
WHERE vacations IS NOT NULL
  AND vacations ~ '\d+\s*[Dd]ays?';

-- For rows where vacations text exists but doesn't match the pattern, keep default 21
-- For rows where vacations is NULL, keep default 21
