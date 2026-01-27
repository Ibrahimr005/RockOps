package com.example.backend.dto.finance.loans;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanInstallmentRequestDTO {

    @NotNull(message = "Installment number is required")
    private Integer installmentNumber;

    @NotNull(message = "Due date is required")
    private LocalDate dueDate;

    @NotNull(message = "Principal amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Principal amount must be greater than 0")
    private BigDecimal principalAmount;

    @NotNull(message = "Interest amount is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Interest amount must be non-negative")
    private BigDecimal interestAmount;

    private String notes;
}