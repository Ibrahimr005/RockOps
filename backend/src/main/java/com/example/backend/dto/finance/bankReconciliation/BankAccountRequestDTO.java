package com.example.backend.dto.finance.bankReconciliation;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BankAccountRequestDTO {

    @NotBlank(message = "Account name is required")
    private String accountName;

    @NotBlank(message = "Bank name is required")
    private String bankName;

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotNull(message = "Current balance is required")
    @DecimalMin(value = "0.00", message = "Current balance cannot be negative")
    private BigDecimal currentBalance;

    private Boolean isActive = true;
}