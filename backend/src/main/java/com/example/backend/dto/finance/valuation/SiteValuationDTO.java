package com.example.backend.dto.finance.valuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * DTO for site-level financial valuation data
 * Aggregates all warehouse, equipment, and fixed asset valuations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteValuationDTO {

    private UUID siteId;
    private String siteName;
    private String photoUrl;

    // Total values
    private Double totalValue;
    private Double totalExpenses;

    // Breakdown by category - VALUES
    private Double warehouseValue;
    private Double equipmentValue;
    private Double fixedAssetsValue;

    // Breakdown by category - EXPENSES
    private Double warehouseExpenses;
    private Double equipmentExpenses;
    private Double fixedAssetsExpenses;

    // Counts
    private Integer warehouseCount;
    private Integer equipmentCount;
    private Integer fixedAssetsCount;

    // Audit
    private String lastCalculatedAt;
    private String lastCalculatedBy;

    // Detailed breakdowns (optional - for expanded view)
    private List<WarehouseValuationDTO> warehouses;
    private List<EquipmentValuationDTO> equipment;
}