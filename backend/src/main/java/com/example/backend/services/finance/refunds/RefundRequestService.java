package com.example.backend.services.finance.refunds;

import com.example.backend.dto.finance.refunds.ConfirmRefundRequestDTO;
import com.example.backend.dto.finance.refunds.RefundRequestItemResponseDTO;
import com.example.backend.dto.finance.refunds.RefundRequestResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.models.finance.refunds.RefundRequest;
import com.example.backend.models.finance.refunds.RefundRequestItem;
import com.example.backend.models.finance.refunds.RefundStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrderResolutionType;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import com.example.backend.repositories.finance.refunds.RefundRequestItemRepository;
import com.example.backend.repositories.finance.refunds.RefundRequestRepository;
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
public class RefundRequestService {

    private final RefundRequestRepository refundRequestRepository;
    private final RefundRequestItemRepository refundRequestItemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final MerchantRepository merchantRepository;
    private final BankAccountRepository bankAccountRepository;
    private final CashSafeRepository cashSafeRepository;
    private final CashWithPersonRepository cashWithPersonRepository;

    /**
     * Create refund requests asynchronously when issues are resolved as REFUND
     * Groups refund items by merchant and creates separate request per merchant
     */
    @Async
    @Transactional
    public void createRefundRequestsFromIssues(UUID purchaseOrderId, List<PurchaseOrderIssue> resolvedIssues) {
        log.info("Creating refund requests for PO: {} with {} resolved issues", purchaseOrderId, resolvedIssues.size());

        try {
            // Filter only REFUND type issues
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

            // Create or update refund request for each merchant
            for (Map.Entry<UUID, List<PurchaseOrderIssue>> entry : issuesByMerchant.entrySet()) {
                UUID merchantId = entry.getKey();
                List<PurchaseOrderIssue> merchantIssues = entry.getValue();

                createOrUpdateRefundRequestForMerchant(purchaseOrder, merchantId, merchantIssues);
            }

            log.info("Successfully created refund requests for PO: {}", purchaseOrderId);
        } catch (Exception e) {
            log.error("Error creating refund requests for PO: {}", purchaseOrderId, e);
            throw new RuntimeException("Failed to create refund requests: " + e.getMessage());
        }
    }

    private void createOrUpdateRefundRequestForMerchant(
            PurchaseOrder purchaseOrder,
            UUID merchantId,
            List<PurchaseOrderIssue> issues) {

        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new RuntimeException("Merchant not found"));

        // Check if a pending refund request already exists for this PO + Merchant
        RefundRequest refundRequest = refundRequestRepository
                .findByPurchaseOrderIdAndMerchantIdAndStatus(
                        purchaseOrder.getId(),
                        merchantId,
                        RefundStatus.PENDING
                );

        if (refundRequest == null) {
            // Create new refund request
            refundRequest = new RefundRequest();
            refundRequest.setPurchaseOrder(purchaseOrder);
            refundRequest.setMerchant(merchant);
            refundRequest.setStatus(RefundStatus.PENDING);
            log.info("Creating new refund request for PO: {} and Merchant: {}",
                    purchaseOrder.getId(), merchant.getName());
        } else {
            log.info("Updating existing refund request: {} for PO: {} and Merchant: {}",
                    refundRequest.getId(), purchaseOrder.getId(), merchant.getName());
        }

