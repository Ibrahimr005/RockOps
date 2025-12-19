package com.example.backend.dto.finance.balances;

import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.BalanceTransaction;
import com.example.backend.models.finance.balances.TransactionStatus;
import com.example.backend.models.finance.balances.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BalanceTransactionResponseDTO {

    private UUID id;
    private TransactionType transactionType;
    private BigDecimal amount;
    private LocalDateTime transactionDate;
    private String description;
    private String referenceNumber;

    // Source Account
    private AccountType accountType;
    private UUID accountId;
    private String accountName; // Will be populated by service

    // Destination Account (for transfers)
    private AccountType toAccountType;
    private UUID toAccountId;
    private String toAccountName; // Will be populated by service

    // Approval info
    private TransactionStatus status;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String rejectionReason;

    // Audit info
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BalanceTransactionResponseDTO fromEntity(BalanceTransaction entity) {
        return BalanceTransactionResponseDTO.builder()
                .id(entity.getId())
                .transactionType(entity.getTransactionType())
                .amount(entity.getAmount())
                .transactionDate(entity.getTransactionDate())
                .description(entity.getDescription())
                .referenceNumber(entity.getReferenceNumber())
                .accountType(entity.getAccountType())
                .accountId(entity.getAccountId())
                .toAccountType(entity.getToAccountType())
                .toAccountId(entity.getToAccountId())
                .status(entity.getStatus())
                .approvedBy(entity.getApprovedBy())
                .approvedAt(entity.getApprovedAt())
                .rejectionReason(entity.getRejectionReason())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}