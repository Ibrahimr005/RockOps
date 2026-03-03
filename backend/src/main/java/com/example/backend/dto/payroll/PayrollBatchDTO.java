package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollBatchDTO {
    private UUID id;
    private String batchNumber;
    private UUID payrollId;
    private String payrollNumber;

    // Payment type info
    private UUID paymentTypeId;
    private String paymentTypeCode;
    private String paymentTypeName;

    // Financial summary
    private BigDecimal totalAmount;
    private Integer employeeCount;

    // Status
    private String status;
    private String statusDisplayName;

    // Payment request (if sent to finance)
    private UUID paymentRequestId;
    private String paymentRequestNumber;

    // Audit
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime sentToFinanceAt;
    private String sentToFinanceBy;

    // Employee payrolls in this batch (optional, for detail view)
    private List<EmployeePayrollDTO> employeePayrolls;
}
