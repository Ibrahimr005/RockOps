DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'maintenance_records' 
        AND column_name = 'manager_approval_date'
    ) THEN
ALTER TABLE maintenance_records ADD COLUMN manager_approval_date TIMESTAMP;
END IF;
END $$;