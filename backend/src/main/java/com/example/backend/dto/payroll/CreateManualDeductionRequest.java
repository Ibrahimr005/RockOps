package com.example.backend.dto.payroll;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateManualDeductionRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "Deduction type ID is required")
    private UUID deductionTypeId;

    @Positive(message = "Custom amount must be positive")
    private BigDecimal customAmount;

    @DecimalMin(value = "0.01", message = "Custom percentage must be greater than 0")
    @DecimalMax(value = "100.00", message = "Custom percentage cannot exceed 100")
    private BigDecimal customPercentage;

    @NotNull(message = "Effective from date is required")
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo; // null for ongoing deductions

    private String description; // Optional additional description
}
