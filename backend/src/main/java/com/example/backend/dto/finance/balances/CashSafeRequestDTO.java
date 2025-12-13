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
public class CashSafeRequestDTO {

    @NotBlank(message = "Safe name is required")
    private String safeName;

    @NotBlank(message = "Location is required")
    private String location;

    @NotNull(message = "Current balance is required")
    private BigDecimal currentBalance;

    private Boolean isActive = true;

    private String notes;
}