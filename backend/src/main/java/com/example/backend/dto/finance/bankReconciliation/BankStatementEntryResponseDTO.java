package com.example.backend.dto.finance.bankReconciliation;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class BankStatementEntryResponseDTO {

    private UUID id;
    private UUID bankAccountId;
    private String bankAccountName;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private String bankDescription;
    private String bankReference;
    private String bankCategory;
    private Boolean isMatched;
    private LocalDateTime matchedAt;
    private String matchedBy;
    private BigDecimal runningBalance;
    private LocalDateTime importedAt;
    private String importedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Helper fields
    private String formattedAmount;
    private String transactionDirection; // "CREDIT" or "DEBIT"
    private Integer daysSinceImported;
}