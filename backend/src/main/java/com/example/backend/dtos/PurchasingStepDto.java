package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * DTO for Step 2: Purchasing
 * Merchant selection, item expected costs, and down payment
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchasingStepDto {

    @NotNull(message = "Merchant ID is required")
    private UUID merchantId;

    @NotNull(message = "Items are required")
    @Size(min = 1, message = "At least one item is required")
    private List<DirectPurchaseItemDto> items;

    @DecimalMin(value = "0.0", inclusive = true, message = "Down payment must be non-negative")
    private BigDecimal downPayment;

    // For validation: all items must have expected cost per unit set
    private Boolean allItemsHaveExpectedCosts;

    // Calculated total
    private BigDecimal totalExpectedCost;
}
