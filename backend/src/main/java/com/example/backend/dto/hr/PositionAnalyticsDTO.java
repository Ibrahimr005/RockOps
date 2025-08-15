package com.example.backend.dto.hr;

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
public class PositionAnalyticsDTO {
    // Salary Analytics
    private BigDecimal averageEmployeeSalary;
    private BigDecimal minEmployeeSalary;
    private BigDecimal maxEmployeeSalary;
    private BigDecimal totalPayroll;
    private BigDecimal positionBaseSalary;

    // Employee Analytics
    private Integer totalEmployees;
    private Integer activeEmployees;
    private Integer eligibleForPromotionCount;
    private Double promotionEligibilityRate;
    private Double averageMonthsInPosition;
    private Double employeeTurnoverRate;

    // Promotion Analytics
    private Double promotionRate;
    private Double averageTimeBeforePromotion;
    private BigDecimal averageSalaryIncrease;
    private Integer totalPromotionsFrom;
    private Integer totalPromotionsTo;
    private Boolean hasCareerProgression;
    private Boolean isPromotionDestination;

    // Distribution Analytics
    private Map<String, Long> statusDistribution;
    private Map<String, Long> contractTypeDistribution;
    private Map<String, Long> experienceLevelDistribution;
    private Map<String, Long> departmentDistribution;

    // Performance Metrics
    private Double averagePerformanceRating;
    private Integer positionsFilledLastYear;
    private Integer vacanciesCreated;
    private Integer vacanciesFilled;
    private Double vacancyFillRate;

    // Validation & Health
    private Boolean isValidConfiguration;
    private Integer validationIssueCount;
    private java.util.List<String> validationIssues;
    private java.util.List<String> recommendations;
}
