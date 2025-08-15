package com.example.backend.services.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.InternalTransactionRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.InternalTransactionResponseDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.bankReconciliation.BankAccount;
import com.example.backend.models.finance.bankReconciliation.InternalTransaction;
import com.example.backend.models.finance.bankReconciliation.TransactionType;
import com.example.backend.repositories.finance.bankReconciliation.BankAccountRepository;
import com.example.backend.repositories.finance.bankReconciliation.InternalTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InternalTransactionService {

    private final InternalTransactionRepository internalTransactionRepository;
    private final BankAccountRepository bankAccountRepository;

    // Create new internal transaction
    public InternalTransactionResponseDTO createInternalTransaction(InternalTransactionRequestDTO requestDTO) {
        BankAccount bankAccount = bankAccountRepository.findById(requestDTO.getBankAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + requestDTO.getBankAccountId()));

        InternalTransaction transaction = new InternalTransaction();
        transaction.setBankAccount(bankAccount);
        transaction.setAmount(requestDTO.getAmount());
        transaction.setTransactionDate(requestDTO.getTransactionDate());
        transaction.setDescription(requestDTO.getDescription());
        transaction.setReferenceNumber(requestDTO.getReferenceNumber());
        transaction.setTransactionType(requestDTO.getTransactionType());
        transaction.setCreatedBy(requestDTO.getCreatedBy());

        InternalTransaction savedTransaction = internalTransactionRepository.save(transaction);
        return mapToResponseDTO(savedTransaction);
    }

    // Get all internal transactions
    @Transactional(readOnly = true)
    public List<InternalTransactionResponseDTO> getAllInternalTransactions() {
        return internalTransactionRepository.findAll()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get internal transaction by ID
    @Transactional(readOnly = true)
    public InternalTransactionResponseDTO getInternalTransactionById(UUID id) {
        InternalTransaction transaction = internalTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Internal transaction not found with ID: " + id));
        return mapToResponseDTO(transaction);
    }

    // Get transactions by bank account
    @Transactional(readOnly = true)
    public List<InternalTransactionResponseDTO> getTransactionsByBankAccount(UUID bankAccountId) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return internalTransactionRepository.findByBankAccount(bankAccount)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get unreconciled transactions
    @Transactional(readOnly = true)
    public List<InternalTransactionResponseDTO> getUnreconciledTransactions() {
        return internalTransactionRepository.findByIsReconciledFalse()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get unreconciled transactions by bank account
    @Transactional(readOnly = true)
    public List<InternalTransactionResponseDTO> getUnreconciledTransactionsByBankAccount(UUID bankAccountId) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return internalTransactionRepository.findByBankAccountAndIsReconciledFalse(bankAccount)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get transactions by date range
    @Transactional(readOnly = true)
    public List<InternalTransactionResponseDTO> getTransactionsByDateRange(LocalDate startDate, LocalDate endDate) {
        return internalTransactionRepository.findByTransactionDateBetween(startDate, endDate)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get transactions by type
    @Transactional(readOnly = true)
    public List<InternalTransactionResponseDTO> getTransactionsByType(TransactionType transactionType) {
        return internalTransactionRepository.findByTransactionType(transactionType)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Update internal transaction
    public InternalTransactionResponseDTO updateInternalTransaction(UUID id, InternalTransactionRequestDTO requestDTO) {
        InternalTransaction transaction = internalTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Internal transaction not found with ID: " + id));

        // Check if transaction is already reconciled
        if (transaction.getIsReconciled()) {
            throw new IllegalStateException("Cannot update reconciled transaction");
        }

        BankAccount bankAccount = bankAccountRepository.findById(requestDTO.getBankAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + requestDTO.getBankAccountId()));

        transaction.setBankAccount(bankAccount);
        transaction.setAmount(requestDTO.getAmount());
        transaction.setTransactionDate(requestDTO.getTransactionDate());
        transaction.setDescription(requestDTO.getDescription());
        transaction.setReferenceNumber(requestDTO.getReferenceNumber());
        transaction.setTransactionType(requestDTO.getTransactionType());

        InternalTransaction updatedTransaction = internalTransactionRepository.save(transaction);
        return mapToResponseDTO(updatedTransaction);
    }

    // Delete internal transaction
    public void deleteInternalTransaction(UUID id) {
        InternalTransaction transaction = internalTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Internal transaction not found with ID: " + id));

        // Check if transaction is already reconciled
        if (transaction.getIsReconciled()) {
            throw new IllegalStateException("Cannot delete reconciled transaction");
        }

        internalTransactionRepository.delete(transaction);
    }

    // Mark transaction as reconciled
    public InternalTransactionResponseDTO markAsReconciled(UUID id, String reconciledBy) {
        InternalTransaction transaction = internalTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Internal transaction not found with ID: " + id));

        transaction.markAsReconciled(reconciledBy);
        InternalTransaction updatedTransaction = internalTransactionRepository.save(transaction);
        return mapToResponseDTO(updatedTransaction);
    }

    // Search transactions for potential matches
    @Transactional(readOnly = true)
    public List<InternalTransactionResponseDTO> findPotentialMatches(UUID bankAccountId, BigDecimal amount, LocalDate date) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        // Search for exact matches first, then close amounts
        BigDecimal tolerance = new BigDecimal("0.01");
        BigDecimal minAmount = amount.subtract(tolerance);
        BigDecimal maxAmount = amount.add(tolerance);

        return internalTransactionRepository.findUnreconciledByAccountAndAmountRange(bankAccount, minAmount, maxAmount)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Helper method to convert entity to DTO
    public InternalTransactionResponseDTO mapToResponseDTO(InternalTransaction transaction) {
        InternalTransactionResponseDTO responseDTO = new InternalTransactionResponseDTO();
        responseDTO.setId(transaction.getId());
        responseDTO.setBankAccountId(transaction.getBankAccount().getId());
        responseDTO.setBankAccountName(transaction.getBankAccount().getAccountName());
        responseDTO.setAmount(transaction.getAmount());
        responseDTO.setTransactionDate(transaction.getTransactionDate());
        responseDTO.setDescription(transaction.getDescription());
        responseDTO.setReferenceNumber(transaction.getReferenceNumber());
        responseDTO.setTransactionType(transaction.getTransactionType());
        responseDTO.setIsReconciled(transaction.getIsReconciled());
        responseDTO.setReconciledAt(transaction.getReconciledAt());
        responseDTO.setReconciledBy(transaction.getReconciledBy());
        responseDTO.setCreatedBy(transaction.getCreatedBy());
        responseDTO.setCreatedAt(transaction.getCreatedAt());
        responseDTO.setUpdatedAt(transaction.getUpdatedAt());

        // Helper fields
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.US);
        responseDTO.setFormattedAmount(currencyFormatter.format(transaction.getAmount()));
        responseDTO.setTransactionDirection(transaction.isIncoming() ? "INCOMING" : "OUTGOING");
        responseDTO.setDaysSinceCreated(Period.between(transaction.getCreatedAt().toLocalDate(), LocalDate.now()).getDays());

        return responseDTO;
    }
}