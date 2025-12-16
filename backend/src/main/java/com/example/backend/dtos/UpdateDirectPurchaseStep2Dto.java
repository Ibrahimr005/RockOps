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
 * DTO for updating Direct Purchase ticket - Step 2 (Purchasing)
 * Includes: merchant, expected costs per unit for items, down payment, and ability to add more items
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDirectPurchaseStep2Dto {

    // Merchant selection
    private UUID merchantId;

    // Items with expected costs (can be updates to existing items or new items)
    private List<DirectPurchaseItemDto> items;

    // Down payment (optional, defaults to 0)
    @DecimalMin(value = "0.0", inclusive = true, message = "Down payment must be non-negative")
    private BigDecimal downPayment;
}
