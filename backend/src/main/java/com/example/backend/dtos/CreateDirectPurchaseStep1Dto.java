package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * DTO for creating a new Direct Purchase ticket - Step 1 (Creation)
 * Includes: title, description, site (optional), equipment, responsible user, expected cost, expected end date, and initial items (name + quantity only)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDirectPurchaseStep1Dto {

    @NotBlank(message = "Title is required")
    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    // Optional - for filtering equipment by site
    private UUID siteId;

    @NotNull(message = "Equipment ID is required")
    private UUID equipmentId;

    // Optional - defaults to current authenticated user if not provided
    private UUID responsibleUserId;

    // Optional - expected total cost
    private BigDecimal expectedCost;

    // Optional - expected completion date
    private LocalDate expectedEndDate;

    @NotNull(message = "At least one item is required")
    @Size(min = 1, message = "At least one item is required")
    private List<DirectPurchaseItemDto> items;
}
