-- Add INSPECTION_PENDING, INSPECTION_ACCEPTED, INSPECTION_REJECTED to the
-- offer_timeline_events event_type check constraint

ALTER TABLE offer_timeline_events
    DROP CONSTRAINT IF EXISTS offer_timeline_events_event_type_check;

ALTER TABLE offer_timeline_events
    ADD CONSTRAINT offer_timeline_events_event_type_check
    CHECK (event_type IN (
        'REQUEST_APPROVED',
        'OFFER_SUBMITTED',
        'MANAGER_ACCEPTED',
        'MANAGER_REJECTED',
        'OFFER_RETRIED',
        'FINANCE_PROCESSING',
        'FINANCE_ACCEPTED',
        'FINANCE_REJECTED',
        'FINANCE_PARTIALLY_ACCEPTED',
        'INSPECTION_PENDING',
        'INSPECTION_ACCEPTED',
        'INSPECTION_REJECTED',
        'OFFER_FINALIZING',
        'OFFER_FINALIZED',
        'OFFER_COMPLETED',
        'OFFER_SPLIT'
    ));

-- Add inspected_by column to offers table for equipment inspection tracking
ALTER TABLE offers ADD COLUMN IF NOT EXISTS inspected_by VARCHAR(255);
