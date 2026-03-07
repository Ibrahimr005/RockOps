-- Equipment Purchase Specification table
-- Captures equipment request specifications for the procurement pipeline
CREATE TABLE equipment_purchase_spec (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    equipment_type_id UUID NOT NULL REFERENCES equipment_type(id),
    equipment_brand_id UUID REFERENCES equipment_brand(id),
    model VARCHAR(255),
    manufacture_year INTEGER,
    country_of_origin VARCHAR(255),
    specifications TEXT,
    estimated_budget DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
