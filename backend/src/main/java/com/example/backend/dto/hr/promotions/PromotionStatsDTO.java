package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionStatsDTO {
    // Counts
    private Long totalPromotionsFrom;
    private Long totalPromotionsTo;
    private Long pendingPromotionsFrom;
    private Long pendingPromotionsTo;
    private Long implementedPromotionsFrom;
    private Long implementedPromotionsTo;

    // Statistics
    private BigDecimal averageSalaryIncrease;
    private Double averageTimeBeforePromotion; // in months
    private Double promotionRate; // percentage

    // Career progression indicators
    private Boolean hasCareerProgression;
    private Boolean isPromotionDestination;

    // Top destinations (position name -> count)
    private Map<String, Long> topPromotionDestinations;

    // Recent activity
    private Long promotionsLastYear;
    private Long promotionsLastQuarter;
}
