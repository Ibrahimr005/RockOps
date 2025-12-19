package com.example.backend.dto.finance.inventoryValuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionItemSummaryDTO {
    private String itemName;
    private Integer quantity;
    private String measuringUnit;
    private Double unitPrice;
    private Double totalValue;
}