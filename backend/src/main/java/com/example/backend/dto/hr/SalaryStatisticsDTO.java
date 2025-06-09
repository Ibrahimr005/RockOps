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
public class SalaryStatisticsDTO {
    private BigDecimal averageSalary;
    private BigDecimal totalSalaries;
    private BigDecimal totalBonuses;
    private BigDecimal totalCommissions;
    private BigDecimal averageBonus;
    private BigDecimal averageCommission;
    private Integer employeeCount;
    private BigDecimal minSalary;
    private BigDecimal maxSalary;

    // Department-wise average salaries
    private Map<String, BigDecimal> departmentAverageSalaries;

    // Monthly salary totals for the past 12 months
    private Map<String, BigDecimal> monthlySalaryTotals;

    // Experience level average salaries
    private Map<String, BigDecimal> experienceLevelSalaries;
}