        // Add refund items
        for (PurchaseOrderIssue issue : issues) {
            // Check if this issue already has a refund item
            boolean itemExists = refundRequest.getRefundItems().stream()
                    .anyMatch(item -> item.getIssue().getId().equals(issue.getId()));

            if (!itemExists) {
                RefundRequestItem refundItem = new RefundRequestItem();
                refundItem.setRefundRequest(refundRequest);
                refundItem.setPurchaseOrderItem(issue.getDeliveryItemReceipt().getPurchaseOrderItem());
                refundItem.setIssue(issue);
                refundItem.setItemName(issue.getDeliveryItemReceipt().getPurchaseOrderItem().getItemType().getName());
                refundItem.setAffectedQuantity(issue.getAffectedQuantity());
                refundItem.setUnitPrice(BigDecimal.valueOf(issue.getDeliveryItemReceipt().getPurchaseOrderItem().getUnitPrice()));

                // Calculate total refund for this item
                BigDecimal itemRefund = refundItem.getUnitPrice()
                        .multiply(BigDecimal.valueOf(refundItem.getAffectedQuantity()));
                refundItem.setTotalRefundAmount(itemRefund);

                refundItem.setIssueType(issue.getIssueType().name());
                refundItem.setIssueDescription(issue.getIssueDescription());

                refundRequest.addRefundItem(refundItem);
            }
        }

        // Calculate total refund amount
        refundRequest.calculateTotalRefundAmount();

