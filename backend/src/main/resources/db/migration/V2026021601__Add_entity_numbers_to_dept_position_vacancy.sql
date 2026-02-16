-- =============================================================================
-- V2026021601: Add entity number columns to departments, job_positions, vacancies
-- Format: PREFIX-XXXXXX (e.g., DEPT-A3F8K2, POS-7BD4E1, VAC-C9F2A3)
-- =============================================================================

-- Step 0: Normalize table names (Hibernate may have created singular names)
DO $$
BEGIN
    -- Rename job_position → job_positions if singular exists and plural doesn't
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_position')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_positions') THEN
        ALTER TABLE job_position RENAME TO job_positions;
    END IF;

    -- Rename vacancy → vacancies if singular exists and plural doesn't
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancy')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancies') THEN
        ALTER TABLE vacancy RENAME TO vacancies;
    END IF;
END $$;

-- Helper function to generate random 6-char alphanumeric codes
CREATE OR REPLACE FUNCTION generate_entity_code(prefix TEXT) RETURNS TEXT AS $$
DECLARE
    chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    code TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        code := code || substr(chars, floor(random() * 36 + 1)::int, 1);
    END LOOP;
    RETURN prefix || '-' || code;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. Add columns (only if tables exist)
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'departments' AND column_name = 'department_number') THEN
            ALTER TABLE departments ADD COLUMN department_number VARCHAR(20) UNIQUE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_positions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'job_positions' AND column_name = 'position_number') THEN
            ALTER TABLE job_positions ADD COLUMN position_number VARCHAR(20) UNIQUE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancies') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vacancies' AND column_name = 'vacancy_number') THEN
            ALTER TABLE vacancies ADD COLUMN vacancy_number VARCHAR(20) UNIQUE;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 2. Populate existing records with unique codes
-- =============================================================================

-- Populate department_number (DEPT-XXXXXX)
DO $$
DECLARE
    rec RECORD;
    new_code TEXT;
    attempts INT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'departments' AND column_name = 'department_number') THEN
        FOR rec IN SELECT id FROM departments WHERE department_number IS NULL LOOP
            attempts := 0;
            LOOP
                new_code := generate_entity_code('DEPT');
                EXIT WHEN NOT EXISTS (SELECT 1 FROM departments WHERE department_number = new_code);
                attempts := attempts + 1;
                IF attempts > 100 THEN RAISE EXCEPTION 'Could not generate unique department_number'; END IF;
            END LOOP;
            UPDATE departments SET department_number = new_code WHERE id = rec.id;
        END LOOP;
    END IF;
END $$;

-- Populate position_number (POS-XXXXXX)
DO $$
DECLARE
    rec RECORD;
    new_code TEXT;
    attempts INT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'job_positions' AND column_name = 'position_number') THEN
        FOR rec IN SELECT id FROM job_positions WHERE position_number IS NULL LOOP
            attempts := 0;
            LOOP
                new_code := generate_entity_code('POS');
                EXIT WHEN NOT EXISTS (SELECT 1 FROM job_positions WHERE position_number = new_code);
                attempts := attempts + 1;
                IF attempts > 100 THEN RAISE EXCEPTION 'Could not generate unique position_number'; END IF;
            END LOOP;
            UPDATE job_positions SET position_number = new_code WHERE id = rec.id;
        END LOOP;
    END IF;
END $$;

-- Populate vacancy_number (VAC-XXXXXX)
DO $$
DECLARE
    rec RECORD;
    new_code TEXT;
    attempts INT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vacancies' AND column_name = 'vacancy_number') THEN
        FOR rec IN SELECT id FROM vacancies WHERE vacancy_number IS NULL LOOP
            attempts := 0;
            LOOP
                new_code := generate_entity_code('VAC');
                EXIT WHEN NOT EXISTS (SELECT 1 FROM vacancies WHERE vacancy_number = new_code);
                attempts := attempts + 1;
                IF attempts > 100 THEN RAISE EXCEPTION 'Could not generate unique vacancy_number'; END IF;
            END LOOP;
            UPDATE vacancies SET vacancy_number = new_code WHERE id = rec.id;
        END LOOP;
    END IF;
END $$;

-- =============================================================================
-- 3. Initialize entity_id_sequences for new types
-- =============================================================================
DO $$
DECLARE
    dept_count BIGINT := 0;
    pos_count BIGINT := 0;
    vac_count BIGINT := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
        EXECUTE 'SELECT COALESCE(COUNT(*), 0) FROM departments' INTO dept_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_positions') THEN
        EXECUTE 'SELECT COALESCE(COUNT(*), 0) FROM job_positions' INTO pos_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancies') THEN
        EXECUTE 'SELECT COALESCE(COUNT(*), 0) FROM vacancies' INTO vac_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_id_sequences') THEN
        INSERT INTO entity_id_sequences (entity_type, current_sequence, version)
        SELECT 'DEPARTMENT', dept_count, 0
        WHERE NOT EXISTS (SELECT 1 FROM entity_id_sequences WHERE entity_type = 'DEPARTMENT');

        INSERT INTO entity_id_sequences (entity_type, current_sequence, version)
        SELECT 'JOB_POSITION', pos_count, 0
        WHERE NOT EXISTS (SELECT 1 FROM entity_id_sequences WHERE entity_type = 'JOB_POSITION');

        INSERT INTO entity_id_sequences (entity_type, current_sequence, version)
        SELECT 'VACANCY', vac_count, 0
        WHERE NOT EXISTS (SELECT 1 FROM entity_id_sequences WHERE entity_type = 'VACANCY');
    END IF;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS generate_entity_code(TEXT);
