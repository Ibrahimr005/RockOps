
// PayrollReportDTO.java
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
public class PayrollReportDTO {
    private LocalDate reportPeriodStart;
    private LocalDate reportPeriodEnd;
    private Integer totalEmployees;
    private BigDecimal totalGrossPayroll;
    private BigDecimal totalNetPayroll;
    private BigDecimal totalDeductions;
    private BigDecimal totalEmployerContributions;
    private Map<String, BigDecimal> deductionsByType;
    private Map<String, BigDecimal> contributionsByType;
    private List<DepartmentPayrollSummaryDTO> departmentSummaries;
}
