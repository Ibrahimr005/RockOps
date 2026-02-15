package com.example.backend.dto.finance.valuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for warehouse financial valuation data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseValuationDTO {

    private UUID warehouseId;
    private String warehouseName;
    private UUID siteId;
    private String siteName;

    // Financial data
    private Double currentValue;
    private Double totalExpenses;
    private Integer totalItems;

    // Audit
    private String lastCalculatedAt;
    private String lastCalculatedBy;

    // Additional info
    private Integer pendingApprovalCount;
}