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
import com.example.backend.models.finance.accountsPayable.PaymentRequestStatusHistory;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestItemStatus;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.maintenance.MaintenanceStep;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrderItem;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestItemRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestStatusHistoryRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.services.payroll.PayrollBatchService;
import com.example.backend.models.payroll.Bonus;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.PayrollStatus;
import com.example.backend.models.warehouse.ItemType;
import java.math.BigDecimal;  // ✅ ADD THIS if not present
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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

    @Autowired
    public PaymentRequestService(
            PaymentRequestRepository paymentRequestRepository,
            PaymentRequestStatusHistoryRepository statusHistoryRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            OfferFinancialReviewRepository offerFinancialReviewRepository,
            PaymentRequestItemRepository paymentRequestItemRepository,
            @Lazy PayrollBatchService payrollBatchService,
            LoanRepository loanRepository,
            BonusRepository bonusRepository) {
        this.paymentRequestRepository = paymentRequestRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.offerFinancialReviewRepository = offerFinancialReviewRepository;
        this.paymentRequestItemRepository = paymentRequestItemRepository;
        this.payrollBatchService = payrollBatchService;
        this.loanRepository = loanRepository;
        this.bonusRepository = bonusRepository;
    }

    public List<PaymentRequestResponseDTO> getAllPaymentRequests() {
        List<PaymentRequest> requests = paymentRequestRepository.findAll();
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

//    /**
//     * Auto-create payment request when PO is created (called from Procurement)
//     */
//    @Transactional
//    public PaymentRequestResponseDTO createPaymentRequestFromPO(
//            UUID purchaseOrderId,
//            UUID offerId,
//            String createdByUsername) {
//
//        System.err.println("💚 ENTERED createPaymentRequestFromPO");
//        System.err.println("💚 PO ID: " + purchaseOrderId);
//        System.err.println("💚 Offer ID: " + offerId);
//
//        // Load PO
//        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
//                .orElseThrow(() -> new RuntimeException("Purchase Order not found with ID: " + purchaseOrderId));
//        System.err.println("💚 Found PO: " + po.getPoNumber());
//
//        // Check if payment request already exists for this PO
//        Optional<PaymentRequest> existingRequest = paymentRequestRepository.findByPurchaseOrderId(purchaseOrderId);
//        if (existingRequest.isPresent()) {
//            System.err.println("❌ Payment request already exists!");
//            throw new RuntimeException("Payment request already exists for this Purchase Order");
//        }
//
//        String requestNumber = generatePaymentRequestNumber();
//        System.err.println("💚 Request number: " + requestNumber);
//
//        // Get merchant info from PO items
//        List<PurchaseOrderItem> poItems = po.getPurchaseOrderItems();
//        if (poItems == null || poItems.isEmpty()) {
//            throw new RuntimeException("Purchase Order has no items");
//        }
//
//        Merchant merchant = poItems.get(0).getMerchant();
//        System.err.println("💚 Merchant: " + (merchant != null ? merchant.getName() : "null"));
//
//        // Load offer financial review
//        OfferFinancialReview offerFinancialReview = null;
//        if (offerId != null) {
//            offerFinancialReview = offerFinancialReviewRepository
//                    .findByOfferId(offerId)
//                    .orElse(null);
//            System.err.println("💚 Found Offer Financial Review: " + (offerFinancialReview != null));
//        }
//
//        // Create Payment Request - Using ACTUAL field names from your model
//        PaymentRequest paymentRequest = PaymentRequest.builder()
//                .requestNumber(requestNumber)
//                .purchaseOrder(po)
//                .offerFinancialReview(offerFinancialReview)
//                .requestedAmount(BigDecimal.valueOf(po.getTotalAmount()))
//                .currency(po.getCurrency())
//                .description("Payment for Purchase Order " + po.getPoNumber())
//                .status(PaymentRequestStatus.PENDING)
//                .requestedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000"))  // System generated
//                .requestedByUserName(createdByUsername)  // ✅ CORRECT field name
//                .requestedByDepartment("Procurement")
//                .requestedAt(LocalDateTime.now())
//                .paymentDueDate(po.getExpectedDeliveryDate() != null ? po.getExpectedDeliveryDate().toLocalDate() : null)
//                .totalPaidAmount(BigDecimal.ZERO)
//                .remainingAmount(BigDecimal.valueOf(po.getTotalAmount()))
//                .merchant(merchant)  // ✅ Your model has merchant relationship
//                .merchantName(merchant != null ? merchant.getName() : "Unknown Merchant")
//                .merchantAccountNumber(null)
//                .merchantBankName(null)
//                .merchantContactPerson(merchant != null ? merchant.getContactPersonName() : null)
//                .merchantContactPhone(merchant != null ? merchant.getContactPhone() : null)
//                .merchantContactEmail(merchant != null ? merchant.getContactEmail() : null)
//                .build();
//
//        PaymentRequest savedPaymentRequest = paymentRequestRepository.save(paymentRequest);
//        System.err.println("💚 Payment Request saved with ID: " + savedPaymentRequest.getId());
//
//        // Create Payment Request Items
//        List<PaymentRequestItem> prItems = new ArrayList<>();
//        for (PurchaseOrderItem poItem : poItems) {
//            // Get item details from ItemType relationship
//            ItemType itemType = poItem.getItemType();
//            String itemName = itemType != null ? itemType.getName() : "Unknown Item";
//            String itemDescription = itemType != null && itemType.getComment() != null ? itemType.getComment() : "";
//            String unit = itemType != null && itemType.getMeasuringUnit() != null ? itemType.getMeasuringUnit() : "Unit";
//
//            PaymentRequestItem prItem = PaymentRequestItem.builder()
//                    .paymentRequest(savedPaymentRequest)
//                    .itemId(poItem.getId())
//                    .itemName(itemName)
//                    .itemDescription(itemDescription)
//                    .quantity(BigDecimal.valueOf(poItem.getQuantity()))
//                    .unit(unit)
//                    .unitPrice(BigDecimal.valueOf(poItem.getUnitPrice()))
//                    .totalPrice(BigDecimal.valueOf(poItem.getTotalPrice()))
//                    .paidAmount(BigDecimal.ZERO)
//                    .remainingAmount(BigDecimal.valueOf(poItem.getTotalPrice()))
//                    .status(PaymentRequestItemStatus.PENDING)
//                    .build();
//            prItems.add(prItem);
//        }
//
//        List<PaymentRequestItem> savedItems = paymentRequestItemRepository.saveAll(prItems);
//        System.err.println("💚 Saved " + savedItems.size() + " payment request items");
//
//        // Create status history entry - toStatus is STRING in your model
//        PaymentRequestStatusHistory historyEntry = PaymentRequestStatusHistory.builder()
//                .paymentRequest(savedPaymentRequest)
//                .fromStatus(null)
//                .toStatus(PaymentRequestStatus.PENDING.name())  // ✅ Convert to STRING with .name()
//                .changedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000"))
//                .changedByUserName(createdByUsername)  // ✅ CORRECT field name
//                .changedAt(LocalDateTime.now())
//                .notes("Payment request created automatically from PO " + po.getPoNumber())
//                .build();
//
//        statusHistoryRepository.save(historyEntry);
//        System.err.println("💚 Status history created");
//
//        // Convert to DTO - Call existing method from your service
//        PaymentRequestResponseDTO responseDTO = convertToDTO(savedPaymentRequest);
//        System.err.println("✅ Payment request creation completed successfully");
//
//        return responseDTO;
//    }
    /**
     * FIXED VERSION - Replace in PaymentRequestService.java
     * This creates multiple payment requests but returns the FIRST one for backward compatibility
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

        // ✅ Group PO items by merchant
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

        // ✅ Create one payment request per merchant
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
                        .sourceType("PURCHASE_ORDER")
                        .sourceId(po.getId())
                        .sourceNumber(po.getPoNumber())
                        .sourceDescription("Purchase Order: " + po.getPoNumber())
                        // Target polymorphism - who receives payment
                        .targetType("MERCHANT")
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
                            itemType.getMeasuringUnit() : "units";

                    PaymentRequestItem prItem = PaymentRequestItem.builder()
                            .paymentRequest(savedPaymentRequest)
                            .itemId(poItem.getId())  // ✅ FIXED: Use itemId, not purchaseOrderItemId
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
                    paymentRequestItemRepository.saveAll(prItems);
                    System.err.println("💚 ✓ Created " + prItems.size() + " payment request items");
                }

                // ✅ Store first payment request DTO for return (backward compatibility)
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

        // ✅ FIXED: Return first payment request for backward compatibility
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
     * This is called when a maintenance record is completed to generate payment requests
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
                .sourceType("MAINTENANCE")
                .sourceId(step.getId())
                .sourceNumber(record.getRecordNumber())
                .sourceDescription(description)
                // Target polymorphism - who receives payment
                .targetType("MERCHANT")
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

        // Sync with payroll batch if this payment request is for a payroll batch
        syncPayrollBatchStatus(savedRequest, newStatus, reviewerUserName);

        // Sync with loan if this payment request is for a loan
        syncLoanStatus(savedRequest, newStatus, reviewerUserName);

        // Sync with bonus if this payment request is for a bonus
        syncBonusStatus(savedRequest, newStatus, reviewerUserName);

        // TODO: Send notification to procurement team

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

            // Sync with payroll batch if this payment request is for a payroll batch
            syncPayrollBatchStatus(paymentRequest, newStatus, "System");

            // Sync with loan if this payment request is for a loan
            syncLoanStatus(paymentRequest, newStatus, "System");

            // Sync with bonus if this payment request is for a bonus
            syncBonusStatus(paymentRequest, newStatus, "System");
        }

        paymentRequestRepository.save(paymentRequest);
    }

    // ================== Helper Methods ==================

    /**
     * Sync payroll batch status when payment request status changes.
     * This ensures payroll batch and parent payroll reflect the finance workflow status.
     */
    private void syncPayrollBatchStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus, String username) {
        // Only sync if this payment request is linked to a payroll batch
        PayrollBatch batch = paymentRequest.getPayrollBatch();
        if (batch == null) {
            return;
        }

        // Map PaymentRequestStatus to PayrollStatus
        PayrollStatus batchStatus = mapPaymentRequestStatusToPayrollStatus(newStatus);
        if (batchStatus != null) {
            try {
                payrollBatchService.updateBatchStatus(batch.getId(), batchStatus, username);
                System.out.println("[PayrollSync] Updated batch " + batch.getBatchNumber() +
                    " status to " + batchStatus + " from payment request " + paymentRequest.getRequestNumber());
            } catch (Exception e) {
                System.err.println("[PayrollSync] Failed to update batch status: " + e.getMessage());
                // Don't fail the payment request operation if batch sync fails
            }
        }
    }

    /**
     * Sync loan status when payment request status changes.
     * This ensures loans reflect the finance workflow status.
     */
    private void syncLoanStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus, String username) {
        // Only sync if this payment request is for a loan (sourceType = "LOAN")
        if (!"LOAN".equals(paymentRequest.getSourceType())) {
            return;
        }

        UUID loanId = paymentRequest.getSourceId();
        if (loanId == null) {
            return;
        }

        try {
            Loan loan = loanRepository.findById(loanId).orElse(null);
            if (loan == null) {
                System.err.println("[LoanSync] Loan not found for ID: " + loanId);
                return;
            }

            Loan.LoanStatus newLoanStatus = mapPaymentRequestStatusToLoanStatus(newStatus, loan.getStatus());
            if (newLoanStatus != null && newLoanStatus != loan.getStatus()) {
                Loan.LoanStatus oldStatus = loan.getStatus();
                loan.setStatus(newLoanStatus);

                // Update disbursement fields if moving to DISBURSED
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
                System.out.println("[LoanSync] Updated loan " + loan.getLoanNumber() +
                    " status from " + oldStatus + " to " + newLoanStatus +
                    " from payment request " + paymentRequest.getRequestNumber());
            }
        } catch (Exception e) {
            System.err.println("[LoanSync] Failed to update loan status: " + e.getMessage());
            // Don't fail the payment request operation if loan sync fails
        }
    }

    /**
     * Sync bonus status when payment request status changes.
     * This ensures bonuses reflect the finance workflow status.
     */
    private void syncBonusStatus(PaymentRequest paymentRequest, PaymentRequestStatus newStatus, String username) {
        // Only sync if this payment request is for a bonus (sourceType = "BONUS")
        if (!"BONUS".equals(paymentRequest.getSourceType())) {
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
                    // Bonus stays in PENDING_PAYMENT - no change needed
                    System.out.println("[BonusSync] Payment request approved for bonus " +
                            bonus.getBonusNumber() + " - status remains PENDING_PAYMENT");
                    break;
                case PAID:
                    // Payment completed - mark bonus as paid
                    if (bonus.getStatus() == Bonus.BonusStatus.PENDING_PAYMENT) {
                        bonus.markPaid();
                        bonusRepository.save(bonus);
                        System.out.println("[BonusSync] Updated bonus " + bonus.getBonusNumber() +
                                " status to PAID from payment request " + paymentRequest.getRequestNumber());
                    }
                    break;
                case REJECTED:
                    // Payment rejected - revert bonus to HR_APPROVED so it can be resubmitted
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
            // Don't fail the payment request operation if bonus sync fails
        }
    }

    /**
     * Map PaymentRequestStatus to LoanStatus for loan synchronization
     */
    private Loan.LoanStatus mapPaymentRequestStatusToLoanStatus(PaymentRequestStatus prStatus, Loan.LoanStatus currentLoanStatus) {
        if (prStatus == null) return null;

        switch (prStatus) {
            case APPROVED:
                // If loan is pending finance, move to finance approved
                if (currentLoanStatus == Loan.LoanStatus.PENDING_FINANCE) {
                    return Loan.LoanStatus.FINANCE_APPROVED;
                }
                return null;
            case REJECTED:
                // If loan was pending finance, mark as finance rejected
                if (currentLoanStatus == Loan.LoanStatus.PENDING_FINANCE ||
                    currentLoanStatus == Loan.LoanStatus.FINANCE_APPROVED) {
                    return Loan.LoanStatus.FINANCE_REJECTED;
                }
                return null;
            case PAID:
                // Payment completed - loan should be active (being repaid)
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

    private String generatePaymentRequestNumber() {
        // Generate format: PR-YYYYMMDD-RANDOM
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

    private PaymentRequestResponseDTO convertToDTO(PaymentRequest request) {
        // Handle nullable purchaseOrder (maintenance-sourced requests don't have PO)
        UUID purchaseOrderId = null;
        String purchaseOrderNumber = null;
        String requestOrderTitle = null;
        if (request.getPurchaseOrder() != null) {
            purchaseOrderId = request.getPurchaseOrder().getId();
            purchaseOrderNumber = request.getPurchaseOrder().getPoNumber();
            // Get title from RequestOrder if available
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
                // Format payroll period
                if (payroll.getStartDate() != null) {
                    payrollPeriod = payroll.getStartDate().getMonth().toString() + " " +
                                   payroll.getStartDate().getYear();
                }
            }

            // Map employees in batch
            if (batch.getEmployeePayrolls() != null && !batch.getEmployeePayrolls().isEmpty()) {
                batchEmployees = batch.getEmployeePayrolls().stream()
                        .map(this::convertEmployeePayrollToDTO)
                        .collect(Collectors.toList());
            }
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
                .build();
    }

    /**
     * Convert EmployeePayroll to BatchEmployeeDTO for display in payment request details.
     * Note: EmployeePayroll stores snapshot data directly, not a reference to Employee.
     */
    private BatchEmployeeDTO convertEmployeePayrollToDTO(EmployeePayroll ep) {
        // Calculate basic salary based on contract typewhe
        BigDecimal basicSalary = ep.getMonthlyBaseSalary();
        if (basicSalary == null && ep.getDailyRate() != null) {
            basicSalary = ep.getDailyRate();
        }
        if (basicSalary == null && ep.getHourlyRate() != null) {
            basicSalary = ep.getHourlyRate();
        }

        // Calculate total allowances (gross - basic salary - overtime)
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
                .employeeNumber(null) // Not stored in snapshot, would need to fetch from Employee
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