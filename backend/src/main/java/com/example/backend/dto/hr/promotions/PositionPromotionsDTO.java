package com.example.backend.dto.hr.promotions;

import com.example.backend.dto.hr.JobPositionSummaryDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionPromotionsDTO {
    // Summary Statistics (COUNTS)
    private Long totalPromotionsFrom;
    private Long totalPromotionsTo;
    private Long pendingPromotionsFromCount;     // ✅ RENAMED: was pendingPromotionsFrom
    private Long pendingPromotionsToCount;       // ✅ RENAMED: was pendingPromotionsTo
    private Long implementedPromotionsFrom;
    private Long implementedPromotionsTo;
    private Long rejectedPromotionsFrom;
    private Long rejectedPromotionsTo;

    // Averages & Rates
    private BigDecimal averageSalaryIncrease;
    private Double averageTimeBeforePromotion;
    private Double promotionRate;
    private Double promotionSuccessRate;

    // Career Progression
    private Boolean hasCareerProgression;
    private Boolean isPromotionDestination;
    private Map<String, Long> topPromotionDestinations;
    private Map<String, Long> commonPromotionSources;

    // Detailed Lists (ACTUAL DATA)
    private List<PromotionSummaryDTO> promotionsFromList;        // ✅ RENAMED: was promotionsFrom
    private List<PromotionSummaryDTO> promotionsToList;          // ✅ RENAMED: was promotionsTo
    private List<PromotionSummaryDTO> pendingPromotionsFromList; // ✅ RENAMED: was pendingPromotionsFrom
    private List<PromotionSummaryDTO> pendingPromotionsToList;   // ✅ RENAMED: was pendingPromotionsTo
    private List<PromotionSummaryDTO> recentPromotions;

    // Career Path Suggestions
    private List<String> careerPathSuggestions;
    private List<JobPositionSummaryDTO> promotionDestinations;
    private List<JobPositionSummaryDTO> promotionSources;

    // Time-based Analytics
    private Long promotionsLastYear;
    private Long promotionsLastQuarter;
    private Long promotionsThisMonth;
}