package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.AccountPayablePaymentResponseDTO;
import com.example.backend.dto.finance.accountsPayable.ProcessPaymentRequestDTO;
import com.example.backend.models.finance.accountsPayable.AccountPayablePayment;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.repositories.finance.accountsPayable.AccountPayablePaymentRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AccountPayablePaymentService {

    private final AccountPayablePaymentRepository paymentRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final BankAccountRepository bankAccountRepository;
    private final CashSafeRepository cashSafeRepository;
    private final CashWithPersonRepository cashWithPersonRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PaymentRequestService paymentRequestService;
    private final FinancialTransactionService financialTransactionService;

    @Autowired
    public AccountPayablePaymentService(
            AccountPayablePaymentRepository paymentRepository,
            PaymentRequestRepository paymentRequestRepository,
            BankAccountRepository bankAccountRepository,
            CashSafeRepository cashSafeRepository,
            CashWithPersonRepository cashWithPersonRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PaymentRequestService paymentRequestService,
            FinancialTransactionService financialTransactionService) {
        this.paymentRepository = paymentRepository;
        this.paymentRequestRepository = paymentRequestRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.cashSafeRepository = cashSafeRepository;
        this.cashWithPersonRepository = cashWithPersonRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.paymentRequestService = paymentRequestService;
        this.financialTransactionService = financialTransactionService;
    }

    /**
     * Process a payment (main payment processing logic)
     * This method handles the complete payment flow in a single transaction
     */
    @Transactional
    public AccountPayablePaymentResponseDTO processPayment(
            ProcessPaymentRequestDTO request,
            UUID processedByUserId,
            String processedByUserName) {

        // 1. Validate payment request exists and is approved
        PaymentRequest paymentRequest = paymentRequestRepository.findById(request.getPaymentRequestId())
                .orElseThrow(() -> new RuntimeException("Payment Request not found"));

        if (paymentRequest.getStatus() != com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus.APPROVED
                && paymentRequest.getStatus() != com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus.PARTIALLY_PAID) {
            throw new RuntimeException("Payment request must be APPROVED or PARTIALLY_PAID to process payment");
        }

        // 2. Validate payment amount
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        if (request.getAmount().compareTo(paymentRequest.getRemainingAmount()) > 0) {
            throw new RuntimeException("Payment amount cannot exceed remaining amount: " + paymentRequest.getRemainingAmount());
        }

        // 3. Validate and get account balance
        BigDecimal accountBalance = getAccountBalance(request.getPaymentAccountId(), request.getPaymentAccountType());

        if (request.getAmount().compareTo(accountBalance) > 0) {
            throw new RuntimeException("Insufficient balance in selected account. Available: " + accountBalance);
        }

        // 4. Get account name for display
        String accountName = getAccountName(request.getPaymentAccountId(), request.getPaymentAccountType());

        // 5. Generate payment number
        String paymentNumber = generatePaymentNumber();

        // 6. Create payment record
        AccountPayablePayment payment = AccountPayablePayment.builder()
                .paymentNumber(paymentNumber)
                .paymentRequest(paymentRequest)
                .amount(request.getAmount())
                .currency(paymentRequest.getCurrency())
                .paymentDate(request.getPaymentDate())
                .paymentMethod(request.getPaymentMethod())
                .paymentAccountId(request.getPaymentAccountId())
                .paymentAccountType(request.getPaymentAccountType())
                .transactionReference(request.getTransactionReference())
                .paidToMerchant(paymentRequest.getMerchant())
                .paidToName(paymentRequest.getMerchantName())
                .processedByUserId(processedByUserId)
                .processedByUserName(processedByUserName)
                .processedAt(LocalDateTime.now())
                .notes(request.getNotes())
                .receiptFilePath(request.getReceiptFilePath())
                .status(PaymentStatus.COMPLETED)
                .build();

        AccountPayablePayment savedPayment = paymentRepository.save(payment);

        // 7. Update account balance (deduct payment amount)
        updateAccountBalance(request.getPaymentAccountId(), request.getPaymentAccountType(), request.getAmount().negate());

        // 8. Update payment request amounts and status
        paymentRequestService.updatePaymentRequestAfterPayment(paymentRequest.getId(), request.getAmount());

        // 9. Create financial transaction (ledger entry)
        financialTransactionService.createPaymentTransaction(savedPayment);

        // 10. Update Purchase Order payment status
        updatePurchaseOrderPaymentStatus(paymentRequest.getPurchaseOrder().getId());

        // 11. TODO: Send notification to procurement team

        return convertToDTO(savedPayment, accountName);
    }

    /**
     * Get payment by ID
     */
    public AccountPayablePaymentResponseDTO getPaymentById(UUID id) {
        AccountPayablePayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + id));

        String accountName = getAccountName(payment.getPaymentAccountId(), payment.getPaymentAccountType());
        return convertToDTO(payment, accountName);
    }

    /**
     * Get payments by payment request
     */
    public List<AccountPayablePaymentResponseDTO> getPaymentsByPaymentRequest(UUID paymentRequestId) {
        List<AccountPayablePayment> payments = paymentRepository.findByPaymentRequestId(paymentRequestId);
        return payments.stream()
                .map(p -> convertToDTO(p, getAccountName(p.getPaymentAccountId(), p.getPaymentAccountType())))
                .collect(Collectors.toList());
    }

    /**
     * Get payments made today
     */
    public List<AccountPayablePaymentResponseDTO> getPaymentsMadeToday() {
        List<AccountPayablePayment> payments = paymentRepository.findPaymentsMadeToday(LocalDate.now());
        return payments.stream()
                .map(p -> convertToDTO(p, getAccountName(p.getPaymentAccountId(), p.getPaymentAccountType())))
                .collect(Collectors.toList());
    }

    /**
     * Get payments by merchant
     */
    public List<AccountPayablePaymentResponseDTO> getPaymentsByMerchant(UUID merchantId) {
        List<AccountPayablePayment> payments = paymentRepository.findByMerchantId(merchantId);
        return payments.stream()
                .map(p -> convertToDTO(p, getAccountName(p.getPaymentAccountId(), p.getPaymentAccountType())))
                .collect(Collectors.toList());
    }

    /**
     * Get payment history (all completed payments)
     */
    public List<AccountPayablePaymentResponseDTO> getPaymentHistory() {
        List<AccountPayablePayment> payments = paymentRepository.findByStatus(PaymentStatus.COMPLETED);
        return payments.stream()
                .map(p -> convertToDTO(p, getAccountName(p.getPaymentAccountId(), p.getPaymentAccountType())))
                .collect(Collectors.toList());
    }

    // ================== Helper Methods ==================

    private BigDecimal getAccountBalance(UUID accountId, com.example.backend.models.finance.accountsPayable.enums.AccountType accountType) {
        switch (accountType) {
            case BANK_ACCOUNT:
                BankAccount bankAccount = bankAccountRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Bank Account not found"));
                return bankAccount.getAvailableBalance() != null ? bankAccount.getAvailableBalance() : bankAccount.getCurrentBalance();

            case CASH_SAFE:
                CashSafe cashSafe = cashSafeRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash Safe not found"));
                return cashSafe.getAvailableBalance() != null ? cashSafe.getAvailableBalance() : cashSafe.getCurrentBalance();

            case CASH_WITH_PERSON:
                CashWithPerson cashWithPerson = cashWithPersonRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Cash With Person not found"));
                return cashWithPerson.getAvailableBalance() != null ? cashWithPerson.getAvailableBalance() : cashWithPerson.getCurrentBalance();

            default:
                throw new RuntimeException("Invalid account type");
        }
    }

    private String getAccountName(UUID accountId, com.example.backend.models.finance.accountsPayable.enums.AccountType accountType) {
        switch (accountType) {
            case BANK_ACCOUNT:
                return bankAccountRepository.findById(accountId)
                        .map(acc -> acc.getBankName() + " - " + acc.getAccountNumber())
                        .orElse("Unknown Account");

            case CASH_SAFE:
                return cashSafeRepository.findById(accountId)
                        .map(safe -> safe.getSafeName() + " (" + safe.getLocation() + ")")
                        .orElse("Unknown Safe");

            case CASH_WITH_PERSON:
                return cashWithPersonRepository.findById(accountId)
                        .map(CashWithPerson::getPersonName)
                        .orElse("Unknown Person");

            default:
                return "Unknown";
        }
    }

    private void updateAccountBalance(UUID accountId, com.example.backend.models.finance.accountsPayable.enums.AccountType accountType, BigDecimal amount) {
        switch (accountType) {
            case BANK_ACCOUNT:
                BankAccount bankAccount = bankAccountRepository.findById(accountId)
                        .orElseThrow(() -> new RuntimeException("Bank Account not found"));

                BigDecimal newBankBalance = bankAccount.getCurrentBalance().add(amount);
                bankAccount.setCurrentBalance(newBankBalance);

                if (bankAccount.getAvailableBalance() != null) {
                    bankAccount.setAvailableBalance(bankAccount.getAvailableBalance().add(amount));
                }
                if (bankAccount.getTotalBalance() != null) {
                    bankAccount.setTotalBalance(bankAccount.getTotalBalance().add(amount));
                }

                bankAccount.setLastTransactionAt(LocalDateTime.now());
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
                if (cashSafe.getTotalBalance() != null) {
                    cashSafe.setTotalBalance(cashSafe.getTotalBalance().add(amount));
                }

                cashSafe.setLastTransactionAt(LocalDateTime.now());
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
                if (cashWithPerson.getTotalBalance() != null) {
                    cashWithPerson.setTotalBalance(cashWithPerson.getTotalBalance().add(amount));
                }

                cashWithPerson.setLastTransactionAt(LocalDateTime.now());
                cashWithPersonRepository.save(cashWithPerson);
                break;

            default:
                throw new RuntimeException("Invalid account type");
        }
    }

