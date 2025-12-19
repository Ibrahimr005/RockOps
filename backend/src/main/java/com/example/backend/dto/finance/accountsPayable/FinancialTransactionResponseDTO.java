package com.example.backend.dto.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.TransactionStatus;
import com.example.backend.models.finance.accountsPayable.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialTransactionResponseDTO {
    private UUID id;
    private String transactionNumber;
    private TransactionType transactionType;

    // Source info
    private String sourceType;
    private UUID sourceId;

    // Debit account info
    private AccountType debitAccountType;
    private UUID debitAccountId;
    private String debitAccountName;

    // Credit account info
    private AccountType creditAccountType;
    private UUID creditAccountId;
    private String creditAccountName;

    private BigDecimal amount;
    private String currency;
    private String description;
    private LocalDate transactionDate;

    // Creator info
    private UUID createdByUserId;
    private String createdByUserName;

    private TransactionStatus status;
    private UUID reversedByTransactionId;
    private LocalDateTime createdAt;
}