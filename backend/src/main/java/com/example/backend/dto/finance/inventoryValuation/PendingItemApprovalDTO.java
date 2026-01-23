package com.example.backend.dto.finance.inventoryValuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingItemApprovalDTO {
    private UUID itemId;
    private UUID warehouseId;
    private String warehouseName;
    private String siteName;
    private UUID itemTypeId;
    private String itemTypeName;
    private String itemTypeCategory;
    private String measuringUnit;
    private Integer quantity;
    private Double suggestedPrice; // From ItemType.basePrice
    private String createdBy;
    private String createdAt;
    private String comment;
}