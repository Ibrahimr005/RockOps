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
public class WarehouseBalanceDTO {
    private UUID warehouseId;
    private String photoUrl;
    private String warehouseName;
    private UUID siteId;
    private String siteName;
    private Double totalValue;
    private Integer totalItems;
    private Integer pendingApprovalCount;
}