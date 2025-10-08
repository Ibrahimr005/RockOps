ALTER TABLE candidate DROP CONSTRAINT candidate_candidate_status_check;

ALTER TABLE candidate ADD CONSTRAINT candidate_candidate_status_check
    CHECK (candidate_status IN ('APPLIED', 'SCREENING', 'INTERVIEWED', 'PENDING_HIRE', 'HIRED', 'REJECTED'));