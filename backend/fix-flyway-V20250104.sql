-- Repair Flyway schema history by removing the failed migration record
-- Run this manually in your database before restarting the application

DELETE FROM flyway_schema_history WHERE version = '20250104';

-- Verify it's removed
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;

