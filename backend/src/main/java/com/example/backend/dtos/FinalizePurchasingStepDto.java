package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for Step 3: Finalize Purchasing
 * Actual costs for all items, calculated totals and remaining payment
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinalizePurchasingStepDto {

    @NotNull(message = "Items are required")
    @Size(min = 1, message = "At least one item is required")
    private List<DirectPurchaseItemDto> items;

    // For validation: all items must have actual cost per unit set
    private Boolean allItemsHaveActualCosts;

    // Calculated fields (backend will compute these)
    private BigDecimal actualTotalPurchasingCost;
    private BigDecimal downPayment;  // Read-only, from Step 2
    private BigDecimal remainingPayment;
}
