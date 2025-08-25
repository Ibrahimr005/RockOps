package com.example.backend.dto.payroll;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class UpdateManualDeductionRequest {

    private UUID deductionTypeId;

    @Positive(message = "Custom amount must be positive")
    private BigDecimal customAmount;

    @DecimalMin(value = "0.01", message = "Custom percentage must be greater than 0")
    @DecimalMax(value = "100.00", message = "Custom percentage cannot exceed 100")
    private BigDecimal customPercentage;

    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean isActive;
    private String description;
}
