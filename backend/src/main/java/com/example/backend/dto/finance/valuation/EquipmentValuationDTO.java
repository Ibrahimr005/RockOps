package com.example.backend.dto.finance.valuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for equipment financial valuation data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentValuationDTO {

    private UUID equipmentId;
    private String equipmentName;
    private String model;
    private String type;

    // Financial data
    private Double purchasePrice;
    private Double currentValue;
    private Double currentInventoryValue;
    private Double totalExpenses;
    private Double accumulatedDepreciation;

    // Audit
    private String lastCalculatedAt;
    private String lastCalculatedBy;

    // Equipment status
    private String status;
}