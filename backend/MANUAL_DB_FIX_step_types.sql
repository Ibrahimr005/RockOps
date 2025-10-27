-- Manual database fix for step types migration
-- Run this SQL script directly on your PostgreSQL database

-- Step 1: Make the old step_type column nullable
ALTER TABLE maintenance_steps ALTER COLUMN step_type DROP NOT NULL;

-- Step 2: Drop the old step_type column completely
ALTER TABLE maintenance_steps DROP COLUMN IF EXISTS step_type;

-- Step 3: Ensure step_types table exists
CREATE TABLE IF NOT EXISTS step_types (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(1000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

-- Step 4: Insert TRANSPORT step type if it doesn't exist
INSERT INTO step_types (id, name, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'TRANSPORT', 'Transportation of equipment between locations', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM step_types WHERE name = 'TRANSPORT');

-- Step 5: Add step_type_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='maintenance_steps' AND column_name='step_type_id') THEN
        ALTER TABLE maintenance_steps ADD COLUMN step_type_id UUID;
    END IF;
END $$;

-- Step 6: Make responsible_contact_id nullable (so either employee OR contact can be set)
ALTER TABLE maintenance_steps ALTER COLUMN responsible_contact_id DROP NOT NULL;

-- Step 7: Add responsible_employee_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='maintenance_steps' AND column_name='responsible_employee_id') THEN
        ALTER TABLE maintenance_steps ADD COLUMN responsible_employee_id UUID;
    END IF;
END $$;

-- Step 8: Add foreign key constraints
ALTER TABLE maintenance_steps
DROP CONSTRAINT IF EXISTS fk_maintenance_step_step_type;

ALTER TABLE maintenance_steps
ADD CONSTRAINT fk_maintenance_step_step_type
FOREIGN KEY (step_type_id) REFERENCES step_types(id);

-- Add foreign key to employee table (skip if table doesn't exist)
-- Note: The employee foreign key will be created by Hibernate automatically
-- If you want to add it manually, first check your actual employee table name:
-- Run: SELECT tablename FROM pg_tables WHERE tablename LIKE '%employee%';
-- Then uncomment and update the appropriate line below:

-- For singular 'employee' table:
-- ALTER TABLE maintenance_steps ADD CONSTRAINT fk_maintenance_step_employee FOREIGN KEY (responsible_employee_id) REFERENCES employee(id);

-- For plural 'employees' table:
-- ALTER TABLE maintenance_steps ADD CONSTRAINT fk_maintenance_step_employee FOREIGN KEY (responsible_employee_id) REFERENCES employees(id);

-- Step 9: Add check constraint for exclusive employee/contact assignment
ALTER TABLE maintenance_steps
DROP CONSTRAINT IF EXISTS chk_responsible_person_exclusive;

ALTER TABLE maintenance_steps
ADD CONSTRAINT chk_responsible_person_exclusive
CHECK (
    (responsible_contact_id IS NOT NULL AND responsible_employee_id IS NULL) OR
    (responsible_contact_id IS NULL AND responsible_employee_id IS NOT NULL) OR
    (responsible_contact_id IS NULL AND responsible_employee_id IS NULL)
);

-- Verification query - run this to check the schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'maintenance_steps' 
ORDER BY ordinal_position;

-- Also verify step types exist
SELECT * FROM step_types;