//    private void updatePurchaseOrderPaymentStatus(UUID purchaseOrderId) {
//        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
//                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));
//
//        // Get payment request for this PO
//        PaymentRequest paymentRequest = paymentRequestRepository.findByPurchaseOrderId(purchaseOrderId)
//                .orElse(null);
//
//        if (paymentRequest == null) {
//            return;
//        }
//
//        // Update PO payment status based on payment request status
//        com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus newStatus;
//
//        switch (paymentRequest.getStatus()) {
//            case PENDING:
//                newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.REQUESTED;
//                break;
//            case APPROVED:
//                newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.APPROVED;
//                break;
//            case PARTIALLY_PAID:
//                newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.PARTIALLY_PAID;
//                break;
//            case PAID:
//                newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.PAID;
//                break;
//            case REJECTED:
//                newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.PAYMENT_FAILED;
//                break;
//            default:
//                return;
//        }
//
//        po.setPaymentStatus(newStatus);
//        po.setTotalPaidAmount(paymentRequest.getTotalPaidAmount());
//        purchaseOrderRepository.save(po);
//
//        // TODO: Check if PO should be marked as completed (if both received and paid)
//    }

    /**
     * FIXED VERSION - Replace updatePurchaseOrderPaymentStatus method
     *
     * File: AccountPayablePaymentService.java
     * Lines: ~308-340
     */

    private void updatePurchaseOrderPaymentStatus(UUID purchaseOrderId) {
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        // ✅ FIXED: Get ALL payment requests for this PO (not just one)
        List<PaymentRequest> paymentRequests = paymentRequestRepository.findAllByPurchaseOrderId(purchaseOrderId);

        if (paymentRequests == null || paymentRequests.isEmpty()) {
            return;
        }

        // ✅ Calculate overall payment status based on ALL payment requests
        boolean allPaid = true;
        boolean anyPaid = false;
        boolean anyApproved = false;
        BigDecimal totalPaidAmount = BigDecimal.ZERO;

        for (PaymentRequest pr : paymentRequests) {
            switch (pr.getStatus()) {
                case PAID:
                    anyPaid = true;
                    totalPaidAmount = totalPaidAmount.add(pr.getTotalPaidAmount());
                    break;
                case PARTIALLY_PAID:
                    anyPaid = true;
                    allPaid = false;
                    totalPaidAmount = totalPaidAmount.add(pr.getTotalPaidAmount());
                    break;
                case APPROVED:
                    anyApproved = true;
                    allPaid = false;
                    break;
                case PENDING:
                case REJECTED:
                    allPaid = false;
                    break;
            }
        }

        // ✅ Determine PO payment status based on all payment requests
        com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus newStatus;

        if (allPaid && paymentRequests.stream().allMatch(pr -> pr.getStatus() ==
                com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus.PAID)) {
            // All payment requests are fully paid
            newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.PAID;
        } else if (anyPaid) {
            // At least one payment request has been paid (fully or partially)
            newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.PARTIALLY_PAID;
        } else if (anyApproved) {
            // At least one payment request is approved but not paid yet
            newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.APPROVED;
        } else {
            // No payments made yet
            newStatus = com.example.backend.models.finance.accountsPayable.enums.POPaymentStatus.REQUESTED;
        }

        po.setPaymentStatus(newStatus);
        po.setTotalPaidAmount(totalPaidAmount);
        purchaseOrderRepository.save(po);

        // TODO: Check if PO should be marked as completed (if both received and paid)
    }

    private String generatePaymentNumber() {
        // Generate format: PAY-YYYYMMDD-XXXX
        String date = LocalDate.now().toString().replace("-", "");
        long count = paymentRepository.count() + 1;
        return String.format("PAY-%s-%04d", date, count);
    }

    private AccountPayablePaymentResponseDTO convertToDTO(AccountPayablePayment payment, String accountName) {
        return AccountPayablePaymentResponseDTO.builder()
                .id(payment.getId())
                .paymentNumber(payment.getPaymentNumber())
                .paymentRequestId(payment.getPaymentRequest().getId())
                .paymentRequestNumber(payment.getPaymentRequest().getRequestNumber())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .paymentDate(payment.getPaymentDate())
                .paymentMethod(payment.getPaymentMethod())
                .paymentAccountId(payment.getPaymentAccountId())
                .paymentAccountType(payment.getPaymentAccountType())
                .paymentAccountName(accountName)
                .transactionReference(payment.getTransactionReference())
                .paidToMerchantId(payment.getPaidToMerchant() != null ? payment.getPaidToMerchant().getId() : null)
                .paidToName(payment.getPaidToName())
                .processedByUserId(payment.getProcessedByUserId())
                .processedByUserName(payment.getProcessedByUserName())
                .processedAt(payment.getProcessedAt())
                .notes(payment.getNotes())
                .receiptFilePath(payment.getReceiptFilePath())
                .status(payment.getStatus())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}