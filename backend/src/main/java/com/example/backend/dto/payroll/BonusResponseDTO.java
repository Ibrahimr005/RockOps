package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BonusResponseDTO {
    private UUID id;
    private String bonusNumber;

    // Employee info
    private UUID employeeId;
    private String employeeName;

    // Bonus type info
    private UUID bonusTypeId;
    private String bonusTypeName;
    private String bonusTypeCode;

    // Financial
    private BigDecimal amount;
    private Integer effectiveMonth;
    private Integer effectiveYear;

    // Status
    private String status;
    private String statusDisplayName;

    // Details
    private String reason;
    private String notes;

    // HR approval
    private String hrApprovedBy;
    private LocalDateTime hrApprovedAt;
    private String hrRejectedBy;
    private LocalDateTime hrRejectedAt;
    private String hrRejectionReason;

    // Finance link
    private UUID paymentRequestId;
    private String paymentRequestNumber;

    // Bulk tracking
    private UUID bulkBonusId;

    // Payroll link
    private UUID payrollId;

    // Audit
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID siteId;
}
