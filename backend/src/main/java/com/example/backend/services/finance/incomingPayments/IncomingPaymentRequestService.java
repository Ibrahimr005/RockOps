package com.example.backend.services.finance.incomingPayments;

import com.example.backend.dto.finance.incomingPayments.ConfirmIncomingPaymentRequestDTO;
import com.example.backend.dto.finance.incomingPayments.IncomingPaymentRequestItemResponseDTO;
import com.example.backend.dto.finance.incomingPayments.IncomingPaymentRequestResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequest;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequestItem;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentSource;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderResolutionType;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import com.example.backend.repositories.finance.incomingPayments.IncomingPaymentRequestItemRepository;
import com.example.backend.repositories.finance.incomingPayments.IncomingPaymentRequestRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncomingPaymentRequestService {

    private final IncomingPaymentRequestRepository incomingPaymentRequestRepository;
    private final IncomingPaymentRequestItemRepository incomingPaymentRequestItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final MerchantRepository merchantRepository;
    private final BankAccountRepository bankAccountRepository;
    private final CashSafeRepository cashSafeRepository;
    private final CashWithPersonRepository cashWithPersonRepository;

    /**
     * Create incoming payment requests from REFUND issues (maintains backward compatibility)
     */
    @Async
    @Transactional
    public void createIncomingPaymentRequestsFromRefundIssues(UUID purchaseOrderId, List<PurchaseOrderIssue> resolvedIssues) {
        log.info("Creating refund incoming payment requests for PO: {} with {} resolved issues", purchaseOrderId, resolvedIssues.size());

        try {
            List<PurchaseOrderIssue> refundIssues = resolvedIssues.stream()
                    .filter(issue -> issue.getResolutionType() == PurchaseOrderResolutionType.REFUND)
                    .collect(Collectors.toList());

            if (refundIssues.isEmpty()) {
                log.info("No refund issues found for PO: {}", purchaseOrderId);
                return;
            }

            PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                    .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

            // Group issues by merchant
            Map<UUID, List<PurchaseOrderIssue>> issuesByMerchant = refundIssues.stream()
                    .collect(Collectors.groupingBy(
                            issue -> issue.getDeliveryItemReceipt().getPurchaseOrderItem().getMerchant().getId()
                    ));

            log.info("Found {} merchants with refund issues", issuesByMerchant.size());

            for (Map.Entry<UUID, List<PurchaseOrderIssue>> entry : issuesByMerchant.entrySet()) {
                UUID merchantId = entry.getKey();
                List<PurchaseOrderIssue> merchantIssues = entry.getValue();

                createOrUpdateIncomingPaymentForRefund(purchaseOrder, merchantId, merchantIssues);
            }

            log.info("Successfully created refund incoming payment requests for PO: {}", purchaseOrderId);
        } catch (Exception e) {
            log.error("Error creating refund incoming payment requests for PO: {}", purchaseOrderId, e);
            throw new RuntimeException("Failed to create refund incoming payment requests: " + e.getMessage());
        }
    }

    /**
     * Create or update incoming payment request for refund
     */
    private void createOrUpdateIncomingPaymentForRefund(
            PurchaseOrder purchaseOrder,
            UUID merchantId,
            List<PurchaseOrderIssue> issues) {

        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        // Check if a pending refund request already exists for this PO + Merchant
        IncomingPaymentRequest incomingPaymentRequest = incomingPaymentRequestRepository
                .findByPurchaseOrderIdAndMerchantIdAndStatusAndSource(
                        purchaseOrder.getId(),
                        merchantId,
                        IncomingPaymentStatus.PENDING,
                        IncomingPaymentSource.REFUND
                );

        if (incomingPaymentRequest == null) {
            incomingPaymentRequest = new IncomingPaymentRequest();
            incomingPaymentRequest.setPurchaseOrder(purchaseOrder);
            incomingPaymentRequest.setMerchant(merchant);
            incomingPaymentRequest.setStatus(IncomingPaymentStatus.PENDING);
            incomingPaymentRequest.setSource(IncomingPaymentSource.REFUND);
            log.info("Creating new refund incoming payment request for PO: {} and Merchant: {}",
                    purchaseOrder.getId(), merchant.getName());
        } else {
            log.info("Updating existing refund incoming payment request: {} for PO: {} and Merchant: {}",
                    incomingPaymentRequest.getId(), purchaseOrder.getId(), merchant.getName());
        }

        // Add items
        for (PurchaseOrderIssue issue : issues) {
            boolean itemExists = incomingPaymentRequest.getIncomingPaymentItems().stream()
                    .anyMatch(item -> item.getIssue() != null && item.getIssue().getId().equals(issue.getId()));

            if (!itemExists) {
                IncomingPaymentRequestItem item = new IncomingPaymentRequestItem();
                item.setIncomingPaymentRequest(incomingPaymentRequest);
                item.setPurchaseOrderItem(issue.getDeliveryItemReceipt().getPurchaseOrderItem());
                item.setIssue(issue);
                item.setItemName(issue.getDeliveryItemReceipt().getPurchaseOrderItem().getItemType().getName());
                item.setAffectedQuantity(issue.getAffectedQuantity());
                item.setUnitPrice(BigDecimal.valueOf(issue.getDeliveryItemReceipt().getPurchaseOrderItem().getUnitPrice()));

                BigDecimal itemRefund = item.getUnitPrice()
                        .multiply(BigDecimal.valueOf(item.getAffectedQuantity()));
                item.setTotalRefundAmount(itemRefund);

                item.setIssueType(issue.getIssueType().name());
                item.setIssueDescription(issue.getIssueDescription());

                incomingPaymentRequest.addIncomingPaymentItem(item);
            }
        }

        incomingPaymentRequest.calculateTotalAmount();
        incomingPaymentRequestRepository.save(incomingPaymentRequest);

        log.info("Saved refund incoming payment request with {} items, total amount: {}",
                incomingPaymentRequest.getIncomingPaymentItems().size(),
                incomingPaymentRequest.getTotalRefundAmount());
    }

    /**
     * Create incoming payment request from PO Return
     */
    @Transactional
    public void createIncomingPaymentFromPOReturn(
            UUID purchaseOrderId,
            UUID merchantId,
            UUID poReturnId,
            List<IncomingPaymentRequestItem> items,
            BigDecimal totalAmount) {

        log.info("Creating incoming payment request from PO Return: {}", poReturnId);

        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        IncomingPaymentRequest incomingPaymentRequest = new IncomingPaymentRequest();
        incomingPaymentRequest.setPurchaseOrder(purchaseOrder);
        incomingPaymentRequest.setMerchant(merchant);
        incomingPaymentRequest.setStatus(IncomingPaymentStatus.PENDING);
        incomingPaymentRequest.setSource(IncomingPaymentSource.PO_RETURN);
        incomingPaymentRequest.setSourceReferenceId(poReturnId);
        incomingPaymentRequest.setTotalRefundAmount(totalAmount);

        for (IncomingPaymentRequestItem item : items) {
            item.setIncomingPaymentRequest(incomingPaymentRequest);
            incomingPaymentRequest.addIncomingPaymentItem(item);
        }

        incomingPaymentRequestRepository.save(incomingPaymentRequest);

        log.info("Successfully created incoming payment request from PO Return with {} items, total: {}",
                items.size(), totalAmount);
    }

    /**
     * Get all incoming payment requests
     */
    @Transactional(readOnly = true)
    public List<IncomingPaymentRequestResponseDTO> getAllIncomingPaymentRequests() {
        log.info("Fetching all incoming payment requests");
        List<IncomingPaymentRequest> requests = incomingPaymentRequestRepository.findAllByOrderByCreatedAtDesc();
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get incoming payment requests by status
     */
    @Transactional(readOnly = true)
    public List<IncomingPaymentRequestResponseDTO> getIncomingPaymentRequestsByStatus(IncomingPaymentStatus status) {
        log.info("Fetching incoming payment requests with status: {}", status);
        List<IncomingPaymentRequest> requests = incomingPaymentRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get incoming payment requests by source
     */
    @Transactional(readOnly = true)
    public List<IncomingPaymentRequestResponseDTO> getIncomingPaymentRequestsBySource(IncomingPaymentSource source) {
        log.info("Fetching incoming payment requests with source: {}", source);
        List<IncomingPaymentRequest> requests = incomingPaymentRequestRepository.findBySourceOrderByCreatedAtDesc(source);
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a single incoming payment request by ID
     */
    @Transactional(readOnly = true)
    public IncomingPaymentRequestResponseDTO getIncomingPaymentRequestById(UUID id) {
        log.info("Fetching incoming payment request: {}", id);
        IncomingPaymentRequest request = incomingPaymentRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incoming payment request not found"));
        return convertToDTO(request);
    }

    /**
     * Confirm incoming payment receipt and update balance
     */
    @Transactional
    public IncomingPaymentRequestResponseDTO confirmIncomingPayment(
            UUID requestId,
            ConfirmIncomingPaymentRequestDTO confirmDTO,
            String confirmedBy) {

        log.info("Confirming incoming payment request: {} by user: {}", requestId, confirmedBy);

        IncomingPaymentRequest request = incomingPaymentRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Incoming payment request not found"));

        if (request.getStatus() == IncomingPaymentStatus.CONFIRMED) {
            throw new RuntimeException("Incoming payment request is already confirmed");
        }

        // Validate balance account exists and get account name
        String accountName = validateAndGetAccountName(confirmDTO.getBalanceType(), confirmDTO.getBalanceAccountId());

        // Update the balance
        updateAccountBalance(confirmDTO.getBalanceType(), confirmDTO.getBalanceAccountId(), request.getTotalRefundAmount());

        // Update request
        request.setStatus(IncomingPaymentStatus.CONFIRMED);
        request.setBalanceType(confirmDTO.getBalanceType());
        request.setBalanceAccountId(confirmDTO.getBalanceAccountId());
        request.setBalanceAccountName(accountName);
        request.setDateReceived(confirmDTO.getDateReceived());
        request.setFinanceNotes(confirmDTO.getFinanceNotes());
        request.setConfirmedBy(confirmedBy);
        request.setConfirmedAt(LocalDateTime.now());

        IncomingPaymentRequest savedRequest = incomingPaymentRequestRepository.save(request);
        log.info("Successfully confirmed incoming payment request: {} and updated balance", requestId);

        return convertToDTO(savedRequest);
    }

    /**
     * Validate account exists and get its name
     */
    private String validateAndGetAccountName(AccountType accountType, UUID accountId) {
        switch (accountType) {
            case BANK_ACCOUNT:
                BankAccount bankAccount = bankAccountRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Bank Account not found"));
                return bankAccount.getBankName() + " - " + bankAccount.getAccountNumber();

            case CASH_SAFE:
                CashSafe cashSafe = cashSafeRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash Safe not found"));
                return cashSafe.getSafeName() + " (" + cashSafe.getLocation() + ")";

            case CASH_WITH_PERSON:
                CashWithPerson cashWithPerson = cashWithPersonRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash With Person not found"));
                return cashWithPerson.getPersonName();

            default:
                throw new RuntimeException("Invalid account type");
        }
    }

    /**
     * Update account balance by adding incoming payment amount
     */
    private void updateAccountBalance(AccountType accountType, UUID accountId, BigDecimal amount) {
        log.info("Adding incoming payment amount {} to {} account: {}", amount, accountType, accountId);

        switch (accountType) {
            case BANK_ACCOUNT:
                BankAccount bankAccount = bankAccountRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Bank Account not found"));
                BigDecimal newBankBalance = bankAccount.getCurrentBalance().add(amount);
                bankAccount.setCurrentBalance(newBankBalance);
                if (bankAccount.getAvailableBalance() != null) {
                    bankAccount.setAvailableBalance(bankAccount.getAvailableBalance().add(amount));
                }
                bankAccountRepository.save(bankAccount);
                break;

            case CASH_SAFE:
                CashSafe cashSafe = cashSafeRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash Safe not found"));
                BigDecimal newSafeBalance = cashSafe.getCurrentBalance().add(amount);
                cashSafe.setCurrentBalance(newSafeBalance);
                if (cashSafe.getAvailableBalance() != null) {
                    cashSafe.setAvailableBalance(cashSafe.getAvailableBalance().add(amount));
                }
                cashSafeRepository.save(cashSafe);
                break;

            case CASH_WITH_PERSON:
                CashWithPerson cashWithPerson = cashWithPersonRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash With Person not found"));
                BigDecimal newPersonBalance = cashWithPerson.getCurrentBalance().add(amount);
                cashWithPerson.setCurrentBalance(newPersonBalance);
                if (cashWithPerson.getAvailableBalance() != null) {
                    cashWithPerson.setAvailableBalance(cashWithPerson.getAvailableBalance().add(amount));
                }
                cashWithPersonRepository.save(cashWithPerson);
                break;

            default:
                throw new RuntimeException("Invalid account type");
        }

        log.info("Successfully updated account balance");
    }

    /**
     * Convert entity to DTO
     */
    private IncomingPaymentRequestResponseDTO convertToDTO(IncomingPaymentRequest request) {
        IncomingPaymentRequestResponseDTO dto = new IncomingPaymentRequestResponseDTO();

        dto.setId(request.getId());

        // PO info
        dto.setPurchaseOrderId(request.getPurchaseOrder().getId());
        dto.setPurchaseOrderNumber(request.getPurchaseOrder().getPoNumber());

        // Merchant info
        dto.setMerchantId(request.getMerchant().getId());
        dto.setMerchantName(request.getMerchant().getName());
        dto.setMerchantContactPhone(request.getMerchant().getContactPhone());
        dto.setMerchantContactEmail(request.getMerchant().getContactEmail());

        // Payment details
        dto.setSource(request.getSource());
        dto.setSourceReferenceId(request.getSourceReferenceId());
        dto.setTotalAmount(request.getTotalRefundAmount());
        dto.setStatus(request.getStatus());

        // Balance info
        dto.setBalanceType(request.getBalanceType());
        dto.setBalanceAccountId(request.getBalanceAccountId());
        dto.setBalanceAccountName(request.getBalanceAccountName());
        dto.setDateReceived(request.getDateReceived());
        dto.setFinanceNotes(request.getFinanceNotes());

        // Confirmation info
        dto.setConfirmedBy(request.getConfirmedBy());
        dto.setConfirmedAt(request.getConfirmedAt());

        // Timestamps
        dto.setCreatedAt(request.getCreatedAt());
        dto.setUpdatedAt(request.getUpdatedAt());

        // Items
        List<IncomingPaymentRequestItemResponseDTO> itemDTOs = request.getIncomingPaymentItems().stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
        dto.setItems(itemDTOs);

        return dto;
    }

    private IncomingPaymentRequestItemResponseDTO convertItemToDTO(IncomingPaymentRequestItem item) {
        IncomingPaymentRequestItemResponseDTO dto = new IncomingPaymentRequestItemResponseDTO();
        dto.setId(item.getId());
        dto.setPurchaseOrderItemId(item.getPurchaseOrderItem().getId());
        dto.setIssueId(item.getIssue() != null ? item.getIssue().getId() : null);
        dto.setItemName(item.getItemName());
        dto.setAffectedQuantity(item.getAffectedQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalAmount(item.getTotalRefundAmount());
        dto.setIssueType(item.getIssueType());
        dto.setIssueDescription(item.getIssueDescription());
        return dto;
    }
}