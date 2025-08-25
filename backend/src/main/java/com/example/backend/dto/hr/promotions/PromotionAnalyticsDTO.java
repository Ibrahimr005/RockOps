package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for promotion analytics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionAnalyticsDTO {
    private java.util.Map<String, Long> promotionsByDepartment;
    private java.util.Map<String, Long> promotionsByPosition;
    private java.util.Map<String, BigDecimal> averageSalaryIncreaseByDepartment;
    private java.util.Map<String, Double> approvalRateByDepartment;
    private java.util.List<MonthlyPromotionTrendDTO> monthlyTrends;
    private java.util.List<TopPerformerDTO> topPerformers;
}
