package com.example.backend.dto.finance.bankReconciliation;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class BankAccountResponseDTO {

    private UUID id;
    private String accountName;
    private String bankName;
    private String accountNumber;
    private BigDecimal currentBalance;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Additional calculated fields for API responses
    private Long unreconciledTransactionCount;
    private Long unmatchedStatementEntryCount;
    private Long openDiscrepancyCount;
}