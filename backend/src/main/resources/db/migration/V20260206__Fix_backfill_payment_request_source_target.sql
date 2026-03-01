-- =============================================
-- V20260206: Fix backfill of source/target fields for payment_requests
-- Aggressively re-backfills ALL records based on FK references.
-- Fixes incorrect column names from V20260203.
-- Wrapped in existence checks for fresh deploy compatibility.
-- =============================================

DO $$
BEGIN
    -- Skip entire migration if source_type column doesn't exist yet
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'payment_requests' AND column_name = 'source_type') THEN
        RAISE NOTICE 'V20260206: source_type column not found. Skipping (fresh deploy).';
        RETURN;
    END IF;

    -- STEP 1: Backfill ALL PO-based payment requests (force update source fields)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'purchase_order_id') THEN
        UPDATE payment_requests pr
        SET
            source_type = 'PURCHASE_ORDER',
            source_id = pr.purchase_order_id,
            source_number = po.po_number,
            source_description = CONCAT('Purchase Order: ', po.po_number)
        FROM purchase_orders po
        WHERE pr.purchase_order_id = po.id
          AND pr.purchase_order_id IS NOT NULL;
    END IF;

    -- STEP 2: Backfill ALL Maintenance-based payment requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_steps')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'maintenance_step_id') THEN
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
    END IF;

    -- STEP 3: Backfill ALL Payroll Batch-based payment requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_batches')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'payroll_batch_id') THEN
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
    END IF;

    -- STEP 4: Backfill ALL Merchant target fields (for PO and Maintenance)
    -- Uses correct column names: contact_person_name, contact_email, contact_phone
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'merchant_id') THEN
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
    END IF;

    -- STEP 5: Backfill ALL Employee Group target fields (payroll batches)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_batches')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'payroll_batch_id') THEN
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
    END IF;

    -- STEP 6: Handle remaining NULL source_type records
    UPDATE payment_requests
    SET source_type = 'UNKNOWN',
        source_description = 'Legacy record - source not determined'
    WHERE source_type IS NULL;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'merchant_id') THEN
        UPDATE payment_requests pr
        SET target_type = 'MERCHANT',
            target_id = pr.merchant_id,
            target_name = COALESCE(pr.merchant_name, 'Unknown Merchant')
        WHERE pr.target_type IS NULL
          AND pr.merchant_id IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'merchant_name') THEN
        UPDATE payment_requests
        SET target_type = 'UNKNOWN',
            target_name = COALESCE(merchant_name, 'Unknown Recipient')
        WHERE target_type IS NULL;
    ELSE
        UPDATE payment_requests
        SET target_type = 'UNKNOWN',
            target_name = 'Unknown Recipient'
        WHERE target_type IS NULL;
    END IF;

    RAISE NOTICE 'V20260206: Payment request source/target fix-backfill complete.';
END $$;
