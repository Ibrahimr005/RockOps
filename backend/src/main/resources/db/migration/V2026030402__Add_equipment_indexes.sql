-- V2026030402: Add indexes on equipment table for query performance
-- ================================================================
-- The equipment list uses JOIN FETCH across 6 associations.
-- Indexes on FK columns speed up the JOINs significantly.
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_equipment_site_id ON equipment(site_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type_id ON equipment(equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_equipment_brand_id ON equipment(equipment_brand_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_driver_id ON equipment(driver_id);
CREATE INDEX IF NOT EXISTS idx_equipment_sub_driver_id ON equipment(sub_driver_id);
CREATE INDEX IF NOT EXISTS idx_equipment_merchant_id ON equipment(merchant_id);
