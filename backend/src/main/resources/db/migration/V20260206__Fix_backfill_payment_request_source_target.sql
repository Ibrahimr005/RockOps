-- =============================================
-- Migration: Fix backfill of source/target fields for payment_requests
-- Aggressively re-backfills ALL records based on FK references,
-- regardless of current source_type/target_type values.
-- Fixes incorrect column names from V20260203.
-- =============================================

-- =============================================
-- STEP 1: Backfill ALL PO-based payment requests (force update source fields)
-- =============================================
UPDATE payment_requests pr
SET
    source_type = 'PURCHASE_ORDER',
    source_id = pr.purchase_order_id,
    source_number = po.po_number,
    source_description = CONCAT('Purchase Order: ', po.po_number)
FROM purchase_orders po
WHERE pr.purchase_order_id = po.id
  AND pr.purchase_order_id IS NOT NULL;

-- =============================================
-- STEP 2: Backfill ALL Maintenance-based payment requests
-- =============================================
UPDATE payment_requests pr
SET
    source_type = 'MAINTENANCE',
    source_id = pr.maintenance_step_id,
    source_number = COALESCE(mr.record_number, CONCAT('MR-', LEFT(CAST(COALESCE(pr.maintenance_record_id, pr.maintenance_step_id) AS TEXT), 8))),
    source_description = CONCAT('Maintenance: ', COALESCE(mr.record_number, 'Step'))
FROM maintenance_steps ms
LEFT JOIN maintenance_records mr ON ms.maintenance_record_id = mr.id
WHERE pr.maintenance_step_id = ms.id
  AND pr.maintenance_step_id IS NOT NULL;

-- =============================================
-- STEP 3: Backfill ALL Payroll Batch-based payment requests
-- =============================================
UPDATE payment_requests pr
SET
    source_type = 'PAYROLL_BATCH',
    source_id = pr.payroll_batch_id,
    source_number = pb.batch_number,
    source_description = CONCAT('Payroll Batch: ', pb.batch_number)
FROM payroll_batches pb
WHERE pr.payroll_batch_id = pb.id
  AND pr.payroll_batch_id IS NOT NULL
  AND pr.source_type IS DISTINCT FROM 'LOAN';

-- =============================================
-- STEP 4: Backfill ALL Merchant target fields (for PO and Maintenance)
-- Uses correct column names: contact_person_name, contact_email, contact_phone
-- =============================================
UPDATE payment_requests pr
SET
    target_type = 'MERCHANT',
    target_id = pr.merchant_id,
    target_name = m.name,
    target_details = CONCAT(
        '{"type":"MERCHANT"',
        CASE WHEN m.contact_person_name IS NOT NULL THEN CONCAT(',"contactPerson":"', m.contact_person_name, '"') ELSE '' END,
        CASE WHEN m.contact_email IS NOT NULL THEN CONCAT(',"email":"', m.contact_email, '"') ELSE '' END,
        CASE WHEN m.contact_phone IS NOT NULL THEN CONCAT(',"phone":"', m.contact_phone, '"') ELSE '' END,
        '}'
    )
FROM merchant m
WHERE pr.merchant_id = m.id
  AND pr.merchant_id IS NOT NULL
  AND pr.source_type IN ('PURCHASE_ORDER', 'MAINTENANCE');

-- =============================================
-- STEP 5: Backfill ALL Employee Group target fields (payroll batches)
-- =============================================
UPDATE payment_requests pr
SET
    target_type = 'EMPLOYEE_GROUP',
    target_id = pr.payroll_batch_id,
    target_name = CONCAT(pb.employee_count, ' Employees'),
    target_details = CONCAT(
        '{"batchNumber":"', pb.batch_number, '"',
        ',"employeeCount":', pb.employee_count,
        '}'
    )
FROM payroll_batches pb
WHERE pr.payroll_batch_id = pb.id
  AND pr.payroll_batch_id IS NOT NULL
  AND pr.source_type = 'PAYROLL_BATCH';

-- =============================================
-- STEP 6: Handle remaining NULL source_type records
-- =============================================
UPDATE payment_requests
SET source_type = 'UNKNOWN',
    source_description = 'Legacy record - source not determined'
WHERE source_type IS NULL;

UPDATE payment_requests pr
SET target_type = 'MERCHANT',
    target_id = pr.merchant_id,
    target_name = COALESCE(pr.merchant_name, 'Unknown Merchant')
WHERE pr.target_type IS NULL
  AND pr.merchant_id IS NOT NULL;

UPDATE payment_requests
SET target_type = 'UNKNOWN',
    target_name = COALESCE(merchant_name, 'Unknown Recipient')
WHERE target_type IS NULL;

-- =============================================
-- VERIFICATION
-- =============================================
DO $$
DECLARE
    po_count INTEGER;
    maint_count INTEGER;
    payroll_count INTEGER;
    loan_count INTEGER;
    unknown_src INTEGER;
    null_source_id INTEGER;
    merchant_tgt INTEGER;
    emp_group_tgt INTEGER;
    emp_tgt INTEGER;
    unknown_tgt INTEGER;
    null_target_id INTEGER;
BEGIN
    SELECT COUNT(*) INTO po_count FROM payment_requests WHERE source_type = 'PURCHASE_ORDER';
    SELECT COUNT(*) INTO maint_count FROM payment_requests WHERE source_type = 'MAINTENANCE';
    SELECT COUNT(*) INTO payroll_count FROM payment_requests WHERE source_type = 'PAYROLL_BATCH';
    SELECT COUNT(*) INTO loan_count FROM payment_requests WHERE source_type = 'LOAN';
    SELECT COUNT(*) INTO unknown_src FROM payment_requests WHERE source_type = 'UNKNOWN';
    SELECT COUNT(*) INTO null_source_id FROM payment_requests WHERE source_id IS NULL;
    SELECT COUNT(*) INTO merchant_tgt FROM payment_requests WHERE target_type = 'MERCHANT';
    SELECT COUNT(*) INTO emp_group_tgt FROM payment_requests WHERE target_type = 'EMPLOYEE_GROUP';
    SELECT COUNT(*) INTO emp_tgt FROM payment_requests WHERE target_type = 'EMPLOYEE';
    SELECT COUNT(*) INTO unknown_tgt FROM payment_requests WHERE target_type = 'UNKNOWN';
    SELECT COUNT(*) INTO null_target_id FROM payment_requests WHERE target_id IS NULL;

    RAISE NOTICE 'Backfill Results:';
    RAISE NOTICE '  Sources: PO=%, MAINTENANCE=%, PAYROLL=%, LOAN=%, UNKNOWN=%', po_count, maint_count, payroll_count, loan_count, unknown_src;
    RAISE NOTICE '  Targets: MERCHANT=%, EMPLOYEE_GROUP=%, EMPLOYEE=%, UNKNOWN=%', merchant_tgt, emp_group_tgt, emp_tgt, unknown_tgt;
    RAISE NOTICE '  NULL source_id: %, NULL target_id: %', null_source_id, null_target_id;
END $$;
