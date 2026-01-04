package com.example.backend.dto.finance.balances;

import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BalanceTransactionRequestDTO {

    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    private LocalDateTime transactionDate;

    private String description;

    private String referenceNumber;

    // Source Account
    @NotNull(message = "Account type is required")
    private AccountType accountType;

    @NotNull(message = "Account ID is required")
    private UUID accountId;

    // Destination Account (required for TRANSFER)
    private AccountType toAccountType;

    private UUID toAccountId;
}