// dto/finance/valuation/ConsumableBreakdownDTO.java
package com.example.backend.dto.finance.valuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsumableBreakdownDTO {
    private String itemName;
    private Integer quantity;
    private String measuringUnit;
    private Double unitPrice;
    private Double totalValue;
}