-- Add issue_date and spare_part_name columns to maintenance_records table
-- Made idempotent to handle cases where columns already exist

ALTER TABLE maintenance_records
ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP;

ALTER TABLE maintenance_records
ADD COLUMN IF NOT EXISTS spare_part_name VARCHAR(255);

-- Make expected_end_date nullable in maintenance_steps table (idempotent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_steps'
        AND column_name = 'expected_end_date'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE maintenance_steps ALTER COLUMN expected_end_date DROP NOT NULL;
    END IF;
END $$;

-- Make from_location nullable in maintenance_steps table (idempotent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_steps'
        AND column_name = 'from_location'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE maintenance_steps ALTER COLUMN from_location DROP NOT NULL;
    END IF;
END $$;

-- Make to_location nullable in maintenance_steps table (idempotent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_steps'
        AND column_name = 'to_location'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE maintenance_steps ALTER COLUMN to_location DROP NOT NULL;
    END IF;
END $$;

-- Update existing records with default values
UPDATE maintenance_records
SET issue_date = creation_date
WHERE issue_date IS NULL;

UPDATE maintenance_records
SET spare_part_name = 'Not specified'
WHERE spare_part_name IS NULL;

-- Now make the columns NOT NULL after setting default values (idempotent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_records'
        AND column_name = 'issue_date'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE maintenance_records ALTER COLUMN issue_date SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_records'
        AND column_name = 'spare_part_name'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE maintenance_records ALTER COLUMN spare_part_name SET NOT NULL;
    END IF;
END $$;

-- Add step types if they don't exist
INSERT INTO step_types (id, name, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'PURCHASING_SPARE_PARTS', 'Purchasing spare parts for maintenance', true, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM step_types WHERE UPPER(name) = 'PURCHASING_SPARE_PARTS' OR UPPER(name) = 'PURCHASING'
);

INSERT INTO step_types (id, name, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'MAINTENANCE', 'Performing maintenance/repair work', true, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM step_types WHERE UPPER(name) = 'MAINTENANCE'
);

INSERT INTO step_types (id, name, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'TRANSPORT_BACK_TO_SITE', 'Transport equipment back to site', true, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM step_types WHERE UPPER(name) = 'TRANSPORT_BACK_TO_SITE' OR UPPER(name) = 'TRANSPORT_BACK'
);
