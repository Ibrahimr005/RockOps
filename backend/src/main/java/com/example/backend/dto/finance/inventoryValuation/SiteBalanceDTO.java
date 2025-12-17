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
    private Double totalValue;
    private Integer totalWarehouses;
    private List<WarehouseBalanceDTO> warehouses;
}