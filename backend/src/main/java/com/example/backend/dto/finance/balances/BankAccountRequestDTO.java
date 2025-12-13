package com.example.backend.dto.finance.balances;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccountRequestDTO {

    @NotBlank(message = "Bank name is required")
    private String bankName;

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    private String iban;

    private String branchName;

    private String branchCode;

    private String swiftCode;

    @NotBlank(message = "Account holder name is required")
    private String accountHolderName;

    @NotNull(message = "Current balance is required")
    private BigDecimal currentBalance;

    private LocalDate openingDate;

    private Boolean isActive = true;

    private String notes;
}