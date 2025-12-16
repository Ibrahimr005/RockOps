package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DirectPurchaseItemDto {

    private UUID id;

    private UUID directPurchaseTicketId;

    @NotBlank(message = "Item name is required")
    @Size(max = 255, message = "Item name must not exceed 255 characters")
    private String itemName;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @DecimalMin(value = "0.0", inclusive = true, message = "Expected cost per unit must be non-negative")
    private BigDecimal expectedCostPerUnit;

    @DecimalMin(value = "0.0", inclusive = true, message = "Actual cost per unit must be non-negative")
    private BigDecimal actualCostPerUnit;

    // Calculated fields
    private BigDecimal totalExpectedCost;
    private BigDecimal totalActualCost;
    private BigDecimal costDifference;
    private Boolean isOverBudget;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;
}
