package com.example.backend.dto.finance.accountsPayable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO representing an employee in a payroll batch for display in payment request details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchEmployeeDTO {
    private UUID employeePayrollId;
    private String employeePayrollNumber;

    // Employee info
    private UUID employeeId;
    private String employeeNumber;
    private String employeeName;
    private String jobTitle;
    private String department;

    // Payment details (snapshot from payroll time)
    private String paymentTypeName;
    private String bankName;
    private String bankAccountNumber;
    private String walletNumber;

    // Salary breakdown
    private BigDecimal basicSalary;
    private BigDecimal totalAllowances;
    private BigDecimal totalDeductions;
    private BigDecimal totalOvertime;
    private BigDecimal netPay;
}
