package com.example.backend.dto.warehouse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemTypeDetailsDTO {
    private UUID itemTypeId;
    private String itemTypeName;
    private String categoryName;
    private String parentCategoryName;
    private String measuringUnit;
    private Double basePrice;
    private Integer minQuantity;
    private String serialNumber;

    // Aggregated stats
    private Integer totalQuantity;
    private Double totalValue;
    private Double averageUnitPrice;
    private Integer warehouseCount;
    private Integer pendingApprovalsCount;

    // Distribution across warehouses
    private List<ItemTypeWarehouseDistributionDTO> warehouseDistribution;

    // Price approval history
    private List<ItemTypePriceHistoryDTO> priceHistory;
}