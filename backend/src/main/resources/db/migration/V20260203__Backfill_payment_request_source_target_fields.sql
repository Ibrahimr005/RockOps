-- =============================================
-- V20260203: Backfill source and target polymorphic fields for existing PaymentRequests
-- Wrapped in existence checks for fresh deploy compatibility
-- On fresh deploy: tables are empty, so backfill is a no-op
-- =============================================

DO $$
BEGIN
    -- Skip entire migration if source_type column doesn't exist yet (added by V20260202)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'payment_requests' AND column_name = 'source_type') THEN
        RAISE NOTICE 'V20260203: source_type column not found. Skipping (fresh deploy).';
        RETURN;
    END IF;

    -- STEP 1: Backfill SOURCE fields for PURCHASE_ORDER based payment requests
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
          AND pr.source_type IS NULL;
    END IF;

    -- STEP 2: Backfill SOURCE fields for MAINTENANCE based payment requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_steps')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'maintenance_step_id') THEN
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
    END IF;

    -- STEP 3: Backfill SOURCE fields for PAYROLL_BATCH based payment requests
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
          AND pr.source_type IS NULL;
    END IF;

    -- STEP 4: Backfill TARGET fields for MERCHANT based payment requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchants')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'merchant_id') THEN
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
    END IF;

    -- STEP 5: Backfill TARGET fields for EMPLOYEE_GROUP based payment requests (payroll batches)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_batches')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'payroll_batch_id') THEN
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
    END IF;

    -- STEP 6: Handle any remaining records without source/target by setting to UNKNOWN
    UPDATE payment_requests
    SET
        source_type = 'UNKNOWN',
        source_description = 'Source information not available'
    WHERE source_type IS NULL;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'merchant_name') THEN
        UPDATE payment_requests
        SET
            target_type = 'UNKNOWN',
            target_name = COALESCE(merchant_name, 'Unknown Recipient')
        WHERE target_type IS NULL;
    ELSE
        UPDATE payment_requests
        SET
            target_type = 'UNKNOWN',
            target_name = 'Unknown Recipient'
        WHERE target_type IS NULL;
    END IF;

    RAISE NOTICE 'V20260203: Payment request source/target backfill complete.';
END $$;
