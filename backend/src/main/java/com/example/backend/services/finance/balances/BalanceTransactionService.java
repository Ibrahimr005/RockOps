package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.BalanceTransactionRequestDTO;
import com.example.backend.dto.finance.balances.BalanceTransactionResponseDTO;
import com.example.backend.dto.finance.balances.TransactionApprovalDTO;
import com.example.backend.models.finance.balances.*;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.finance.balances.BalanceTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BalanceTransactionService {

    private final BalanceTransactionRepository balanceTransactionRepository;
    private final BankAccountService bankAccountService;
    private final CashSafeService cashSafeService;
    private final CashWithPersonService cashWithPersonService;

    public BalanceTransactionResponseDTO createTransaction(
            BalanceTransactionRequestDTO requestDTO,
            String createdBy,
            Role userRole) {

        // Validate request
        validateTransactionRequest(requestDTO);

        // Determine if auto-approve
        boolean autoApprove = isAutoApprove(userRole);

        // Create transaction
        BalanceTransaction transaction = BalanceTransaction.builder()
                .transactionType(requestDTO.getTransactionType())
                .amount(requestDTO.getAmount())
                .transactionDate(requestDTO.getTransactionDate() != null ?
                        requestDTO.getTransactionDate() : LocalDateTime.now())
                .description(requestDTO.getDescription())
                .referenceNumber(requestDTO.getReferenceNumber())
                .accountType(requestDTO.getAccountType())
                .accountId(requestDTO.getAccountId())
                .toAccountType(requestDTO.getToAccountType())
                .toAccountId(requestDTO.getToAccountId())
                .status(autoApprove ? TransactionStatus.APPROVED : TransactionStatus.PENDING)
                .createdBy(createdBy)
                .build();

        if (autoApprove) {
            transaction.setApprovedBy(createdBy);
            transaction.setApprovedAt(LocalDateTime.now());
        }

        BalanceTransaction saved = balanceTransactionRepository.save(transaction);

        // If auto-approved, apply the transaction immediately
        if (autoApprove) {
            applyTransaction(saved);
        }

        return enrichResponseDTO(BalanceTransactionResponseDTO.fromEntity(saved));
    }

    public BalanceTransactionResponseDTO approveTransaction(UUID transactionId, String approvedBy) {
        BalanceTransaction transaction = balanceTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + transactionId));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalStateException("Transaction is not pending approval");
        }

        transaction.setStatus(TransactionStatus.APPROVED);
        transaction.setApprovedBy(approvedBy);
        transaction.setApprovedAt(LocalDateTime.now());

        BalanceTransaction saved = balanceTransactionRepository.save(transaction);

        // Apply the transaction to balances
        applyTransaction(saved);

        return enrichResponseDTO(BalanceTransactionResponseDTO.fromEntity(saved));
    }

    public BalanceTransactionResponseDTO rejectTransaction(
            UUID transactionId,
            String rejectedBy,
            String rejectionReason) {

        BalanceTransaction transaction = balanceTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + transactionId));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalStateException("Transaction is not pending approval");
        }

        transaction.setStatus(TransactionStatus.REJECTED);
        transaction.setApprovedBy(rejectedBy);
        transaction.setApprovedAt(LocalDateTime.now());
        transaction.setRejectionReason(rejectionReason);

        BalanceTransaction saved = balanceTransactionRepository.save(transaction);
        return enrichResponseDTO(BalanceTransactionResponseDTO.fromEntity(saved));
    }

    @Transactional(readOnly = true)
    public BalanceTransactionResponseDTO getById(UUID id) {
        BalanceTransaction transaction = balanceTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + id));
        return enrichResponseDTO(BalanceTransactionResponseDTO.fromEntity(transaction));
    }

    @Transactional(readOnly = true)
    public List<BalanceTransactionResponseDTO> getAll() {
        return balanceTransactionRepository.findAll().stream()
                .map(BalanceTransactionResponseDTO::fromEntity)
                .map(this::enrichResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BalanceTransactionResponseDTO> getPendingTransactions() {
        return balanceTransactionRepository.findByStatusOrderByCreatedAtDesc(TransactionStatus.PENDING)
                .stream()
                .map(BalanceTransactionResponseDTO::fromEntity)
                .map(this::enrichResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BalanceTransactionResponseDTO> getTransactionsByAccount(AccountType accountType, UUID accountId) {
        return balanceTransactionRepository.findAllTransactionsForAccount(accountType, accountId)
                .stream()
                .map(BalanceTransactionResponseDTO::fromEntity)
                .map(this::enrichResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BalanceTransactionResponseDTO> getTransactionsByDateRange(
            LocalDateTime startDate,
            LocalDateTime endDate) {
        return balanceTransactionRepository.findByTransactionDateBetween(startDate, endDate)
                .stream()
                .map(BalanceTransactionResponseDTO::fromEntity)
                .map(this::enrichResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getPendingTransactionCount() {
        return balanceTransactionRepository.countByStatus(TransactionStatus.PENDING);
    }

    // Private helper methods

    private boolean isAutoApprove(Role userRole) {
        return userRole == Role.ADMIN ||
                userRole == Role.FINANCE_MANAGER;
    }

    private void validateTransactionRequest(BalanceTransactionRequestDTO requestDTO) {
        // Validate account exists
        validateAccountExists(requestDTO.getAccountType(), requestDTO.getAccountId());

        // For transfers, validate destination account
        if (requestDTO.getTransactionType() == TransactionType.TRANSFER) {
            if (requestDTO.getToAccountType() == null || requestDTO.getToAccountId() == null) {
                throw new IllegalArgumentException("Destination account is required for transfers");
            }
            validateAccountExists(requestDTO.getToAccountType(), requestDTO.getToAccountId());

            // Cannot transfer to same account
            if (requestDTO.getAccountType() == requestDTO.getToAccountType() &&
                    requestDTO.getAccountId().equals(requestDTO.getToAccountId())) {
                throw new IllegalArgumentException("Cannot transfer to the same account");
            }
        }

        // Validate sufficient balance for withdrawal and transfer
        if (requestDTO.getTransactionType() == TransactionType.WITHDRAWAL ||
                requestDTO.getTransactionType() == TransactionType.TRANSFER) {
            BigDecimal currentBalance = getAccountBalance(requestDTO.getAccountType(), requestDTO.getAccountId());
            if (currentBalance.compareTo(requestDTO.getAmount()) < 0) {
                throw new IllegalArgumentException("Insufficient balance for this transaction");
            }
        }
    }

    private void validateAccountExists(AccountType accountType, UUID accountId) {
        switch (accountType) {
            case BANK_ACCOUNT:
                bankAccountService.getById(accountId);
                break;
            case CASH_SAFE:
                cashSafeService.getById(accountId);
                break;
            case CASH_WITH_PERSON:
                cashWithPersonService.getById(accountId);
                break;
            default:
                throw new IllegalArgumentException("Unknown account type: " + accountType);
        }
    }

    private BigDecimal getAccountBalance(AccountType accountType, UUID accountId) {
        switch (accountType) {
            case BANK_ACCOUNT:
                return bankAccountService.getBalance(accountId);
            case CASH_SAFE:
                return cashSafeService.getBalance(accountId);
            case CASH_WITH_PERSON:
                return cashWithPersonService.getBalance(accountId);
            default:
                throw new IllegalArgumentException("Unknown account type: " + accountType);
        }
    }

    private void applyTransaction(BalanceTransaction transaction) {
        BigDecimal amount = transaction.getAmount();

        switch (transaction.getTransactionType()) {
            case DEPOSIT:
                addToBalance(transaction.getAccountType(), transaction.getAccountId(), amount);
                break;
            case WITHDRAWAL:
                subtractFromBalance(transaction.getAccountType(), transaction.getAccountId(), amount);
                break;
            case TRANSFER:
                subtractFromBalance(transaction.getAccountType(), transaction.getAccountId(), amount);
                addToBalance(transaction.getToAccountType(), transaction.getToAccountId(), amount);
                break;
        }
    }

    private void addToBalance(AccountType accountType, UUID accountId, BigDecimal amount) {
        BigDecimal currentBalance = getAccountBalance(accountType, accountId);
        BigDecimal newBalance = currentBalance.add(amount);
        updateAccountBalance(accountType, accountId, newBalance);
    }

    private void subtractFromBalance(AccountType accountType, UUID accountId, BigDecimal amount) {
        BigDecimal currentBalance = getAccountBalance(accountType, accountId);
        BigDecimal newBalance = currentBalance.subtract(amount);
        updateAccountBalance(accountType, accountId, newBalance);
    }

    private void updateAccountBalance(AccountType accountType, UUID accountId, BigDecimal newBalance) {
        switch (accountType) {
            case BANK_ACCOUNT:
                bankAccountService.updateBalance(accountId, newBalance);
                break;
            case CASH_SAFE:
                cashSafeService.updateBalance(accountId, newBalance);
                break;
            case CASH_WITH_PERSON:
                cashWithPersonService.updateBalance(accountId, newBalance);
                break;
        }
    }

    private String getAccountName(AccountType accountType, UUID accountId) {
        try {
            switch (accountType) {
                case BANK_ACCOUNT:
                    return bankAccountService.getAccountName(accountId);
                case CASH_SAFE:
                    return cashSafeService.getAccountName(accountId);
                case CASH_WITH_PERSON:
                    return cashWithPersonService.getAccountName(accountId);
                default:
                    return "Unknown";
            }
        } catch (Exception e) {
            return "Unknown";
        }
    }

    private BalanceTransactionResponseDTO enrichResponseDTO(BalanceTransactionResponseDTO dto) {
        // Add account names
        dto.setAccountName(getAccountName(dto.getAccountType(), dto.getAccountId()));

        if (dto.getToAccountType() != null && dto.getToAccountId() != null) {
            dto.setToAccountName(getAccountName(dto.getToAccountType(), dto.getToAccountId()));
        }

        return dto;
    }
}