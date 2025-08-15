// DepartmentPayrollSummaryDTO.java
package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentPayrollSummaryDTO {
    private String departmentName;
    private Integer employeeCount;
    private BigDecimal totalGrossSalary;
    private BigDecimal totalNetPay;
    private BigDecimal totalDeductions;
    private BigDecimal averageSalary;
}