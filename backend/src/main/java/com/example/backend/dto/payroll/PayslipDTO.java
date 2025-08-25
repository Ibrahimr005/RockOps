// PayslipDTO.java
package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayslipDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeEmail;
    private String jobPositionName;
    private String departmentName;
    private LocalDate payPeriodStart;
    private LocalDate payPeriodEnd;
    private LocalDate payDate;
    private BigDecimal grossSalary;
    private BigDecimal netPay;
    private BigDecimal totalEarnings;
    private BigDecimal totalDeductions;
    private BigDecimal totalEmployerContributions;
    private Integer daysWorked;
    private Integer daysAbsent;
    private BigDecimal overtimeHours;
    private String status;
    private String pdfPath;
    private LocalDateTime generatedAt;
    private LocalDateTime sentAt;
    private LocalDateTime acknowledgedAt;
    private List<EarningDTO> earnings;
    private List<DeductionDTO> deductions;
    private List<EmployerContributionDTO> employerContributions;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String createdBy;
    private LocalDateTime createdAt;
}