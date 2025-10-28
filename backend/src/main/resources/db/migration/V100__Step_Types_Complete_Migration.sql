-- ========================================
-- Complete Step Types Migration (Flyway)
-- This migration is idempotent and safe to run
-- ========================================

-- Step 1: Make responsible_contact_id nullable (critical!)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='maintenance_steps' 
        AND column_name='responsible_contact_id' 
        AND is_nullable='NO'
    ) THEN
        ALTER TABLE maintenance_steps ALTER COLUMN responsible_contact_id DROP NOT NULL;
    END IF;
END $$;

-- Step 2: Drop old step_type enum column if it exists
DO $$
BEGIN
    -- First make it nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='maintenance_steps' AND column_name='step_type') THEN
        ALTER TABLE maintenance_steps ALTER COLUMN step_type DROP NOT NULL;
        ALTER TABLE maintenance_steps DROP COLUMN step_type;
    END IF;
END $$;

-- Step 3: Create step_types table
CREATE TABLE IF NOT EXISTS step_types (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(1000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

-- Step 4: Insert default TRANSPORT step type
INSERT INTO step_types (id, name, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'TRANSPORT', 'Transportation of equipment between locations', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM step_types WHERE name = 'TRANSPORT');

-- Step 5: Add step_type_id column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='maintenance_steps' AND column_name='step_type_id') THEN
        ALTER TABLE maintenance_steps ADD COLUMN step_type_id UUID;
    END IF;
END $$;

-- Step 6: Add responsible_employee_id column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='maintenance_steps' AND column_name='responsible_employee_id') THEN
        ALTER TABLE maintenance_steps ADD COLUMN responsible_employee_id UUID;
    END IF;
END $$;

-- Step 7: Add foreign key for step_type_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_maintenance_step_step_type'
    ) THEN
        ALTER TABLE maintenance_steps
        ADD CONSTRAINT fk_maintenance_step_step_type
        FOREIGN KEY (step_type_id) REFERENCES step_types(id);
    END IF;
END $$;

-- Step 8: Add check constraint for exclusive employee/contact
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_responsible_person_exclusive'
    ) THEN
        ALTER TABLE maintenance_steps
        ADD CONSTRAINT chk_responsible_person_exclusive
        CHECK (
            (responsible_contact_id IS NOT NULL AND responsible_employee_id IS NULL) OR
            (responsible_contact_id IS NULL AND responsible_employee_id IS NOT NULL) OR
            (responsible_contact_id IS NULL AND responsible_employee_id IS NULL)
        );
    END IF;
END $$;





