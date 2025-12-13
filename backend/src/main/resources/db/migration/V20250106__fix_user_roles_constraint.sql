-- Fix user roles constraint to include MAINTENANCE_EMPLOYEE and MAINTENANCE_MANAGER
-- This migration is idempotent and can be safely run multiple times

-- Drop existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add updated constraint with all 14 roles including maintenance roles
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
    role IN (
        'ADMIN',
        'USER',
        'SITE_ADMIN',
        'PROCUREMENT',
        'WAREHOUSE_MANAGER',
        'WAREHOUSE_EMPLOYEE',
        'SECRETARY',
        'EQUIPMENT_MANAGER',
        'HR_MANAGER',
        'HR_EMPLOYEE',
        'FINANCE_EMPLOYEE',
        'FINANCE_MANAGER',
        'MAINTENANCE_EMPLOYEE',
        'MAINTENANCE_MANAGER'
    )
);

-- Add comment for documentation
COMMENT ON CONSTRAINT users_role_check ON users IS 'Validates user role is one of the 14 allowed roles including maintenance staff';
