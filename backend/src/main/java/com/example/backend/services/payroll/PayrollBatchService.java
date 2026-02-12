package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.EmployeePayrollDTO;
import com.example.backend.dto.payroll.PayrollBatchDTO;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollBatchRepository;
import com.example.backend.repositories.payroll.PayrollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollBatchService {

    private final PayrollBatchRepository batchRepository;
    private final PayrollRepository payrollRepository;
    private final EmployeePayrollRepository employeePayrollRepository;
    private final PaymentRequestRepository paymentRequestRepository;

    /**
     * Create batches for a payroll by grouping employee payrolls by payment type
     */
    @Transactional
    public List<PayrollBatchDTO> createBatchesForPayroll(UUID payrollId, String username) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new RuntimeException("Payroll not found: " + payrollId));

        // Verify payroll is in correct status
        if (payroll.getStatus() != PayrollStatus.CONFIRMED_AND_LOCKED) {
            throw new RuntimeException("Payroll must be in CONFIRMED_AND_LOCKED status to create batches");
        }

        // Get all employee payrolls for this payroll
        List<EmployeePayroll> employeePayrolls = employeePayrollRepository.findByPayrollId(payrollId);

        if (employeePayrolls.isEmpty()) {
            throw new RuntimeException("No employee payrolls found for payroll: " + payrollId);
        }

        // Group by payment type
        Map<UUID, List<EmployeePayroll>> groupedByPaymentType = employeePayrolls.stream()
            .filter(ep -> ep.getPaymentTypeId() != null)
            .collect(Collectors.groupingBy(EmployeePayroll::getPaymentTypeId));

        // Check for employees without payment type
        List<EmployeePayroll> withoutPaymentType = employeePayrolls.stream()
            .filter(ep -> ep.getPaymentTypeId() == null)
            .collect(Collectors.toList());

        if (!withoutPaymentType.isEmpty()) {
            log.warn("Found {} employees without payment type in payroll {}",
                withoutPaymentType.size(), payrollId);
        }

        // Delete existing batches if any (for re-batching scenario)
        List<PayrollBatch> existingBatches = batchRepository.findByPayrollId(payrollId);
        if (!existingBatches.isEmpty()) {
            log.info("Deleting {} existing batches for payroll {}", existingBatches.size(), payrollId);
            batchRepository.deleteAll(existingBatches);
        }

        // Create batches
        List<PayrollBatch> batches = new ArrayList<>();
        for (Map.Entry<UUID, List<EmployeePayroll>> entry : groupedByPaymentType.entrySet()) {
            UUID paymentTypeId = entry.getKey();
            List<EmployeePayroll> batchEmployees = entry.getValue();

            // Get payment type info from first employee (all have same type)
            String paymentTypeCode = batchEmployees.get(0).getPaymentTypeCode();
            String paymentTypeName = batchEmployees.get(0).getPaymentTypeName();

            // Calculate batch total
            BigDecimal totalAmount = batchEmployees.stream()
                .map(ep -> ep.getNetPay() != null ? ep.getNetPay() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Generate batch number
            String batchNumber = generateBatchNumber();

            PayrollBatch batch = PayrollBatch.builder()
                .batchNumber(batchNumber)
                .payroll(payroll)
                .paymentType(PaymentType.builder().id(paymentTypeId).build())
                .totalAmount(totalAmount)
                .employeeCount(batchEmployees.size())
                .status(PayrollStatus.PENDING_FINANCE_REVIEW)
                .createdBy(username)
                .build();

            batch = batchRepository.save(batch);

            // Link employee payrolls to batch
            for (EmployeePayroll ep : batchEmployees) {
                ep.setPayrollBatch(batch);
                employeePayrollRepository.save(ep);
            }

            batches.add(batch);
            log.info("Created batch {} for payment type {} with {} employees, total: {}",
                batchNumber, paymentTypeName, batchEmployees.size(), totalAmount);
        }

        return batches.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Send batches to finance by creating payment requests
     */
    @Transactional
    public List<PayrollBatchDTO> sendBatchesToFinance(UUID payrollId, String username) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new RuntimeException("Payroll not found: " + payrollId));

        List<PayrollBatch> batches = batchRepository.findByPayrollId(payrollId);

        if (batches.isEmpty()) {
            throw new RuntimeException("No batches found. Create batches first.");
        }

        List<PayrollBatchDTO> results = new ArrayList<>();

        for (PayrollBatch batch : batches) {
            // Skip if already sent
            if (batch.getPaymentRequest() != null) {
                log.info("Batch {} already has payment request, skipping", batch.getBatchNumber());
                results.add(toDTO(batch));
                continue;
            }

            // Create payment request for this batch
            PaymentRequest paymentRequest = createPaymentRequestForBatch(batch, payroll, username);

            // Link payment request to batch
            batch.setPaymentRequest(paymentRequest);
            batch.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);
            batch.setSentToFinanceAt(LocalDateTime.now());
            batch.setSentToFinanceBy(username);

            batchRepository.save(batch);
            results.add(toDTO(batch));

            log.info("Created payment request {} for batch {}",
                paymentRequest.getRequestNumber(), batch.getBatchNumber());
        }

        // Update payroll status
        payroll.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);
        payroll.setSentToFinanceAt(LocalDateTime.now());
        payroll.setSentToFinanceBy(username);
        payrollRepository.save(payroll);

        return results;
    }

    /**
     * Create a payment request for a batch
     */
    private PaymentRequest createPaymentRequestForBatch(PayrollBatch batch, Payroll payroll, String username) {
        String requestNumber = generatePaymentRequestNumber();

        PaymentRequest request = PaymentRequest.builder()
            .requestNumber(requestNumber)
            .requestedAmount(batch.getTotalAmount())
            .currency("EGP")
            .status(PaymentRequestStatus.PENDING)
            .description("Payroll batch: " + batch.getBatchNumber() +
                " - " + batch.getEmployeeCount() + " employees via " +
                (batch.getPaymentType() != null ? batch.getPaymentType().getName() : "Unknown"))
            // Source polymorphism
            .sourceType("PAYROLL_BATCH")
            .sourceId(batch.getId())
            .sourceNumber(batch.getBatchNumber())
            .sourceDescription("Payroll " + payroll.getPayrollNumber() + " - Batch " + batch.getBatchNumber())
            // Target - for payroll, target is a group (employees), not a single merchant
            .targetType("EMPLOYEE_GROUP")
            .targetName(batch.getEmployeeCount() + " Employees")
            // Link to batch
            .payrollBatch(batch)
            // Requester info
            .requestedByUserId(UUID.randomUUID()) // Should be actual user ID from auth context
            .requestedByUserName(username)
            .requestedByDepartment("HR")
            .build();

        return paymentRequestRepository.save(request);
    }

    /**
     * Get batches for a payroll
     */
    public List<PayrollBatchDTO> getBatchesForPayroll(UUID payrollId) {
        return batchRepository.findByPayrollIdWithPaymentType(payrollId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get batch by ID with details
     */
    public PayrollBatchDTO getBatchById(UUID batchId) {
        PayrollBatch batch = batchRepository.findByIdWithDetails(batchId)
            .orElseThrow(() -> new RuntimeException("Batch not found: " + batchId));
        return toDTO(batch);
    }

    /**
     * Update batch status (called when payment request status changes)
     */
    @Transactional
    public void updateBatchStatus(UUID batchId, PayrollStatus newStatus, String username) {
        PayrollBatch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new RuntimeException("Batch not found: " + batchId));

        PayrollStatus oldStatus = batch.getStatus();
        batch.setStatus(newStatus);
        batchRepository.save(batch);

        log.info("Batch {} status changed from {} to {} by {}",
            batch.getBatchNumber(), oldStatus, newStatus, username);

        // Update parent payroll status based on all batch statuses
        updatePayrollStatusFromBatches(batch.getPayroll().getId(), username);
    }

    /**
     * Update payroll status based on batch statuses
     */
    @Transactional
    public void updatePayrollStatusFromBatches(UUID payrollId, String username) {
        Payroll payroll = payrollRepository.findById(payrollId)
            .orElseThrow(() -> new RuntimeException("Payroll not found: " + payrollId));

        List<PayrollBatch> batches = batchRepository.findByPayrollId(payrollId);

        if (batches.isEmpty()) {
            return;
        }

        // Check statuses
        boolean allPaid = batches.stream().allMatch(b -> b.getStatus() == PayrollStatus.PAID);
        boolean allApproved = batches.stream().allMatch(b -> b.getStatus() == PayrollStatus.FINANCE_APPROVED);
        boolean anyRejected = batches.stream().anyMatch(b -> b.getStatus() == PayrollStatus.FINANCE_REJECTED);
        boolean anyPartiallyPaid = batches.stream().anyMatch(b -> b.getStatus() == PayrollStatus.PARTIALLY_PAID);
        boolean somePaid = batches.stream().anyMatch(b -> b.getStatus() == PayrollStatus.PAID);

        PayrollStatus newStatus;
        if (allPaid) {
            newStatus = PayrollStatus.PAID;
            payroll.setPaidAt(LocalDateTime.now());
            payroll.setPaidBy(username);
        } else if (anyRejected) {
            newStatus = PayrollStatus.FINANCE_REJECTED;
        } else if (anyPartiallyPaid || somePaid) {
            newStatus = PayrollStatus.PARTIALLY_PAID;
        } else if (allApproved) {
            newStatus = PayrollStatus.FINANCE_APPROVED;
            payroll.setFinanceReviewedAt(LocalDateTime.now());
            payroll.setFinanceReviewedBy(username);
        } else {
            newStatus = PayrollStatus.PENDING_FINANCE_REVIEW;
        }

        if (payroll.getStatus() != newStatus) {
            log.info("Payroll {} status changing from {} to {}",
                payroll.getPayrollNumber(), payroll.getStatus(), newStatus);
            payroll.setStatus(newStatus);
            payrollRepository.save(payroll);
        }
    }

    /**
     * Generate batch number (format: PB-YYYY-NNNNNN)
     */
    private String generateBatchNumber() {
        String year = String.valueOf(Year.now().getValue());
        Integer maxSeq = batchRepository.getMaxBatchSequenceForYear(year);
        int nextSeq = (maxSeq != null ? maxSeq : 0) + 1;
        return String.format("PB-%s-%06d", year, nextSeq);
    }

    /**
     * Generate payment request number
     */
    private String generatePaymentRequestNumber() {
        return "PR-" + System.currentTimeMillis() + "-" +
            String.format("%04d", new Random().nextInt(10000));
    }

    /**
     * Convert entity to DTO
     */
    public PayrollBatchDTO toDTO(PayrollBatch batch) {
        PayrollBatchDTO dto = PayrollBatchDTO.builder()
            .id(batch.getId())
            .batchNumber(batch.getBatchNumber())
            .payrollId(batch.getPayroll() != null ? batch.getPayroll().getId() : null)
            .payrollNumber(batch.getPayroll() != null ? batch.getPayroll().getPayrollNumber() : null)
            .paymentTypeId(batch.getPaymentType() != null ? batch.getPaymentType().getId() : null)
            .paymentTypeCode(batch.getPaymentType() != null ? batch.getPaymentType().getCode() : null)
            .paymentTypeName(batch.getPaymentType() != null ? batch.getPaymentType().getName() : null)
            .totalAmount(batch.getTotalAmount())
            .employeeCount(batch.getEmployeeCount())
            .status(batch.getStatus() != null ? batch.getStatus().name() : null)
            .statusDisplayName(batch.getStatus() != null ? batch.getStatus().getDisplayName() : null)
            .paymentRequestId(batch.getPaymentRequest() != null ? batch.getPaymentRequest().getId() : null)
            .paymentRequestNumber(batch.getPaymentRequest() != null ? batch.getPaymentRequest().getRequestNumber() : null)
            .createdAt(batch.getCreatedAt())
            .createdBy(batch.getCreatedBy())
            .sentToFinanceAt(batch.getSentToFinanceAt())
            .sentToFinanceBy(batch.getSentToFinanceBy())
            .build();

        return dto;
    }
}
