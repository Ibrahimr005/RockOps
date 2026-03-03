// ========================================
// FILE: PayrollDTO.java (UPDATED)
// Added attendance workflow fields
// ========================================

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
public class PayrollDTO {
    // Existing fields
    private UUID id;
    private String payrollNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String statusDisplayName;
    private BigDecimal totalGrossAmount;
    private BigDecimal totalDeductions;
    private BigDecimal totalNetAmount;
    private Integer employeeCount;
    private Boolean overrideContinuity;
    private String continuityOverrideReason;
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime lockedAt;
    private String lockedBy;
    private LocalDateTime paidAt;
    private String paidBy;
    private Integer publicHolidayCount;

    // ========================================
    // ⭐ NEW: ATTENDANCE WORKFLOW FIELDS
    // ========================================

    /**
     * Whether attendance has been imported at least once
     */
    private Boolean attendanceImported;

    /**
     * Whether attendance is finalized and locked
     */
    private Boolean attendanceFinalized;

    /**
     * Number of times attendance has been imported
     */
    private Integer attendanceImportCount;

    /**
     * Timestamp of last attendance import
     */
    private LocalDateTime lastAttendanceImportAt;

    /**
     * Who finalized the attendance
     */
    private String attendanceFinalizedBy;

    /**
     * When attendance was finalized
     */
    private LocalDateTime attendanceFinalizedAt;

    /**
     * Whether HR notification has been sent
     */
    private Boolean hrNotificationSent;

    // ========================================
    // LEAVE REVIEW WORKFLOW FIELDS
    // ========================================

    private Boolean leaveProcessed;
    private Boolean leaveFinalized;
    private LocalDateTime lastLeaveProcessedAt;
    private String leaveFinalizedBy;
    private LocalDateTime leaveFinalizedAt;
    private Boolean leaveHrNotificationSent;

    // ========================================
    // OVERTIME REVIEW WORKFLOW FIELDS
    // ========================================

    private Boolean overtimeProcessed;
    private Boolean overtimeFinalized;
    private LocalDateTime lastOvertimeProcessedAt;
    private String overtimeFinalizedBy;
    private LocalDateTime overtimeFinalizedAt;
    private Boolean overtimeHrNotificationSent;

    // ========================================
    // BONUS REVIEW WORKFLOW FIELDS
    // ========================================

    private Boolean bonusProcessed;
    private Boolean bonusFinalized;
    private LocalDateTime lastBonusProcessedAt;
    private String bonusFinalizedBy;
    private LocalDateTime bonusFinalizedAt;
    private BigDecimal totalBonusAmount;

    // ========================================
    // DEDUCTION REVIEW WORKFLOW FIELDS
    // ========================================

    private Boolean deductionProcessed;
    private Boolean deductionFinalized;
    private LocalDateTime lastDeductionProcessedAt;
    private String deductionFinalizedBy;
    private LocalDateTime deductionFinalizedAt;
    private Boolean deductionHrNotificationSent;

    // ========================================
    // FINANCE REVIEW WORKFLOW FIELDS
    // ========================================

    private LocalDateTime sentToFinanceAt;
    private String sentToFinanceBy;
    private String paymentSourceType;
    private UUID paymentSourceId;
    private String paymentSourceName;
    private LocalDateTime financeReviewedAt;
    private String financeReviewedBy;

    // ========================================
    // BATCH INFORMATION
    // ========================================

    /**
     * Payment batches grouped by payment type
     */
    private List<PayrollBatchDTO> batches;

    /**
     * Total number of batches
     */
    private Integer batchCount;

    /**
     * Number of employees without payment type assigned
     */
    private Integer employeesWithoutPaymentType;
}