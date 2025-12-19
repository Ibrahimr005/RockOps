package com.example.backend.dto.finance.balances;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashWithPersonRequestDTO {

    @NotBlank(message = "Person name is required")
    private String personName;

    private String phoneNumber;

    private String email;

    private String address;

    private String personalBankAccountNumber;

    private String personalBankName;

    @NotNull(message = "Current balance is required")
    private BigDecimal currentBalance;

    private Boolean isActive = true;

    private String notes;
}