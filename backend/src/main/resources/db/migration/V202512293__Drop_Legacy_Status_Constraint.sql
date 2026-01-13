-- Drop legacy check constraint for maintenance_records status which confilcts with the new maintenance_records_status_check
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS chk_status;
