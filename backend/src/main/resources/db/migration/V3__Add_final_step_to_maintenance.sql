-- Migration to add a final step marker to the maintenance_steps table

ALTER TABLE maintenance_steps
ADD COLUMN is_final_step BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN maintenance_steps.is_final_step IS 'Indicates if this is the final step in the maintenance process.'; 