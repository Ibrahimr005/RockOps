package com.example.backend.dto.finance.fixedAssets;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisposalSummaryDTO {

    private String period; // e.g., "2024", "Q1 2024", "January 2024"
    private Integer totalDisposals;
    private BigDecimal totalSaleAmount;
    private BigDecimal totalBookValue;
    private BigDecimal totalGainLoss;
    private Integer profitableDisposals;
    private Integer lossDisposals;
    private BigDecimal averageGainLoss;

    // Breakdown by method
    private Integer salesCount;
    private Integer donationsCount;
    private Integer scrapCount;
    private Integer tradeInsCount;
    private Integer otherCount;
}