-- =============================================
-- V20260203: Backfill source and target polymorphic fields for existing PaymentRequests
-- This migration populates source_type, source_id, source_number, source_description,
-- target_type, target_id, target_name, and target_details for all existing payment requests.
-- =============================================

-- =============================================
-- STEP 1: Backfill SOURCE fields for PURCHASE_ORDER based payment requests
-- =============================================
UPDATE payment_requests pr
SET
    source_type = 'PURCHASE_ORDER',
    source_id = pr.purchase_order_id,
    source_number = po.po_number,
    source_description = CONCAT('Purchase Order: ', po.po_number)
FROM purchase_orders po
WHERE pr.purchase_order_id = po.id
  AND pr.source_type IS NULL;

-- =============================================
-- STEP 2: Backfill SOURCE fields for MAINTENANCE based payment requests
-- =============================================
UPDATE payment_requests pr
SET
    source_type = 'MAINTENANCE',
    source_id = pr.maintenance_step_id,
    source_number = COALESCE(mr.record_number, CAST(pr.maintenance_step_id AS VARCHAR(36))),
    source_description = CONCAT('Maintenance: ', COALESCE(mr.record_number, 'Step'))
FROM maintenance_steps ms
LEFT JOIN maintenance_records mr ON ms.maintenance_record_id = mr.id
WHERE pr.maintenance_step_id = ms.id
  AND pr.source_type IS NULL;

-- =============================================
-- STEP 3: Backfill SOURCE fields for PAYROLL_BATCH based payment requests
-- =============================================
UPDATE payment_requests pr
SET
    source_type = 'PAYROLL_BATCH',
    source_id = pr.payroll_batch_id,
    source_number = pb.batch_number,
    source_description = CONCAT('Payroll Batch: ', pb.batch_number)
FROM payroll_batches pb
WHERE pr.payroll_batch_id = pb.id
  AND pr.source_type IS NULL;

-- =============================================
-- STEP 4: Backfill TARGET fields for MERCHANT based payment requests (from PO/Maintenance)
-- =============================================
UPDATE payment_requests pr
SET
    target_type = 'MERCHANT',
    target_id = pr.merchant_id,
    target_name = m.name,
    target_details = CONCAT('{',
        '"contactPerson":"', COALESCE(m.contact_person, ''), '",',
        '"bankName":"', COALESCE(m.bank_name, ''), '",',
        '"bankAccountNumber":"', COALESCE(m.bank_account_number, ''), '",',
        '"email":"', COALESCE(m.email, ''), '",',
        '"phone":"', COALESCE(m.phone, ''), '"',
    '}')
FROM merchants m
WHERE pr.merchant_id = m.id
  AND pr.target_type IS NULL
  AND (pr.purchase_order_id IS NOT NULL OR pr.maintenance_step_id IS NOT NULL);

-- =============================================
-- STEP 5: Backfill TARGET fields for EMPLOYEE_GROUP based payment requests (from payroll batches)
-- This applies to payroll batch payment requests which pay multiple employees
-- =============================================
UPDATE payment_requests pr
SET
    target_type = 'EMPLOYEE_GROUP',
    target_id = pr.payroll_batch_id,
    target_name = CONCAT(pb.employee_count, ' Employees'),
    target_details = CONCAT('{',
        '"batchNumber":"', pb.batch_number, '",',
        '"employeeCount":', pb.employee_count, ',',
        '"paymentTypeId":"', COALESCE(CAST(pb.payment_type_id AS VARCHAR(36)), ''), '"',
    '}')
FROM payroll_batches pb
WHERE pr.payroll_batch_id = pb.id
  AND pr.target_type IS NULL;

-- =============================================
-- STEP 6: Handle any remaining records without source/target by setting to UNKNOWN
-- =============================================
UPDATE payment_requests
SET
    source_type = 'UNKNOWN',
    source_description = 'Source information not available'
WHERE source_type IS NULL;

UPDATE payment_requests
SET
    target_type = 'UNKNOWN',
    target_name = COALESCE(merchant_name, 'Unknown Recipient')
WHERE target_type IS NULL;

-- =============================================
-- VERIFICATION: Log counts for each source type
-- =============================================
DO $$
DECLARE
    po_count INTEGER;
    maintenance_count INTEGER;
    payroll_count INTEGER;
    unknown_source_count INTEGER;
    merchant_count INTEGER;
    employee_group_count INTEGER;
    unknown_target_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO po_count FROM payment_requests WHERE source_type = 'PURCHASE_ORDER';
    SELECT COUNT(*) INTO maintenance_count FROM payment_requests WHERE source_type = 'MAINTENANCE';
    SELECT COUNT(*) INTO payroll_count FROM payment_requests WHERE source_type = 'PAYROLL_BATCH';
    SELECT COUNT(*) INTO unknown_source_count FROM payment_requests WHERE source_type = 'UNKNOWN';
    SELECT COUNT(*) INTO merchant_count FROM payment_requests WHERE target_type = 'MERCHANT';
    SELECT COUNT(*) INTO employee_group_count FROM payment_requests WHERE target_type = 'EMPLOYEE_GROUP';
    SELECT COUNT(*) INTO unknown_target_count FROM payment_requests WHERE target_type = 'UNKNOWN';

    RAISE NOTICE 'Payment Request Source/Target Backfill Complete:';
    RAISE NOTICE '  PURCHASE_ORDER sources: %', po_count;
    RAISE NOTICE '  MAINTENANCE sources: %', maintenance_count;
    RAISE NOTICE '  PAYROLL_BATCH sources: %', payroll_count;
    RAISE NOTICE '  UNKNOWN sources: %', unknown_source_count;
    RAISE NOTICE '  MERCHANT targets: %', merchant_count;
    RAISE NOTICE '  EMPLOYEE_GROUP targets: %', employee_group_count;
    RAISE NOTICE '  UNKNOWN targets: %', unknown_target_count;
END $$;
