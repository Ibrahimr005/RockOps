-- =============================================
-- Migration: Remove site_id from bonus_types
-- Description: Makes bonus_types a global entity (not site-specific).
--   Drops site FK, old unique constraint, and site_id column.
--   Adds a new unique constraint on code alone.
-- =============================================

-- 1. Drop the FK constraint
ALTER TABLE bonus_types DROP CONSTRAINT IF EXISTS fk_bonus_type_site;

-- 2. Drop the old composite unique constraint (code, site_id)
ALTER TABLE bonus_types DROP CONSTRAINT IF EXISTS uq_bonus_type_code_site;

-- 3. Drop the site index
DROP INDEX IF EXISTS idx_bonus_type_site;

-- 4. Handle potential duplicate codes across sites before adding unique constraint on code alone
-- Keep only one row per code (the oldest created_at)
DELETE FROM bonus_types a
USING bonus_types b
WHERE a.code = b.code
  AND a.created_at > b.created_at;

-- 5. Drop the site_id column
ALTER TABLE bonus_types DROP COLUMN IF EXISTS site_id;

-- 6. Add unique constraint on code alone
ALTER TABLE bonus_types ADD CONSTRAINT uq_bonus_type_code UNIQUE (code);
