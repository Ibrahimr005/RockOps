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
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollDTO {
    // Existing fields
    private UUID id;
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
}