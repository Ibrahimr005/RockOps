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
public class ApprovedItemHistoryDTO {
    private UUID itemId;
    private UUID warehouseId;
    private String warehouseName;
    private String siteName;
    private String itemTypeName;
    private String itemTypeCategory;
    private String measuringUnit;
    private Integer quantity;
    private Double approvedPrice;
    private Double totalValue;
    private String approvedBy;
    private String approvedAt;
}