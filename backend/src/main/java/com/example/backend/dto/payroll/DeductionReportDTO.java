package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeductionReportDTO {
    private LocalDate reportDate;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private Integer totalEmployees;
    private Integer employeesWithDeductions;
    private BigDecimal totalDeductionAmount;
    private Map<String, BigDecimal> deductionsByType;
    private Map<String, Integer> deductionCountByType;
    private List<EmployeeDeductionSummary> topDeductions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeDeductionSummary {
        private String employeeName;
        private String employeeId;
        private BigDecimal totalAmount;
        private Integer deductionCount;
    }
}
