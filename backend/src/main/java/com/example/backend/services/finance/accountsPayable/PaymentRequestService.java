package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.ApproveRejectPaymentRequestDTO;
import com.example.backend.dto.finance.accountsPayable.PaymentRequestItemResponseDTO;
import com.example.backend.dto.finance.accountsPayable.PaymentRequestResponseDTO;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.PaymentRequestItem;
import com.example.backend.models.finance.accountsPayable.PaymentRequestStatusHistory;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrderItem;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestStatusHistoryRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PaymentRequestService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final PaymentRequestStatusHistoryRepository statusHistoryRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final OfferFinancialReviewRepository offerFinancialReviewRepository;

    @Autowired
    public PaymentRequestService(
            PaymentRequestRepository paymentRequestRepository,
            PaymentRequestStatusHistoryRepository statusHistoryRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            OfferFinancialReviewRepository offerFinancialReviewRepository) {
        this.paymentRequestRepository = paymentRequestRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.offerFinancialReviewRepository = offerFinancialReviewRepository;
    }

    /**
     * Auto-create payment request when PO is created (called from Procurement)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentRequestResponseDTO createPaymentRequestFromPO(UUID purchaseOrderId, UUID offerId, String createdByUsername) {
        System.err.println("💚 ENTERED createPaymentRequestFromPO - NEW TRANSACTION");
        System.err.println("💚 PO ID: " + purchaseOrderId);
        System.err.println("💚 Offer ID: " + offerId);

        // Fresh load of PO in this new transaction
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with ID: " + purchaseOrderId));
        System.err.println("💚 Found PO: " + po.getPoNumber());

        // Check if payment request already exists for this PO
        System.err.println("💚 Checking for existing payment requests...");
        Optional<PaymentRequest> existingRequest = paymentRequestRepository.findByPurchaseOrderId(purchaseOrderId);
        System.err.println("💚 Existing request present? " + existingRequest.isPresent());

        if (existingRequest.isPresent()) {
            System.err.println("❌ Payment request already exists!");
            throw new RuntimeException("Payment request already exists for this Purchase Order");
        }
        System.err.println("💚 No existing request, continuing...");

        System.err.println("💚 Generating request number...");
        String requestNumber = generatePaymentRequestNumber();
        System.err.println("💚 Request number: " + requestNumber);

        System.err.println("💚 Getting merchant info from PO items...");

        // Eagerly load PO items to avoid lazy loading issues
        List<PurchaseOrderItem> poItems = po.getPurchaseOrderItems();
        if (poItems == null || poItems.isEmpty()) {
            throw new RuntimeException("Purchase Order has no items");
        }

        Merchant merchant = poItems.get(0).getMerchant();
        System.err.println("💚 Merchant: " + (merchant != null ? merchant.getName() : "null"));

        System.err.println("💚 Building payment request object...");

        // Build payment request
        PaymentRequest paymentRequest = PaymentRequest.builder()
                .requestNumber(requestNumber)
                .purchaseOrder(po)
                .offerFinancialReview(null) // We'll skip this for now since it's optional
                .requestedAmount(BigDecimal.valueOf(po.getTotalAmount()))
                .currency(po.getCurrency())
                .description("Payment request for PO: " + po.getPoNumber())
                .status(PaymentRequestStatus.PENDING)
                .requestedByUserId(UUID.fromString("00000000-0000-0000-0000-000000000000")) // System
                .requestedByUserName("System")
                .requestedByDepartment(null)
                .requestedAt(LocalDateTime.now())
                .paymentDueDate(po.getExpectedDeliveryDate() != null ?
                        po.getExpectedDeliveryDate().toLocalDate() : null)
                .totalPaidAmount(BigDecimal.ZERO)
                .remainingAmount(BigDecimal.valueOf(po.getTotalAmount()))
                .merchant(merchant)
                .merchantName(merchant != null ? merchant.getName() : null)
                .merchantContactPerson(merchant != null ? merchant.getContactPersonName() : null)
                .merchantContactPhone(merchant != null ? merchant.getContactPhone() : null)
                .merchantContactEmail(merchant != null ? merchant.getContactEmail() : null)
                .build();

        System.err.println("💚 Creating payment request items...");

        // Create payment request items from PO items
        List<PaymentRequestItem> items = new ArrayList<>();
        for (PurchaseOrderItem poItem : poItems) {
            PaymentRequestItem item = PaymentRequestItem.builder()
                    .paymentRequest(paymentRequest)
                    .itemId(poItem.getId())
                    .itemName(poItem.getItemType() != null ? poItem.getItemType().getName() : "Unknown")
                    .itemDescription(poItem.getComment())
                    .quantity(BigDecimal.valueOf(poItem.getQuantity()))
                    .unit(poItem.getItemType() != null ? poItem.getItemType().getMeasuringUnit() : null)
                    .unitPrice(BigDecimal.valueOf(poItem.getUnitPrice()))
                    .totalPrice(BigDecimal.valueOf(poItem.getTotalPrice()))
                    .paidAmount(BigDecimal.ZERO)
                    .remainingAmount(BigDecimal.valueOf(poItem.getTotalPrice()))
                    .build();
            items.add(item);
        }

        paymentRequest.setPaymentRequestItems(items);
        System.err.println("💚 Created " + items.size() + " payment request items");

        // Save payment request
        System.err.println("💚 Saving payment request...");
        PaymentRequest savedRequest = paymentRequestRepository.save(paymentRequest);
        System.err.println("💚 Payment request saved with ID: " + savedRequest.getId());

        // Create status history
        System.err.println("💚 Creating status history...");
        createStatusHistory(savedRequest, null, PaymentRequestStatus.PENDING, null, "Payment request created automatically");
        System.err.println("💚 Status history created");

        // Update PO with payment request ID
        System.err.println("💚 Updating PO with payment request ID...");
        po.setPaymentRequestId(savedRequest.getId());
        purchaseOrderRepository.save(po);
        System.err.println("💚 PO updated");

        System.err.println("✅ Payment request created successfully! ID: " + savedRequest.getId());

        // Return a MINIMAL DTO
        PaymentRequestResponseDTO dto = PaymentRequestResponseDTO.builder()
                .id(savedRequest.getId())
                .requestNumber(savedRequest.getRequestNumber())
                .purchaseOrderId(po.getId())
                .purchaseOrderNumber(po.getPoNumber())
                .requestedAmount(savedRequest.getRequestedAmount())
                .currency(savedRequest.getCurrency())
                .status(savedRequest.getStatus())
                .requestedAt(savedRequest.getRequestedAt())
                .build();

        System.err.println("💚💚💚 RETURNING DTO, TRANSACTION WILL COMMIT");
        return dto;
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
        }

        paymentRequestRepository.save(paymentRequest);
    }

    // ================== Helper Methods ==================

    private String generatePaymentRequestNumber() {
        // Generate format: PR-YYYYMMDD-RANDOM
        String date = LocalDate.now().toString().replace("-", "");
        int randomNum = new java.util.Random().nextInt(10000);
        return String.format("PR-%s-%04d", date, randomNum);
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
        return PaymentRequestResponseDTO.builder()
                .id(request.getId())
                .requestNumber(request.getRequestNumber())
                .purchaseOrderId(request.getPurchaseOrder().getId())
                .purchaseOrderNumber(request.getPurchaseOrder().getPoNumber())
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
                .items(request.getPaymentRequestItems().stream()
                        .map(this::convertItemToDTO)
                        .collect(Collectors.toList()))
                .metadata(request.getMetadata())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .deletedAt(request.getDeletedAt())
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