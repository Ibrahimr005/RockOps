package com.example.backend.dto.finance.bankReconciliation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class BankStatementEntryRequestDTO {

    @NotNull(message = "Bank account ID is required")
    private UUID bankAccountId;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    @NotNull(message = "Transaction date is required")
    private LocalDate transactionDate;

    @NotBlank(message = "Bank description is required")
    private String bankDescription;

    private String bankReference;
    private String bankCategory;
    private BigDecimal runningBalance;

    @NotBlank(message = "Imported by is required")
    private String importedBy;
}