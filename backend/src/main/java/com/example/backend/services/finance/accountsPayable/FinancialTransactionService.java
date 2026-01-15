package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.FinancialTransactionResponseDTO;
import com.example.backend.models.finance.accountsPayable.FinancialTransaction;
import com.example.backend.models.finance.accountsPayable.AccountPayablePayment;
import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.TransactionStatus;
import com.example.backend.models.finance.accountsPayable.enums.TransactionType;
import com.example.backend.repositories.finance.accountsPayable.FinancialTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FinancialTransactionService {

    private final FinancialTransactionRepository transactionRepository;

    @Autowired
    public FinancialTransactionService(FinancialTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    /**
     * Create financial transaction for a payment
     */
    @Transactional
    public FinancialTransactionResponseDTO createPaymentTransaction(AccountPayablePayment payment) {
        String transactionNumber = generateTransactionNumber();

        FinancialTransaction transaction = FinancialTransaction.builder()
                .transactionNumber(transactionNumber)
                .transactionType(TransactionType.PAYMENT)
                .sourceType("payment")
                .sourceId(payment.getId())
                .debitAccountType(payment.getPaymentAccountType())
                .debitAccountId(payment.getPaymentAccountId())
                .creditAccountType(null) // Merchant account (external)
                .creditAccountId(null)
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .description("Payment " + payment.getPaymentNumber() + " to " + payment.getPaidToName())
                .transactionDate(payment.getPaymentDate())
                .createdByUserId(payment.getProcessedByUserId())
                .createdByUserName(payment.getProcessedByUserName())
                .status(TransactionStatus.COMPLETED)
                .build();

        FinancialTransaction savedTransaction = transactionRepository.save(transaction);
        return convertToDTO(savedTransaction);
    }

    /**
     * Get transactions by account
     */
    public List<FinancialTransactionResponseDTO> getTransactionsByAccount(UUID accountId, AccountType accountType) {
        List<FinancialTransaction> transactions = transactionRepository.findByAccount(accountType, accountId);
        return transactions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get recent transactions (for dashboard)
     */
    public List<FinancialTransactionResponseDTO> getRecentTransactions(int limit) {
        List<FinancialTransaction> transactions = transactionRepository.findRecentCompletedTransactions(limit);
        return transactions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get transactions by date range
     */
    public List<FinancialTransactionResponseDTO> getTransactionsByDateRange(LocalDate startDate, LocalDate endDate) {
        List<FinancialTransaction> transactions = transactionRepository.findByTransactionDateBetween(startDate, endDate);
        return transactions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // ================== Helper Methods ==================

    private String generateTransactionNumber() {
        // Generate format: TXN-YYYYMMDD-XXXX
        String date = LocalDate.now().toString().replace("-", "");
        long count = transactionRepository.count() + 1;
        return String.format("TXN-%s-%04d", date, count);
    }

    private FinancialTransactionResponseDTO convertToDTO(FinancialTransaction transaction) {
        return FinancialTransactionResponseDTO.builder()
                .id(transaction.getId())
                .transactionNumber(transaction.getTransactionNumber())
                .transactionType(transaction.getTransactionType())
                .sourceType(transaction.getSourceType())
                .sourceId(transaction.getSourceId())
                .debitAccountType(transaction.getDebitAccountType())
                .debitAccountId(transaction.getDebitAccountId())
                .debitAccountName(null) // Can be populated later if needed
                .creditAccountType(transaction.getCreditAccountType())
                .creditAccountId(transaction.getCreditAccountId())
                .creditAccountName(null) // Can be populated later if needed
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .description(transaction.getDescription())
                .transactionDate(transaction.getTransactionDate())
                .createdByUserId(transaction.getCreatedByUserId())
                .createdByUserName(transaction.getCreatedByUserName())
                .status(transaction.getStatus())
                .reversedByTransactionId(transaction.getReversedByTransactionId())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}