package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.ApproveRejectPaymentRequestDTO;
import com.example.backend.dto.finance.accountsPayable.BatchEmployeeDTO;
import com.example.backend.dto.finance.accountsPayable.PaymentRequestItemResponseDTO;
import com.example.backend.dto.finance.accountsPayable.PaymentRequestResponseDTO;
import com.example.backend.models.payroll.PayrollBatch;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.PaymentRequestItem;
import com.example.backend.models.finance.accountsPayable.PaymentRequestSourceProvider;
import com.example.backend.models.finance.accountsPayable.PaymentRequestStatusHistory;
import com.example.backend.models.finance.accountsPayable.PaymentSourceType;
import com.example.backend.models.finance.accountsPayable.PaymentTargetType;
import com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestItemStatus;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.maintenance.MaintenanceStep;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.Logistics.Logistics;
import com.example.backend.models.procurement.Logistics.LogisticsPaymentStatus;
import com.example.backend.models.procurement.Logistics.LogisticsStatus;
import com.example.backend.models.procurement.PurchaseOrder.POItemPaymentStatus;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestItemRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestStatusHistoryRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.services.finance.loans.LoanPaymentRequestService;
import com.example.backend.services.payroll.PayrollBatchService;
import com.example.backend.services.procurement.LogisticsService;
import com.example.backend.models.payroll.Bonus;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.PayrollStatus;
import com.example.backend.models.warehouse.ItemType;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PaymentRequestService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final PaymentRequestStatusHistoryRepository statusHistoryRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final OfferFinancialReviewRepository offerFinancialReviewRepository;
    private final PaymentRequestItemRepository paymentRequestItemRepository;
    private final PayrollBatchService payrollBatchService;
    private final LoanRepository loanRepository;
    private final BonusRepository bonusRepository;
    private final LogisticsService logisticsService;
    private final LoanPaymentRequestService loanPaymentRequestService;

    @Autowired
    public PaymentRequestService(
            PaymentRequestRepository paymentRequestRepository,
            PaymentRequestStatusHistoryRepository statusHistoryRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            OfferFinancialReviewRepository offerFinancialReviewRepository,
            PaymentRequestItemRepository paymentRequestItemRepository,
            @Lazy PayrollBatchService payrollBatchService,
            LoanRepository loanRepository,
            BonusRepository bonusRepository,
            LogisticsService logisticsService,
            @Lazy LoanPaymentRequestService loanPaymentRequestService) {
        this.paymentRequestRepository = paymentRequestRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.offerFinancialReviewRepository = offerFinancialReviewRepository;
        this.paymentRequestItemRepository = paymentRequestItemRepository;
        this.payrollBatchService = payrollBatchService;
        this.loanRepository = loanRepository;
        this.bonusRepository = bonusRepository;
        this.logisticsService = logisticsService;
        this.loanPaymentRequestService = loanPaymentRequestService;
    }

    public List<PaymentRequestResponseDTO> getAllPaymentRequests() {
        List<PaymentRequest> requests = paymentRequestRepository.findAll();
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Creates one payment request per merchant from a Purchase Order.
     * Returns the FIRST one for backward compatibility.
     */
    @Transactional
    public PaymentRequestResponseDTO createPaymentRequestFromPO(
            UUID purchaseOrderId,
            UUID offerId,
            String createdByUsername) {

        System.err.println("💚 ========================================");
        System.err.println("💚 CREATING PAYMENT REQUESTS FOR PO");
        System.err.println("💚 PO ID: " + purchaseOrderId);
        System.err.println("💚 Offer ID: " + offerId);
        System.err.println("💚 ========================================");

        // Load PO
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with ID: " + purchaseOrderId));
        System.err.println("💚 Found PO: " + po.getPoNumber());

        // Get all PO items
        List<PurchaseOrderItem> poItems = po.getPurchaseOrderItems();
        if (poItems == null || poItems.isEmpty()) {
            throw new RuntimeException("Purchase Order has no items");
        }
        System.err.println("💚 Total PO items: " + poItems.size());

        // Group PO items by merchant
        Map<Merchant, List<PurchaseOrderItem>> itemsByMerchant = poItems.stream()
                .filter(item -> item.getMerchant() != null)
                .collect(Collectors.groupingBy(PurchaseOrderItem::getMerchant));

        System.err.println("💚 Merchants found: " + itemsByMerchant.size());
        for (Merchant merchant : itemsByMerchant.keySet()) {
            System.err.println("💚   - " + merchant.getName() + " (" + itemsByMerchant.get(merchant).size() + " items)");
        }

        // Load offer financial review (shared across all payment requests)
        OfferFinancialReview offerFinancialReview = null;
        if (offerId != null) {
            offerFinancialReview = offerFinancialReviewRepository
                    .findByOfferId(offerId)
                    .orElse(null);
            System.err.println("💚 Offer Financial Review: " + (offerFinancialReview != null ? "Found" : "Not found"));
        }

        PaymentRequestResponseDTO firstPaymentRequestDTO = null;

        // Create one payment request per merchant
        for (Map.Entry<Merchant, List<PurchaseOrderItem>> entry : itemsByMerchant.entrySet()) {
            Merchant merchant = entry.getKey();
            List<PurchaseOrderItem> merchantItems = entry.getValue();

            try {
                // Calculate total for this merchant's items
                double merchantTotal = merchantItems.stream()
                        .mapToDouble(PurchaseOrderItem::getTotalPrice)
                        .sum();

                System.err.println("💚 ----------------------------------------");
                System.err.println("💚 Processing merchant: " + merchant.getName());
                System.err.println("💚 Items: " + merchantItems.size());
                System.err.println("💚 Total amount: " + merchantTotal + " " + po.getCurrency());

                // Generate unique request number
                String requestNumber = generatePaymentRequestNumber();
                System.err.println("💚 Request number: " + requestNumber);

                // Create Payment Request for this merchant
                PaymentRequest paymentRequest = PaymentRequest.builder()
                        .requestNumber(requestNumber)
                        .purchaseOrder(po)
                        .offerFinancialReview(offerFinancialReview)
                        // Source polymorphism - where payment originates
                        .sourceType(PaymentSourceType.PURCHASE_ORDER)
                        .sourceId(po.getId())
                        .sourceNumber(po.getPoNumber())
                        .sourceDescription("Purchase Order: " + po.getPoNumber())
                        // Target polymorphism - who receives payment
                        .targetType(PaymentTargetType.MERCHANT)
                        .targetId(merchant.getId())
                        .targetName(merchant.getName())
                        .targetDetails(buildMerchantTargetDetails(merchant))
                        // Amount and currency
                        .requestedAmount(BigDecimal.valueOf(merchantTotal))
                        .currency(po.getCurrency())
                        .description(po.getPoNumber() + " - " + merchant.getName())
                        .status(PaymentRequestStatus.PENDING)
                        .requestedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000"))
                        .requestedByUserName(createdByUsername)
                        .requestedByDepartment("Procurement")
                        .requestedAt(LocalDateTime.now())
                        .paymentDueDate(po.getExpectedDeliveryDate() != null ? po.getExpectedDeliveryDate().toLocalDate() : null)
                        .totalPaidAmount(BigDecimal.ZERO)
                        .remainingAmount(BigDecimal.valueOf(merchantTotal))
                        .merchant(merchant)
                        .merchantName(merchant.getName())
                        .merchantAccountNumber(null)
                        .merchantBankName(null)
                        .merchantContactPerson(merchant.getContactPersonName())
                        .merchantContactPhone(merchant.getContactPhone())
                        .merchantContactEmail(merchant.getContactEmail())
                        .build();

                PaymentRequest savedPaymentRequest = paymentRequestRepository.save(paymentRequest);
                System.err.println("💚 ✓ Payment Request created: " + savedPaymentRequest.getId());

                // Create Payment Request Items (only for this merchant)
                List<PaymentRequestItem> prItems = new ArrayList<>();
                for (PurchaseOrderItem poItem : merchantItems) {
                    ItemType itemType = poItem.getItemType();
                    String itemName = itemType != null ? itemType.getName() : "Unknown Item";
                    String itemDescription = itemType != null && itemType.getComment() != null ? itemType.getComment() : "";
                    String unit = itemType != null && itemType.getMeasuringUnit() != null ?
                            itemType.getMeasuringUnit().getName() : "units";

                    PaymentRequestItem prItem = PaymentRequestItem.builder()
                            .paymentRequest(savedPaymentRequest)
                            .itemId(poItem.getId())                    // Keep for backward compatibility
                            .purchaseOrderItemId(poItem.getId())       // Explicit link to PO item
                            .itemName(itemName)
                            .itemDescription(itemDescription)
                            .quantity(BigDecimal.valueOf(poItem.getQuantity()))
                            .unit(unit)
                            .unitPrice(BigDecimal.valueOf(poItem.getUnitPrice()))
                            .totalPrice(BigDecimal.valueOf(poItem.getTotalPrice()))
                            .paidAmount(BigDecimal.ZERO)
                            .remainingAmount(BigDecimal.valueOf(poItem.getTotalPrice()))
                            .status(PaymentRequestItemStatus.PENDING)
                            .build();

                    prItems.add(prItem);
                }

                if (!prItems.isEmpty()) {
                    List<PaymentRequestItem> savedPRItems = paymentRequestItemRepository.saveAll(prItems);
                    System.err.println("💚 ✓ Created " + savedPRItems.size() + " payment request items");

                    // Link PO items back to payment request items
                    for (int i = 0; i < merchantItems.size(); i++) {
                        PurchaseOrderItem poItem = merchantItems.get(i);
                        PaymentRequestItem prItem = savedPRItems.get(i);
                        poItem.setPaymentRequestItemId(prItem.getId());
                        poItem.setPaymentStatus(POItemPaymentStatus.PENDING);
                    }
                    purchaseOrderRepository.save(po);
                    System.err.println("💚 ✓ Linked PO items to payment request items");
                }

                // Store first payment request DTO for return (backward compatibility)
                if (firstPaymentRequestDTO == null) {
                    firstPaymentRequestDTO = convertToDTO(savedPaymentRequest);
                }

            } catch (Exception e) {
                System.err.println("❌ Failed to create payment request for merchant: " + merchant.getName());
                System.err.println("❌ Error: " + e.getMessage());
                e.printStackTrace();
                // Continue with other merchants even if one fails
            }
        }

        System.err.println("💚 ========================================");
        System.err.println("💚 PAYMENT REQUEST CREATION COMPLETE");
        System.err.println("💚 Total merchants processed: " + itemsByMerchant.size());
        System.err.println("💚 ========================================");

        if (firstPaymentRequestDTO == null) {
            throw new RuntimeException("Failed to create any payment requests");
        }

        return firstPaymentRequestDTO;
    }

    /**
     * Get all pending payment requests
     */
    public List<PaymentRequestResponseDTO> getPendingPaymentRequests() {
        List<PaymentRequest> requests = paymentRequestRepository.findPendingRequests();
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get approved and ready to pay payment requests
     */
    public List<PaymentRequestResponseDTO> getApprovedAndReadyToPay() {
        List<PaymentRequest> requests = paymentRequestRepository.findApprovedAndReadyToPay();
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create a payment request from a completed maintenance step.
     * Called when a maintenance record is completed to generate payment requests
     * for Finance reconciliation.
     *
     * @param step The maintenance step to create a payment request for
     * @param record The parent maintenance record
     * @param financialReview The approved financial review (budget approval)
     * @param createdByUsername Username of the person completing the record
     * @return The created payment request, or null if no payment request should be created
     */
    @Transactional
    public PaymentRequest createPaymentRequestFromMaintenanceStep(
            MaintenanceStep step,
            MaintenanceRecord record,
            OfferFinancialReview financialReview,
            String createdByUsername) {

        // 1. Idempotency check - skip if payment request already exists for this step
        if (paymentRequestRepository.existsByMaintenanceStepId(step.getId())) {
            System.out.println("[MaintenancePayment] Payment request already exists for step: " + step.getId());
            return paymentRequestRepository.findByMaintenanceStepId(step.getId()).orElse(null);
        }

        // 2. Skip steps without a merchant (internal employee work - no vendor to pay)
        Merchant merchant = step.getSelectedMerchant();
        if (merchant == null) {
            System.out.println("[MaintenancePayment] Skipping step without merchant: " + step.getId());
            return null;
        }

        // 3. Get payment amount - actualCost is preferred (final paid amount), fallback to stepCost
        BigDecimal amount = step.getActualCost() != null ? step.getActualCost() : step.getStepCost();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            System.out.println("[MaintenancePayment] Skipping step with zero/null cost: " + step.getId());
            return null;
        }

        // 4. Generate unique request number
        String requestNumber = generatePaymentRequestNumber();

        // 5. Build description with step details
        String stepTypeName = step.getStepType() != null ? step.getStepType().getName() : "Maintenance";
        String description = String.format(stepTypeName, step.getDescription());
        if (description.length() > 500) {
            description = description.substring(0, 497) + "...";
        }

        // 6. Create PaymentRequest with APPROVED status (money already paid in real life)
        PaymentRequest paymentRequest = PaymentRequest.builder()
                .requestNumber(requestNumber)
                .maintenanceStep(step)
                .maintenanceRecord(record)
                .purchaseOrder(null)  // No PO for maintenance
                .offerFinancialReview(financialReview)
                // Source polymorphism - where payment originates
                .sourceType(PaymentSourceType.MAINTENANCE)
                .sourceId(step.getId())
                .sourceNumber(record.getRecordNumber())
                .sourceDescription(description)
                // Target polymorphism - who receives payment
                .targetType(PaymentTargetType.MERCHANT)
                .targetId(merchant.getId())
                .targetName(merchant.getName())
                .targetDetails(buildMerchantTargetDetails(merchant))
                // Amount and currency
                .requestedAmount(amount)
                .currency("EGP")
                .description(description)
                .status(PaymentRequestStatus.APPROVED)  // Already paid - ready for reconciliation
                .requestedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000"))
                .requestedByUserName(createdByUsername)
                .requestedByDepartment("Maintenance")
                .requestedAt(LocalDateTime.now())
                .approvedAt(LocalDateTime.now())  // Auto-approved
                .approvedByUserName("System - Maintenance Completion")
                .approvalNotes("Auto-approved upon maintenance record completion")
                .paymentDueDate(null)  // Already paid
                .totalPaidAmount(BigDecimal.ZERO)  // Finance will update after reconciliation
                .remainingAmount(amount)
                .merchant(merchant)
                .merchantName(merchant.getName())
                .merchantContactPerson(merchant.getContactPersonName())
                .merchantContactPhone(merchant.getContactPhone())
                .merchantContactEmail(merchant.getContactEmail())
                .build();

        PaymentRequest savedRequest = paymentRequestRepository.save(paymentRequest);

        // 7. Create status history for audit trail
        createStatusHistory(
                savedRequest,
                null,
                PaymentRequestStatus.APPROVED,
                null,
                "Payment request created from maintenance record completion. Step: " + stepTypeName
        );

        System.out.println("[MaintenancePayment] Created payment request " + requestNumber +
                " for step " + step.getId() + " amount: " + amount + " EGP");

        return savedRequest;
    }

    /**
     * Generic factory method: creates a PaymentRequest from any PaymentRequestSourceProvider.
     * For complex scenarios (PO item grouping, idempotency), use the dedicated create methods instead.
     */
    @Transactional
    public PaymentRequestResponseDTO createPaymentRequestFromSource(
            PaymentRequestSourceProvider source,
            String createdByUsername) {

        String requestNumber = generatePaymentRequestNumber();

        PaymentRequest paymentRequest = PaymentRequest.builder()
                .requestNumber(requestNumber)
                .sourceType(source.getPaymentSourceType())
                .sourceId(source.getPaymentSourceId())
                .sourceNumber(source.getPaymentSourceNumber())
                .sourceDescription(source.getPaymentSourceDescription())
                .targetType(source.getPaymentTargetType())
                .targetId(source.getPaymentTargetId())
                .targetName(source.getPaymentTargetName())
                .targetDetails(source.getPaymentTargetDetails())
                .requestedAmount(source.getPaymentAmount())
                .currency(source.getPaymentCurrency())
                .description(source.getPaymentSourceDescription())
                .status(PaymentRequestStatus.PENDING)
                .requestedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000"))
                .requestedByUserName(createdByUsername)
                .requestedByDepartment(source.getPaymentDepartment())
                .requestedAt(LocalDateTime.now())
                .totalPaidAmount(BigDecimal.ZERO)
                .remainingAmount(source.getPaymentAmount())
                .build();

        PaymentRequest saved = paymentRequestRepository.save(paymentRequest);

        // Create initial status history
        createStatusHistory(saved, null, PaymentRequestStatus.PENDING, null,
                "Payment request created from " + source.getPaymentSourceType().getDisplayName());

        return convertToDTO(saved);
    }

    /**
     * Get payment requests for a specific maintenance record
     */
    public List<PaymentRequestResponseDTO> getPaymentRequestsByMaintenanceRecord(UUID maintenanceRecordId) {
        List<PaymentRequest> requests = paymentRequestRepository.findByMaintenanceRecordId(maintenanceRecordId);
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get payment request by ID
     */
    public PaymentRequestResponseDTO getPaymentRequestById(UUID id) {
        PaymentRequest request = paymentRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment Request not found with ID: " + id));
        return convertToDTO(request);
    }

    /**
     * Get payment requests by merchant
     */
    public List<PaymentRequestResponseDTO> getPaymentRequestsByMerchant(UUID merchantId) {
        List<PaymentRequest> requests = paymentRequestRepository.findByMerchantId(merchantId);
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Approve or Reject payment request
     */
    @Transactional
    public PaymentRequestResponseDTO approveOrRejectPaymentRequest(
            ApproveRejectPaymentRequestDTO request,
            UUID reviewerUserId,
            String reviewerUserName) {

        PaymentRequest paymentRequest = paymentRequestRepository.findById(request.getPaymentRequestId())
                .orElseThrow(() -> new RuntimeException("Payment Request not found"));

        // Validate current status
        if (paymentRequest.getStatus() != PaymentRequestStatus.PENDING) {
            throw new RuntimeException("Payment request is not in PENDING status");
        }

        boolean isApproval = "APPROVE".equalsIgnoreCase(request.getAction());

        // Validate rejection reason
        if (!isApproval && (request.getRejectionReason() == null || request.getRejectionReason().isBlank())) {
            throw new RuntimeException("Rejection reason is required");
        }

        PaymentRequestStatus oldStatus = paymentRequest.getStatus();
        PaymentRequestStatus newStatus = isApproval ? PaymentRequestStatus.APPROVED : PaymentRequestStatus.REJECTED;

        // Update payment request
        paymentRequest.setReviewedByUserId(reviewerUserId);
        paymentRequest.setReviewedByUserName(reviewerUserName);
        paymentRequest.setReviewedAt(LocalDateTime.now());
        paymentRequest.setReviewNotes(request.getNotes());

        if (isApproval) {
            paymentRequest.setApprovedByUserId(reviewerUserId);
            paymentRequest.setApprovedByUserName(reviewerUserName);
            paymentRequest.setApprovedAt(LocalDateTime.now());
            paymentRequest.setApprovalNotes(request.getNotes());
            paymentRequest.setStatus(PaymentRequestStatus.APPROVED);
        } else {
            paymentRequest.setRejectedByUserId(reviewerUserId);
            paymentRequest.setRejectedByUserName(reviewerUserName);
            paymentRequest.setRejectedAt(LocalDateTime.now());
            paymentRequest.setRejectionReason(request.getRejectionReason());
            paymentRequest.setStatus(PaymentRequestStatus.REJECTED);
        }

        PaymentRequest savedRequest = paymentRequestRepository.save(paymentRequest);

        // Create status history
        createStatusHistory(savedRequest, oldStatus, newStatus, reviewerUserId,
                isApproval ? request.getNotes() : request.getRejectionReason());

        // Sync with PurchaseOrder if exists
        if (savedRequest.getPurchaseOrder() != null) {
            updatePOPaymentStatus(savedRequest, isApproval);
        }

        // Sync with Logistics if exists
        if (savedRequest.getLogistics() != null) {
            updateLogisticsPaymentStatus(savedRequest, isApproval);
        }

        // Sync with payroll batch if this payment request is for a payroll batch
        syncPayrollBatchStatus(savedRequest, newStatus, reviewerUserName);

        // Sync with loan if this payment request is for a loan
        syncLoanStatus(savedRequest, newStatus, reviewerUserName);

        // Sync with bonus if this payment request is for a bonus
        syncBonusStatus(savedRequest, newStatus, reviewerUserName);

        return convertToDTO(savedRequest);
    }

    /**
     * Update payment request amounts after payment (called by PaymentService)
     */
    @Transactional
    public void updatePaymentRequestAfterPayment(UUID paymentRequestId, BigDecimal paymentAmount) {
        PaymentRequest paymentRequest = paymentRequestRepository.findById(paymentRequestId)
                .orElseThrow(() -> new RuntimeException("Payment Request not found"));

        BigDecimal currentPaid = paymentRequest.getTotalPaidAmount();
        BigDecimal newTotalPaid = currentPaid.add(paymentAmount);
        BigDecimal newRemaining = paymentRequest.getRequestedAmount().subtract(newTotalPaid);

        paymentRequest.setTotalPaidAmount(newTotalPaid);
        paymentRequest.setRemainingAmount(newRemaining);

        PaymentRequestStatus oldStatus = paymentRequest.getStatus();
        PaymentRequestStatus newStatus;

        if (newRemaining.compareTo(BigDecimal.ZERO) <= 0) {
            newStatus = PaymentRequestStatus.PAID;
        } else if (newTotalPaid.compareTo(BigDecimal.ZERO) > 0) {
            newStatus = PaymentRequestStatus.PARTIALLY_PAID;
        } else {
            newStatus = oldStatus;
        }

        if (newStatus != oldStatus) {
            paymentRequest.setStatus(newStatus);
            createStatusHistory(paymentRequest, oldStatus, newStatus, null, "Status updated after payment");

            // Sync PO items after payment
            if (paymentRequest.getPurchaseOrder() != null) {
                updatePOAfterPayment(paymentRequest);
            }

            // Sync Logistics after payment
            if (paymentRequest.getLogistics() != null) {
                updateLogisticsAfterPayment(paymentRequest);
            }

            // Sync with payroll batch if this payment request is for a payroll batch
            syncPayrollBatchStatus(paymentRequest, newStatus, "System");

            // Sync with loan if this payment request is for a loan
            syncLoanStatus(paymentRequest, newStatus, "System");

            // Sync with bonus if this payment request is for a bonus
            syncBonusStatus(paymentRequest, newStatus, "System");
        }

        paymentRequestRepository.save(paymentRequest);
    }

    // ================== PO & Logistics Sync Methods ==================

    /**
     * Update PO item payment statuses when a payment request is approved/rejected
     */
    private void updatePOPaymentStatus(PaymentRequest savedRequest, boolean isApproval) {
        PurchaseOrder po = savedRequest.getPurchaseOrder();

        // Update each PO item linked to this payment request
        for (PaymentRequestItem prItem : savedRequest.getPaymentRequestItems()) {
            UUID poItemId = prItem.getPurchaseOrderItemId();
            if (poItemId != null) {
                PurchaseOrderItem poItem = po.getPurchaseOrderItems().stream()
                        .filter(item -> item.getId().equals(poItemId))
                        .findFirst()
                        .orElse(null);

                if (poItem != null) {
                    if (isApproval) {
                        poItem.setPaymentStatus(POItemPaymentStatus.APPROVED);
                    } else {
                        poItem.setPaymentStatus(POItemPaymentStatus.REJECTED);
                    }
                }
            }
        }

        // Update overall PO payment status based on ALL items
        List<PurchaseOrderItem> allItems = po.getPurchaseOrderItems();
        long approvedCount = allItems.stream()
                .filter(item -> item.getPaymentStatus() == POItemPaymentStatus.APPROVED)
                .count();
        long paidCount = allItems.stream()
                .filter(item -> item.getPaymentStatus() == POItemPaymentStatus.PAID)
                .count();
        long rejectedCount = allItems.stream()
                .filter(item -> item.getPaymentStatus() == POItemPaymentStatus.REJECTED)
                .count();

        if (paidCount == allItems.size()) {
            po.setPaymentStatus(POPaymentStatus.PAID);
        } else if (rejectedCount == allItems.size()) {
            po.setPaymentStatus(POPaymentStatus.REJECTED);
        } else if (approvedCount > 0 || paidCount > 0) {
            po.setPaymentStatus(POPaymentStatus.APPROVED);
        }

        purchaseOrderRepository.save(po);
        System.out.println("✅ Updated PO " + po.getPoNumber() + " and " +
                savedRequest.getPaymentRequestItems().size() + " items payment status");
    }

    /**
     * Update PO items to PAID after payment is completed
     */
    private void updatePOAfterPayment(PaymentRequest paymentRequest) {
        PurchaseOrder po = paymentRequest.getPurchaseOrder();

        // Mark all items linked to this payment request as PAID
        for (PaymentRequestItem prItem : paymentRequest.getPaymentRequestItems()) {
            UUID poItemId = prItem.getPurchaseOrderItemId();
            if (poItemId != null) {
                PurchaseOrderItem poItem = po.getPurchaseOrderItems().stream()
                        .filter(item -> item.getId().equals(poItemId))
                        .findFirst()
                        .orElse(null);

                if (poItem != null) {
                    poItem.setPaymentStatus(POItemPaymentStatus.PAID);
                }
            }
        }

        // Check if all PO items are paid
        boolean allItemsPaid = po.getPurchaseOrderItems().stream()
                .allMatch(item -> item.getPaymentStatus() == POItemPaymentStatus.PAID);

        if (allItemsPaid) {
            po.setPaymentStatus(POPaymentStatus.PAID);
        }

        purchaseOrderRepository.save(po);
        System.out.println("✅ Updated PO items and PO payment status after payment");
    }

    /**
     * Update Logistics payment status when payment request is approved/rejected
     */
    private void updateLogisticsPaymentStatus(PaymentRequest paymentRequest, boolean isApproval) {
        Logistics logistics = paymentRequest.getLogistics();

        if (isApproval) {
            logistics.setStatus(LogisticsStatus.PENDING_PAYMENT);
            logistics.setPaymentStatus(LogisticsPaymentStatus.APPROVED);
            logistics.setApprovedAt(LocalDateTime.now());
            logistics.setApprovedBy(paymentRequest.getApprovedByUserName());
            System.out.println("✅ Logistics " + logistics.getLogisticsNumber() +
                    " approved - status: PENDING_PAYMENT");
        } else {
            logistics.setStatus(LogisticsStatus.COMPLETED);
            logistics.setPaymentStatus(LogisticsPaymentStatus.REJECTED);
            logistics.setRejectedAt(LocalDateTime.now());
            logistics.setRejectedBy(paymentRequest.getRejectedByUserName());
            logistics.setRejectionReason(paymentRequest.getRejectionReason());
            System.out.println("✅ Logistics " + logistics.getLogisticsNumber() +
                    " rejected - status: COMPLETED");
        }

        logisticsService.save(logistics);
    }

    /**
     * Update Logistics to COMPLETED/PAID after payment
     */
    private void updateLogisticsAfterPayment(PaymentRequest paymentRequest) {
        Logistics logistics = paymentRequest.getLogistics();

        logistics.setStatus(LogisticsStatus.COMPLETED);
        logistics.setPaymentStatus(LogisticsPaymentStatus.PAID);

        logisticsService.save(logistics);
        System.out.println("✅ Logistics " + logistics.getLogisticsNumber() +
                " paid - status: COMPLETED, payment status: PAID");
    }

    // ================== Payroll / Loan / Bonus Sync Methods ==================

    /**
     * Sync payroll batch status when payment request status changes.
     */
    private void syncPayrollBatchStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus, String username) {
        PayrollBatch batch = paymentRequest.getPayrollBatch();
        if (batch == null) {
            return;
        }

        PayrollStatus batchStatus = mapPaymentRequestStatusToPayrollStatus(newStatus);
        if (batchStatus != null) {
            try {
                payrollBatchService.updateBatchStatus(batch.getId(), batchStatus, username);
                System.out.println("[PayrollSync] Updated batch " + batch.getBatchNumber() +
                        " status to " + batchStatus + " from payment request " + paymentRequest.getRequestNumber());
            } catch (Exception e) {
                System.err.println("[PayrollSync] Failed to update batch status: " + e.getMessage());
            }
        }
    }

    /**
     * Sync loan status when payment request status changes.
     */
    private void syncLoanStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus, String username) {
        if (paymentRequest.getSourceType() == PaymentSourceType.ELOAN) {
            syncEmployeeLoanStatus(paymentRequest, newStatus, username);
        } else if (paymentRequest.getSourceType() == PaymentSourceType.CLOAN) {
            syncCompanyLoanStatus(paymentRequest, newStatus);
        }
    }

    /**
     * Sync Employee Loan (payroll module) status with PaymentRequest status.
     * Flow: HR approves → PR PENDING → Finance approves PR → APPROVED → Payment → PAID → Loan ACTIVE
     */
    private void syncEmployeeLoanStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus, String username) {
        UUID loanId = paymentRequest.getSourceId();
        if (loanId == null) return;

        try {
            Loan loan = loanRepository.findById(loanId).orElse(null);
            if (loan == null) {
                System.err.println("[EmployeeLoanSync] Employee loan not found for ID: " + loanId);
                return;
            }

            Loan.LoanStatus newLoanStatus = mapPaymentRequestStatusToLoanStatus(newStatus, loan.getStatus());
            if (newLoanStatus != null && newLoanStatus != loan.getStatus()) {
                Loan.LoanStatus oldStatus = loan.getStatus();
                loan.setStatus(newLoanStatus);

                // Update disbursement fields if moving to ACTIVE (payment was made)
                if (newLoanStatus == Loan.LoanStatus.DISBURSED || newLoanStatus == Loan.LoanStatus.ACTIVE) {
                    if (loan.getDisbursementDate() == null) {
                        loan.setDisbursementDate(LocalDate.now());
                    }
                    if (loan.getDisbursedBy() == null) {
                        loan.setDisbursedBy(username);
                    }
                    if (loan.getDisbursedAt() == null) {
                        loan.setDisbursedAt(LocalDateTime.now());
                    }
                }

                loanRepository.save(loan);
                System.out.println("[EmployeeLoanSync] Updated employee loan " + loan.getLoanNumber() +
                        " status from " + oldStatus + " to " + newLoanStatus +
                        " (PR: " + paymentRequest.getRequestNumber() + ")");
            }
        } catch (Exception e) {
            System.err.println("[EmployeeLoanSync] Failed to sync employee loan: " + e.getMessage());
        }
    }

    /**
     * Sync Company Loan (finance module) status with PaymentRequest status.
     * Company loans track payments via LoanInstallments — delegate to LoanPaymentRequestService.
     */
    private void syncCompanyLoanStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus) {
        if (newStatus != PaymentRequestStatus.PAID && newStatus != PaymentRequestStatus.PARTIALLY_PAID) {
            return; // Company loans only care about payment events
        }

        try {
            BigDecimal paidAmount = paymentRequest.getTotalPaidAmount() != null
                    ? paymentRequest.getTotalPaidAmount()
                    : paymentRequest.getRequestedAmount();

            loanPaymentRequestService.handlePaymentCompletion(paymentRequest.getId(), paidAmount);
            System.out.println("[CompanyLoanSync] Synced company loan payment for PR: " +
                    paymentRequest.getRequestNumber());
        } catch (Exception e) {
            System.err.println("[CompanyLoanSync] Failed to sync company loan: " + e.getMessage());
        }
    }

    /**
     * Sync bonus status when payment request status changes.
     */
    private void syncBonusStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus, String username) {
        if (paymentRequest.getSourceType() != PaymentSourceType.BONUS) {
            return;
        }

        UUID bonusId = paymentRequest.getSourceId();
        if (bonusId == null) {
            return;
        }

        try {
            Bonus bonus = bonusRepository.findById(bonusId).orElse(null);
            if (bonus == null) {
                System.err.println("[BonusSync] Bonus not found for ID: " + bonusId);
                return;
            }

            switch (newStatus) {
                case APPROVED:
                    System.out.println("[BonusSync] Payment request approved for bonus " +
                            bonus.getBonusNumber() + " - status remains PENDING_PAYMENT");
                    break;
                case PAID:
                    if (bonus.getStatus() == Bonus.BonusStatus.PENDING_PAYMENT) {
                        bonus.markPaid();
                        bonusRepository.save(bonus);
                        System.out.println("[BonusSync] Updated bonus " + bonus.getBonusNumber() +
                                " status to PAID from payment request " + paymentRequest.getRequestNumber());
                    }
                    break;
                case REJECTED:
                    if (bonus.getStatus() == Bonus.BonusStatus.PENDING_PAYMENT) {
                        bonus.revertToHrApproved();
                        bonusRepository.save(bonus);
                        System.out.println("[BonusSync] Reverted bonus " + bonus.getBonusNumber() +
                                " status to HR_APPROVED from payment request " + paymentRequest.getRequestNumber());
                    }
                    break;
                default:
                    break;
            }
        } catch (Exception e) {
            System.err.println("[BonusSync] Failed to update bonus status: " + e.getMessage());
        }
    }

    // ================== Status Mapping Methods ==================

    /**
     * Map PaymentRequestStatus to LoanStatus for loan synchronization
     */
    private Loan.LoanStatus mapPaymentRequestStatusToLoanStatus(PaymentRequestStatus prStatus, Loan.LoanStatus currentLoanStatus) {
        if (prStatus == null) return null;

        switch (prStatus) {
            case APPROVED:
                // Finance approves the payment request → loan becomes FINANCE_APPROVED
                if (currentLoanStatus == Loan.LoanStatus.HR_APPROVED ||
                        currentLoanStatus == Loan.LoanStatus.PENDING_FINANCE) {
                    return Loan.LoanStatus.FINANCE_APPROVED;
                }
                return null;
            case REJECTED:
                // Finance rejects → loan becomes FINANCE_REJECTED
                if (currentLoanStatus == Loan.LoanStatus.HR_APPROVED ||
                        currentLoanStatus == Loan.LoanStatus.PENDING_FINANCE ||
                        currentLoanStatus == Loan.LoanStatus.FINANCE_APPROVED) {
                    return Loan.LoanStatus.FINANCE_REJECTED;
                }
                return null;
            case PAID:
                // Payment processed → loan becomes ACTIVE (repayments start)
                if (currentLoanStatus == Loan.LoanStatus.FINANCE_APPROVED ||
                        currentLoanStatus == Loan.LoanStatus.DISBURSED) {
                    return Loan.LoanStatus.ACTIVE;
                }
                return null;
            default:
                return null;
        }
    }

    /**
     * Map PaymentRequestStatus to PayrollStatus for batch synchronization
     */
    private PayrollStatus mapPaymentRequestStatusToPayrollStatus(PaymentRequestStatus prStatus) {
        if (prStatus == null) return null;

        switch (prStatus) {
            case PENDING:
                return PayrollStatus.PENDING_FINANCE_REVIEW;
            case APPROVED:
                return PayrollStatus.FINANCE_APPROVED;
            case REJECTED:
                return PayrollStatus.FINANCE_REJECTED;
            case PARTIALLY_PAID:
                return PayrollStatus.PARTIALLY_PAID;
            case PAID:
                return PayrollStatus.PAID;
            default:
                return null;
        }
    }

    // ================== Helper Methods ==================

    private String generatePaymentRequestNumber() {
        String date = LocalDate.now().toString().replace("-", "");
        int randomNum = new java.util.Random().nextInt(10000);
        return String.format("PR-%s-%04d", date, randomNum);
    }

    /**
     * Build target details JSON for merchant
     */
    private String buildMerchantTargetDetails(Merchant merchant) {
        if (merchant == null) return null;

        StringBuilder details = new StringBuilder();
        details.append("{");
        details.append("\"type\":\"MERCHANT\"");

        if (merchant.getContactPersonName() != null) {
            details.append(",\"contactPerson\":\"").append(merchant.getContactPersonName()).append("\"");
        }
        if (merchant.getContactPhone() != null) {
            details.append(",\"phone\":\"").append(merchant.getContactPhone()).append("\"");
        }
        if (merchant.getContactEmail() != null) {
            details.append(",\"email\":\"").append(merchant.getContactEmail()).append("\"");
        }

        details.append("}");
        return details.toString();
    }

    /**
     * Build target details JSON for employee (used in payroll payment requests)
     */
    private String buildEmployeeTargetDetails(String bankName, String bankAccountNumber, String walletNumber) {
        StringBuilder details = new StringBuilder();
        details.append("{");
        details.append("\"type\":\"EMPLOYEE\"");

        if (bankName != null && !bankName.isEmpty()) {
            details.append(",\"bankName\":\"").append(bankName).append("\"");
        }
        if (bankAccountNumber != null && !bankAccountNumber.isEmpty()) {
            details.append(",\"bankAccountNumber\":\"").append(bankAccountNumber).append("\"");
        }
        if (walletNumber != null && !walletNumber.isEmpty()) {
            details.append(",\"walletNumber\":\"").append(walletNumber).append("\"");
        }

        details.append("}");
        return details.toString();
    }

    private void createStatusHistory(
            PaymentRequest paymentRequest,
            PaymentRequestStatus fromStatus,
            PaymentRequestStatus toStatus,
            UUID changedByUserId,
            String notes) {

        PaymentRequestStatusHistory history = PaymentRequestStatusHistory.builder()
                .paymentRequest(paymentRequest)
                .fromStatus(fromStatus != null ? fromStatus.name() : null)
                .toStatus(toStatus.name())
                .changedByUserId(changedByUserId)
                .changedAt(LocalDateTime.now())
                .notes(notes)
                .build();

        statusHistoryRepository.save(history);
    }

    // ================== DTO Conversion Methods ==================

    private PaymentRequestResponseDTO convertToDTO(PaymentRequest request) {
        // Handle nullable purchaseOrder (maintenance-sourced requests don't have PO)
        UUID purchaseOrderId = null;
        String purchaseOrderNumber = null;
        String requestOrderTitle = null;
        if (request.getPurchaseOrder() != null) {
            purchaseOrderId = request.getPurchaseOrder().getId();
            purchaseOrderNumber = request.getPurchaseOrder().getPoNumber();
            if (request.getPurchaseOrder().getRequestOrder() != null) {
                requestOrderTitle = request.getPurchaseOrder().getRequestOrder().getTitle();
            }
        }

        // Handle maintenance-sourced fields
        UUID maintenanceStepId = null;
        UUID maintenanceRecordId = null;
        String maintenanceStepDescription = null;
        if (request.getMaintenanceStep() != null) {
            maintenanceStepId = request.getMaintenanceStep().getId();
            maintenanceStepDescription = request.getMaintenanceStep().getDescription();
        }
        if (request.getMaintenanceRecord() != null) {
            maintenanceRecordId = request.getMaintenanceRecord().getId();
        }

        // Handle payroll batch fields
        UUID payrollBatchId = null;
        String batchNumber = null;
        String paymentTypeName = null;
        String paymentTypeCode = null;
        Integer batchEmployeeCount = null;
        String payrollNumber = null;
        UUID payrollId = null;
        String payrollPeriod = null;
        List<BatchEmployeeDTO> batchEmployees = null;

        PayrollBatch batch = request.getPayrollBatch();
        if (batch != null) {
            payrollBatchId = batch.getId();
            batchNumber = batch.getBatchNumber();
            batchEmployeeCount = batch.getEmployeeCount();

            if (batch.getPaymentType() != null) {
                paymentTypeName = batch.getPaymentType().getName();
                paymentTypeCode = batch.getPaymentType().getCode();
            }

            Payroll payroll = batch.getPayroll();
            if (payroll != null) {
                payrollId = payroll.getId();
                payrollNumber = payroll.getPayrollNumber();
                if (payroll.getStartDate() != null) {
                    payrollPeriod = payroll.getStartDate().getMonth().toString() + " " +
                            payroll.getStartDate().getYear();
                }
            }

            if (batch.getEmployeePayrolls() != null && !batch.getEmployeePayrolls().isEmpty()) {
                batchEmployees = batch.getEmployeePayrolls().stream()
                        .map(this::convertEmployeePayrollToDTO)
                        .collect(Collectors.toList());
            }
        }

        // Handle loan installment / financial institution fields
        UUID loanInstallmentId = null;
        Integer loanInstallmentNumber = null;
        UUID companyLoanId = null;
        String companyLoanNumber = null;
        UUID financialInstitutionId = null;
        String institutionName = request.getInstitutionName();
        String institutionAccountNumber = request.getInstitutionAccountNumber();
        String institutionBankName = request.getInstitutionBankName();
        String institutionContactPerson = request.getInstitutionContactPerson();
        String institutionContactPhone = request.getInstitutionContactPhone();
        String institutionContactEmail = request.getInstitutionContactEmail();

        if (request.getLoanInstallment() != null) {
            loanInstallmentId = request.getLoanInstallment().getId();
            loanInstallmentNumber = request.getLoanInstallment().getInstallmentNumber();

            if (request.getLoanInstallment().getCompanyLoan() != null) {
                companyLoanId = request.getLoanInstallment().getCompanyLoan().getId();
                companyLoanNumber = request.getLoanInstallment().getCompanyLoan().getLoanNumber();
            }
        }

        if (request.getFinancialInstitution() != null) {
            financialInstitutionId = request.getFinancialInstitution().getId();
        }

        return PaymentRequestResponseDTO.builder()
                .id(request.getId())
                .requestNumber(request.getRequestNumber())
                // Polymorphic source fields
                .sourceType(request.getSourceType())
                .sourceId(request.getSourceId())
                .sourceNumber(request.getSourceNumber())
                .sourceDescription(request.getSourceDescription())
                // Polymorphic target fields
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .targetName(request.getTargetName())
                .targetDetails(request.getTargetDetails())
                // Payroll batch fields
                .payrollBatchId(payrollBatchId)
                .batchNumber(batchNumber)
                .paymentTypeName(paymentTypeName)
                .paymentTypeCode(paymentTypeCode)
                .batchEmployeeCount(batchEmployeeCount)
                .payrollNumber(payrollNumber)
                .payrollId(payrollId)
                .payrollPeriod(payrollPeriod)
                .batchEmployees(batchEmployees)
                // Legacy fields (kept for backward compatibility)
                .purchaseOrderId(purchaseOrderId)
                .purchaseOrderNumber(purchaseOrderNumber)
                .requestOrderTitle(requestOrderTitle)
                .maintenanceStepId(maintenanceStepId)
                .maintenanceRecordId(maintenanceRecordId)
                .maintenanceStepDescription(maintenanceStepDescription)
                .offerFinancialReviewId(request.getOfferFinancialReview() != null ?
                        request.getOfferFinancialReview().getId() : null)
                .budgetCategory(request.getOfferFinancialReview() != null ?
                        request.getOfferFinancialReview().getBudgetCategory() : null)
                .requestedAmount(request.getRequestedAmount())
                .totalPaidAmount(request.getTotalPaidAmount())
                .remainingAmount(request.getRemainingAmount())
                .currency(request.getCurrency())
                .description(request.getDescription())
                .status(request.getStatus())
                .requestedByUserId(request.getRequestedByUserId())
                .requestedByUserName(request.getRequestedByUserName())
                .requestedByDepartment(request.getRequestedByDepartment())
                .requestedAt(request.getRequestedAt())
                .reviewedByUserId(request.getReviewedByUserId())
                .reviewedByUserName(request.getReviewedByUserName())
                .reviewedAt(request.getReviewedAt())
                .reviewNotes(request.getReviewNotes())
                .approvedByUserId(request.getApprovedByUserId())
                .approvedByUserName(request.getApprovedByUserName())
                .approvedAt(request.getApprovedAt())
                .approvalNotes(request.getApprovalNotes())
                .rejectedByUserId(request.getRejectedByUserId())
                .rejectedByUserName(request.getRejectedByUserName())
                .rejectedAt(request.getRejectedAt())
                .rejectionReason(request.getRejectionReason())
                .paymentDueDate(request.getPaymentDueDate())
                .paymentScheduledDate(request.getPaymentScheduledDate())
                .merchantId(request.getMerchant() != null ? request.getMerchant().getId() : null)
                .merchantName(request.getMerchantName())
                .merchantAccountNumber(request.getMerchantAccountNumber())
                .merchantBankName(request.getMerchantBankName())
                .merchantContactPerson(request.getMerchantContactPerson())
                .merchantContactPhone(request.getMerchantContactPhone())
                .merchantContactEmail(request.getMerchantContactEmail())
                .items(request.getPaymentRequestItems() != null ?
                        request.getPaymentRequestItems().stream()
                                .map(this::convertItemToDTO)
                                .collect(Collectors.toList())
                        : new ArrayList<>())
                .metadata(request.getMetadata())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .deletedAt(request.getDeletedAt())
                // Loan / Financial Institution fields
                .loanInstallmentId(loanInstallmentId)
                .loanInstallmentNumber(loanInstallmentNumber)
                .companyLoanId(companyLoanId)
                .companyLoanNumber(companyLoanNumber)
                .financialInstitutionId(financialInstitutionId)
                .institutionName(institutionName)
                .institutionAccountNumber(institutionAccountNumber)
                .institutionBankName(institutionBankName)
                .institutionContactPerson(institutionContactPerson)
                .institutionContactPhone(institutionContactPhone)
                .institutionContactEmail(institutionContactEmail)
                .build();
    }

    /**
     * Convert EmployeePayroll to BatchEmployeeDTO for display in payment request details.
     */
    private BatchEmployeeDTO convertEmployeePayrollToDTO(EmployeePayroll ep) {
        BigDecimal basicSalary = ep.getMonthlyBaseSalary();
        if (basicSalary == null && ep.getDailyRate() != null) {
            basicSalary = ep.getDailyRate();
        }
        if (basicSalary == null && ep.getHourlyRate() != null) {
            basicSalary = ep.getHourlyRate();
        }

        BigDecimal totalAllowances = BigDecimal.ZERO;
        if (ep.getGrossPay() != null && basicSalary != null) {
            BigDecimal overtime = ep.getOvertimePay() != null ? ep.getOvertimePay() : BigDecimal.ZERO;
            totalAllowances = ep.getGrossPay().subtract(basicSalary).subtract(overtime);
            if (totalAllowances.compareTo(BigDecimal.ZERO) < 0) {
                totalAllowances = BigDecimal.ZERO;
            }
        }

        return BatchEmployeeDTO.builder()
                .employeePayrollId(ep.getId())
                .employeePayrollNumber(ep.getEmployeePayrollNumber())
                .employeeId(ep.getEmployeeId())
                .employeeNumber(null)
                .employeeName(ep.getEmployeeName())
                .jobTitle(ep.getJobPositionName())
                .department(ep.getDepartmentName())
                .paymentTypeName(ep.getPaymentTypeName())
                .bankName(ep.getBankName())
                .bankAccountNumber(ep.getBankAccountNumber())
                .walletNumber(ep.getWalletNumber())
                .basicSalary(basicSalary)
                .totalAllowances(totalAllowances)
                .totalDeductions(ep.getTotalDeductions())
                .totalOvertime(ep.getOvertimePay())
                .netPay(ep.getNetPay())
                .build();
    }

    private PaymentRequestItemResponseDTO convertItemToDTO(PaymentRequestItem item) {
        return PaymentRequestItemResponseDTO.builder()
                .id(item.getId())
                .paymentRequestId(item.getPaymentRequest().getId())
                .itemId(item.getItemId())
                .itemName(item.getItemName())
                .itemDescription(item.getItemDescription())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .paidAmount(item.getPaidAmount())
                .remainingAmount(item.getRemainingAmount())
                .status(item.getStatus())
                .notes(item.getNotes())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}