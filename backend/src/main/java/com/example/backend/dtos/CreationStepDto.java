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
 * DTO for Step 1: Creation
 * Ticket title, description, equipment, items (name + quantity only), and total expected cost
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreationStepDto {

    @NotBlank(message = "Title is required")
    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    private String description;

    @NotNull(message = "Equipment ID is required")
    private UUID equipmentId;

    @NotNull(message = "Responsible user ID is required")
    private UUID responsibleUserId;

    @NotNull(message = "Items are required")
    @Size(min = 1, message = "At least one item is required")
    private List<DirectPurchaseItemDto> items;

    @NotNull(message = "Total expected cost is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Total expected cost must be greater than zero")
    private BigDecimal totalExpectedCost;
}
