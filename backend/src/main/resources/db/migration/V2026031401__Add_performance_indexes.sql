-- V2026031401: Add performance indexes for common query patterns
-- ================================================================
-- Indexes on status columns used for filtering and dashboard queries.
-- Composite index on attendance for monthly sheet generation.
-- idx_equipment_status already exists (V2026030402), so it is excluded.
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_maintenance_record_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_item_item_status ON item(item_status);
CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
