DO $$
BEGIN
    -- Step 1: Check if the old site_id column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'merchant'
        AND column_name = 'site_id'
    ) THEN

        RAISE NOTICE 'Starting migration of site_id to merchant_sites table';

        -- Step 2: Create the merchant_sites junction table
CREATE TABLE IF NOT EXISTS merchant_sites (
                                              merchant_id UUID NOT NULL,
                                              site_id UUID NOT NULL,
                                              PRIMARY KEY (merchant_id, site_id),
    CONSTRAINT fk_merchant_sites_merchant FOREIGN KEY (merchant_id) REFERENCES merchant(id) ON DELETE CASCADE,
    CONSTRAINT fk_merchant_sites_site FOREIGN KEY (site_id) REFERENCES site(id) ON DELETE CASCADE
    );

-- Step 3: Migrate existing data from merchant.site_id to merchant_sites table
-- THIS IS THE CRITICAL PART THAT PRESERVES CLIENT DATA
INSERT INTO merchant_sites (merchant_id, site_id)
SELECT id, site_id
FROM merchant
WHERE site_id IS NOT NULL
    ON CONFLICT DO NOTHING;

RAISE NOTICE 'Migrated % merchants', (SELECT COUNT(*) FROM merchant WHERE site_id IS NOT NULL);

        -- Step 4: Drop the old site_id column
ALTER TABLE merchant DROP COLUMN site_id;

RAISE NOTICE 'Successfully dropped site_id column';

ELSE
        RAISE NOTICE 'Column site_id does not exist, migration already completed';
END IF;

    -- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchant_sites_merchant_id ON merchant_sites(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_sites_site_id ON merchant_sites(site_id);

END $$;

COMMENT ON TABLE merchant_sites IS 'Junction table for many-to-many relationship between merchants and sites. Migrated from single site_id column on 2025-01-20';