package com.example.backend.dto.warehouse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemTypeDTO {
    private UUID id;
    private String name;
    private String comment;
    private String measuringUnit;
    private String status;
    private Integer minQuantity;  // Changed to Integer to match typical usage
    private String serialNumber;
    private UUID itemCategoryId;  // Just the category ID to avoid circular references
    private String itemCategoryName;  // Include category name for display purposes
}