        // Save
        refundRequestRepository.save(refundRequest);
        log.info("Saved refund request with {} items, total amount: {}",
                refundRequest.getRefundItems().size(), refundRequest.getTotalRefundAmount());
    }

    /**
     * Get all refund requests
     */
    @Transactional(readOnly = true)
    public List<RefundRequestResponseDTO> getAllRefundRequests() {
        log.info("Fetching all refund requests");
        List<RefundRequest> refundRequests = refundRequestRepository.findAllByOrderByCreatedAtDesc();
        return refundRequests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get refund requests by status
     */
    @Transactional(readOnly = true)
    public List<RefundRequestResponseDTO> getRefundRequestsByStatus(RefundStatus status) {
        log.info("Fetching refund requests with status: {}", status);
        List<RefundRequest> refundRequests = refundRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        return refundRequests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a single refund request by ID
     */
    @Transactional(readOnly = true)
    public RefundRequestResponseDTO getRefundRequestById(UUID id) {
        log.info("Fetching refund request: {}", id);
        RefundRequest refundRequest = refundRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Refund request not found"));
        return convertToDTO(refundRequest);
    }

    /**
     * Confirm refund receipt and update balance
     */
    @Transactional
    public RefundRequestResponseDTO confirmRefund(UUID refundRequestId, ConfirmRefundRequestDTO confirmDTO, String confirmedBy) {
        log.info("Confirming refund request: {} by user: {}", refundRequestId, confirmedBy);

        RefundRequest refundRequest = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new RuntimeException("Refund request not found"));

        if (refundRequest.getStatus() == RefundStatus.CONFIRMED) {
            throw new RuntimeException("Refund request is already confirmed");
        }

        // Validate balance account exists and get account name
        String accountName = validateAndGetAccountName(confirmDTO.getBalanceType(), confirmDTO.getBalanceAccountId());

        // Update the balance
        updateAccountBalance(confirmDTO.getBalanceType(), confirmDTO.getBalanceAccountId(), refundRequest.getTotalRefundAmount());

        // Update refund request
        refundRequest.setStatus(RefundStatus.CONFIRMED);
        refundRequest.setBalanceType(confirmDTO.getBalanceType());
        refundRequest.setBalanceAccountId(confirmDTO.getBalanceAccountId());
        refundRequest.setBalanceAccountName(accountName);
        refundRequest.setDateReceived(confirmDTO.getDateReceived());
        refundRequest.setFinanceNotes(confirmDTO.getFinanceNotes());
        refundRequest.setConfirmedBy(confirmedBy);
        refundRequest.setConfirmedAt(LocalDateTime.now());

        RefundRequest savedRequest = refundRequestRepository.save(refundRequest);
        log.info("Successfully confirmed refund request: {} and updated balance", refundRequestId);

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
     * Update account balance by adding refund amount
     */
    private void updateAccountBalance(AccountType accountType, UUID accountId, BigDecimal refundAmount) {
        log.info("Adding refund amount {} to {} account: {}", refundAmount, accountType, accountId);

        switch (accountType) {
            case BANK_ACCOUNT:
                BankAccount bankAccount = bankAccountRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Bank Account not found"));
                BigDecimal newBankBalance = bankAccount.getCurrentBalance().add(refundAmount);
                bankAccount.setCurrentBalance(newBankBalance);
                if (bankAccount.getAvailableBalance() != null) {
                    bankAccount.setAvailableBalance(bankAccount.getAvailableBalance().add(refundAmount));
                }
                bankAccountRepository.save(bankAccount);
                break;

            case CASH_SAFE:
                CashSafe cashSafe = cashSafeRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash Safe not found"));
                BigDecimal newSafeBalance = cashSafe.getCurrentBalance().add(refundAmount);
                cashSafe.setCurrentBalance(newSafeBalance);
                if (cashSafe.getAvailableBalance() != null) {
                    cashSafe.setAvailableBalance(cashSafe.getAvailableBalance().add(refundAmount));
                }
                cashSafeRepository.save(cashSafe);
                break;

            case CASH_WITH_PERSON:
                CashWithPerson cashWithPerson = cashWithPersonRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash With Person not found"));
                BigDecimal newPersonBalance = cashWithPerson.getCurrentBalance().add(refundAmount);
                cashWithPerson.setCurrentBalance(newPersonBalance);
                if (cashWithPerson.getAvailableBalance() != null) {
                    cashWithPerson.setAvailableBalance(cashWithPerson.getAvailableBalance().add(refundAmount));
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
    private RefundRequestResponseDTO convertToDTO(RefundRequest refundRequest) {
        RefundRequestResponseDTO dto = new RefundRequestResponseDTO();

        dto.setId(refundRequest.getId());

        // PO info
        dto.setPurchaseOrderId(refundRequest.getPurchaseOrder().getId());
        dto.setPurchaseOrderNumber(refundRequest.getPurchaseOrder().getPoNumber());

        // Merchant info
        dto.setMerchantId(refundRequest.getMerchant().getId());
        dto.setMerchantName(refundRequest.getMerchant().getName());
        dto.setMerchantContactPhone(refundRequest.getMerchant().getContactPhone());
        dto.setMerchantContactEmail(refundRequest.getMerchant().getContactEmail());

        // Refund details
        dto.setTotalRefundAmount(refundRequest.getTotalRefundAmount());
        dto.setStatus(refundRequest.getStatus());

        // Balance info
        dto.setBalanceType(refundRequest.getBalanceType());
        dto.setBalanceAccountId(refundRequest.getBalanceAccountId());
        dto.setBalanceAccountName(refundRequest.getBalanceAccountName());
        dto.setDateReceived(refundRequest.getDateReceived());
        dto.setFinanceNotes(refundRequest.getFinanceNotes());

        // Confirmation info
        dto.setConfirmedBy(refundRequest.getConfirmedBy());
        dto.setConfirmedAt(refundRequest.getConfirmedAt());

        // Timestamps
        dto.setCreatedAt(refundRequest.getCreatedAt());
        dto.setUpdatedAt(refundRequest.getUpdatedAt());

        // Items
        List<RefundRequestItemResponseDTO> itemDTOs = refundRequest.getRefundItems().stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
        dto.setRefundItems(itemDTOs);

        return dto;
    }

    private RefundRequestItemResponseDTO convertItemToDTO(RefundRequestItem item) {
        RefundRequestItemResponseDTO dto = new RefundRequestItemResponseDTO();
        dto.setId(item.getId());
        dto.setPurchaseOrderItemId(item.getPurchaseOrderItem().getId());
        dto.setIssueId(item.getIssue().getId());
        dto.setItemName(item.getItemName());
        dto.setAffectedQuantity(item.getAffectedQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalRefundAmount(item.getTotalRefundAmount());
        dto.setIssueType(item.getIssueType());
        dto.setIssueDescription(item.getIssueDescription());
        return dto;
    }
}