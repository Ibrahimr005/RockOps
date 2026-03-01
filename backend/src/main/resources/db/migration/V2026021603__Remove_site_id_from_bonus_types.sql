-- =============================================
-- Migration: Remove site_id from bonus_types
-- Description: Makes bonus_types a global entity (not site-specific).
--   Drops site FK, old unique constraint, and site_id column.
--   Adds a new unique constraint on code alone.
-- Wrapped in existence check for fresh deploy compatibility.
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_types') THEN

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

        -- 6. Add unique constraint on code alone (if not already present)
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'uq_bonus_type_code' AND table_name = 'bonus_types') THEN
            ALTER TABLE bonus_types ADD CONSTRAINT uq_bonus_type_code UNIQUE (code);
        END IF;

        RAISE NOTICE 'V2026021603: site_id removed from bonus_types.';
    ELSE
        RAISE NOTICE 'V2026021603: bonus_types table not found. Skipping.';
    END IF;
END $$;
