package com.example.backend.dto.finance.equipment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentFinancialSummaryDTO {
    private UUID equipmentId;
    private String equipmentName;
    private Double purchasePrice; // egpPrice
    private Double currentInventoryValue; // IN_WAREHOUSE consumables value
    private Double totalExpenses; // CONSUMED consumables value
    private LocalDateTime lastUpdated;
}