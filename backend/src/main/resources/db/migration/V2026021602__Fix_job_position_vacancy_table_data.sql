-- =============================================================================
-- V2026021602: Fix data migration for job_position→job_positions, vacancy→vacancies
-- The previous migration's rename was skipped because Hibernate had already created
-- empty plural tables. This drops the empty plural tables and renames the old ones.
-- =============================================================================

-- Fix job_position → job_positions
DO $$
DECLARE
    old_count BIGINT := 0;
    new_count BIGINT := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_position')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_positions') THEN

        EXECUTE 'SELECT COUNT(*) FROM job_position' INTO old_count;
        EXECUTE 'SELECT COUNT(*) FROM job_positions' INTO new_count;

        IF old_count > 0 AND new_count = 0 THEN
            -- New table is empty, old has data: drop new, rename old
            DROP TABLE job_positions CASCADE;
            ALTER TABLE job_position RENAME TO job_positions;
            RAISE NOTICE 'Dropped empty job_positions, renamed job_position → job_positions (% rows)', old_count;
        ELSIF old_count = 0 AND new_count > 0 THEN
            -- Old table is empty, new has data: just drop old
            DROP TABLE job_position CASCADE;
            RAISE NOTICE 'Dropped empty job_position, keeping job_positions (% rows)', new_count;
        ELSIF old_count = 0 AND new_count = 0 THEN
            -- Both empty: drop old, keep new
            DROP TABLE job_position CASCADE;
            RAISE NOTICE 'Both tables empty, dropped job_position, keeping job_positions';
        ELSE
            -- Both have data (unlikely): keep the one with more data
            IF old_count >= new_count THEN
                DROP TABLE job_positions CASCADE;
                ALTER TABLE job_position RENAME TO job_positions;
                RAISE NOTICE 'Both had data, kept job_position (%) over job_positions (%)', old_count, new_count;
            ELSE
                DROP TABLE job_position CASCADE;
                RAISE NOTICE 'Both had data, kept job_positions (%) over job_position (%)', new_count, old_count;
            END IF;
        END IF;

    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_position')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_positions') THEN

        ALTER TABLE job_position RENAME TO job_positions;
        RAISE NOTICE 'Renamed job_position → job_positions';

    ELSE
        RAISE NOTICE 'job_positions already correct, no action needed';
    END IF;
END $$;

-- Fix vacancy → vacancies
DO $$
DECLARE
    old_count BIGINT := 0;
    new_count BIGINT := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancy')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancies') THEN

        EXECUTE 'SELECT COUNT(*) FROM vacancy' INTO old_count;
        EXECUTE 'SELECT COUNT(*) FROM vacancies' INTO new_count;

        IF old_count > 0 AND new_count = 0 THEN
            DROP TABLE vacancies CASCADE;
            ALTER TABLE vacancy RENAME TO vacancies;
            RAISE NOTICE 'Dropped empty vacancies, renamed vacancy → vacancies (% rows)', old_count;
        ELSIF old_count = 0 AND new_count > 0 THEN
            DROP TABLE vacancy CASCADE;
            RAISE NOTICE 'Dropped empty vacancy, keeping vacancies (% rows)', new_count;
        ELSIF old_count = 0 AND new_count = 0 THEN
            DROP TABLE vacancy CASCADE;
            RAISE NOTICE 'Both tables empty, dropped vacancy, keeping vacancies';
        ELSE
            IF old_count >= new_count THEN
                DROP TABLE vacancies CASCADE;
                ALTER TABLE vacancy RENAME TO vacancies;
                RAISE NOTICE 'Both had data, kept vacancy (%) over vacancies (%)', old_count, new_count;
            ELSE
                DROP TABLE vacancy CASCADE;
                RAISE NOTICE 'Both had data, kept vacancies (%) over vacancy (%)', new_count, old_count;
            END IF;
        END IF;

    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancy')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancies') THEN

        ALTER TABLE vacancy RENAME TO vacancies;
        RAISE NOTICE 'Renamed vacancy → vacancies';

    ELSE
        RAISE NOTICE 'vacancies already correct, no action needed';
    END IF;
END $$;

-- Ensure the number columns exist on the surviving tables
DO $$
BEGIN
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

-- Re-populate entity numbers for any rows that are still NULL

CREATE OR REPLACE FUNCTION generate_entity_code_v2(prefix TEXT) RETURNS TEXT AS $$
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

-- Backfill position_number
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
                new_code := generate_entity_code_v2('POS');
                EXIT WHEN NOT EXISTS (SELECT 1 FROM job_positions WHERE position_number = new_code);
                attempts := attempts + 1;
                IF attempts > 100 THEN RAISE EXCEPTION 'Could not generate unique position_number'; END IF;
            END LOOP;
            UPDATE job_positions SET position_number = new_code WHERE id = rec.id;
        END LOOP;
    END IF;
END $$;

-- Backfill vacancy_number
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
                new_code := generate_entity_code_v2('VAC');
                EXIT WHEN NOT EXISTS (SELECT 1 FROM vacancies WHERE vacancy_number = new_code);
                attempts := attempts + 1;
                IF attempts > 100 THEN RAISE EXCEPTION 'Could not generate unique vacancy_number'; END IF;
            END LOOP;
            UPDATE vacancies SET vacancy_number = new_code WHERE id = rec.id;
        END LOOP;
    END IF;
END $$;

-- Backfill department_number
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
                new_code := generate_entity_code_v2('DEPT');
                EXIT WHEN NOT EXISTS (SELECT 1 FROM departments WHERE department_number = new_code);
                attempts := attempts + 1;
                IF attempts > 100 THEN RAISE EXCEPTION 'Could not generate unique department_number'; END IF;
            END LOOP;
            UPDATE departments SET department_number = new_code WHERE id = rec.id;
        END LOOP;
    END IF;
END $$;

-- Update entity_id_sequences to reflect actual counts
DO $$
DECLARE
    pos_count BIGINT := 0;
    vac_count BIGINT := 0;
    dept_count BIGINT := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_positions') THEN
        EXECUTE 'SELECT COALESCE(COUNT(*), 0) FROM job_positions' INTO pos_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vacancies') THEN
        EXECUTE 'SELECT COALESCE(COUNT(*), 0) FROM vacancies' INTO vac_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
        EXECUTE 'SELECT COALESCE(COUNT(*), 0) FROM departments' INTO dept_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_id_sequences') THEN
        UPDATE entity_id_sequences SET current_sequence = GREATEST(current_sequence, pos_count) WHERE entity_type = 'JOB_POSITION';
        UPDATE entity_id_sequences SET current_sequence = GREATEST(current_sequence, vac_count) WHERE entity_type = 'VACANCY';
        UPDATE entity_id_sequences SET current_sequence = GREATEST(current_sequence, dept_count) WHERE entity_type = 'DEPARTMENT';
    END IF;
END $$;

DROP FUNCTION IF EXISTS generate_entity_code_v2(TEXT);
