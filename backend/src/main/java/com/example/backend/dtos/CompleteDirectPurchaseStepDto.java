package com.example.backend.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompleteDirectPurchaseStepDto {

    @NotNull(message = "Actual end date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate actualEndDate;

    @NotNull(message = "Actual cost is required")
    @DecimalMin(value = "0.01", inclusive = true, message = "Actual cost must be greater than 0")
    private BigDecimal actualCost;

    @DecimalMin(value = "0.0", inclusive = true, message = "Advanced payment must be non-negative")
    private BigDecimal advancedPayment;

    // Allow manual override of remaining cost
    private BigDecimal remainingCost;
}
