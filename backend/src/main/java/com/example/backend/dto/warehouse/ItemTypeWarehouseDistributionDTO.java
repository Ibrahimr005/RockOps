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
public class ItemTypeWarehouseDistributionDTO {
    private UUID warehouseId;
    private String warehouseName;
    private String siteName;
    private Integer quantity;
    private Double unitPrice;
    private Double totalValue;
    private String lastUpdated;
}