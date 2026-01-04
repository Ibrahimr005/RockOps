package com.example.backend.dto.finance.inventoryValuation;

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
public class SiteBalanceDTO {
    private UUID siteId;
    private String siteName;
    private Double totalValue; // Total site value (warehouses + equipment)
    private Integer totalWarehouses;

    private Integer equipmentCount;
    private Double totalEquipmentValue;

    private Double totalWarehouseValue; // ADD THIS - just warehouses

    private List<WarehouseBalanceDTO> warehouses;
}