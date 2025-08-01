package com.example.backend.dto.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.TransactionType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class InternalTransactionResponseDTO {

    private UUID id;
    private UUID bankAccountId;
    private String bankAccountName;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private String description;
    private String referenceNumber;
    private TransactionType transactionType;
    private Boolean isReconciled;
    private LocalDateTime reconciledAt;
    private String reconciledBy;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Helper fields for display
    private String formattedAmount;
    private String transactionDirection; // "INCOMING" or "OUTGOING"
    private Integer daysSinceCreated;
}