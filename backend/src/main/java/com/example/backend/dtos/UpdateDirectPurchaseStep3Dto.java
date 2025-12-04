package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.util.List;

/**
 * DTO for updating Direct Purchase ticket - Step 3 (Finalize Purchasing)
 * Includes: actual costs per unit for items
 * The service will automatically calculate:
 * - actualTotalPurchasingCost (sum of all actual costs)
 * - remainingPayment (actual total - down payment from Step 2)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDirectPurchaseStep3Dto {

    // Items with actual costs
    // Each item must have id (to identify which item to update) and actualCostPerUnit
    @NotNull(message = "Items are required")
    @Size(min = 1, message = "At least one item must have actual cost")
    private List<DirectPurchaseItemDto> items;
}
