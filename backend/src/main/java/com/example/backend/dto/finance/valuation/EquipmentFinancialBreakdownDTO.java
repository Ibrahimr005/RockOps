package com.example.backend.dto.finance.valuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for equipment financial breakdown
 * Used in the frontend to show equipment value composition
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentFinancialBreakdownDTO {

    private Double purchasePrice;
    private Double currentValue;
    private Double currentInventoryValue; // Consumables IN_WAREHOUSE
    private Double totalExpenses; // Consumables CONSUMED
    private Double accumulatedDepreciation;
    private String lastUpdated;
}