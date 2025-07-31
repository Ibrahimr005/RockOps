package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for monthly promotion trends
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyPromotionTrendDTO {
    private Integer year;
    private Integer month;
    private String monthName;
    private Long totalRequests;
    private Long approvedPromotions;
    private Long implementedPromotions;
    private BigDecimal averageSalaryIncrease;
}
