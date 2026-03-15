-- Create MeasuringUnit table for the warehouse module
-- Entity: com.example.backend.models.warehouse.MeasuringUnit

CREATE TABLE IF NOT EXISTS measuring_unit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    abbreviation VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

-- Seed with common measuring units
INSERT INTO measuring_unit (id, name, display_name, abbreviation, is_active) VALUES
    (gen_random_uuid(), 'kg', 'Kilogram', 'kg', true),
    (gen_random_uuid(), 'liter', 'Liter', 'L', true),
    (gen_random_uuid(), 'piece', 'Piece', 'pcs', true),
    (gen_random_uuid(), 'meter', 'Meter', 'm', true),
    (gen_random_uuid(), 'ton', 'Ton', 't', true),
    (gen_random_uuid(), 'gallon', 'Gallon', 'gal', true),
    (gen_random_uuid(), 'box', 'Box', 'box', true),
    (gen_random_uuid(), 'roll', 'Roll', 'roll', true),
    (gen_random_uuid(), 'set', 'Set', 'set', true),
    (gen_random_uuid(), 'pair', 'Pair', 'pair', true)
ON CONFLICT (name) DO NOTHING;
