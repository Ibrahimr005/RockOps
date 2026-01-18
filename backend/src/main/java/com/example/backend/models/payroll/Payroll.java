package com.example.backend.models.payroll;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "payrolls", indexes = {
        @Index(name = "idx_payroll_dates", columnList = "start_date,end_date"),
        @Index(name = "idx_payroll_status", columnList = "status"),
        // ⭐ NEW INDEXES for attendance workflow
        @Index(name = "idx_payroll_attendance_finalized", columnList = "attendance_finalized"),
        @Index(name = "idx_payroll_attendance_imported", columnList = "attendance_imported")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"employeePayrolls", "publicHolidays"})
@ToString(exclude = {"employeePayrolls", "publicHolidays"})
public class Payroll {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PayrollStatus status;

    @Column(name = "total_gross_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalGrossAmount = BigDecimal.ZERO;

    @Column(name = "total_deductions", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "total_net_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalNetAmount = BigDecimal.ZERO;

    @Column(name = "employee_count")
    @Builder.Default
    private Integer employeeCount = 0;

    // ========================================
    // ⭐ NEW: ATTENDANCE WORKFLOW FIELDS
    // ========================================

    /**
     * Tracks whether attendance data has been imported at least once
     */
    @Column(name = "attendance_imported", nullable = false)
    @Builder.Default
    private Boolean attendanceImported = false;

    /**
     * Number of times attendance has been imported/re-imported
     */
    @Column(name = "attendance_import_count")
    @Builder.Default
    private Integer attendanceImportCount = 0;

    /**
     * Timestamp of the last attendance import
     */
    @Column(name = "last_attendance_import_at")
    private LocalDateTime lastAttendanceImportAt;

    /**
     * CRITICAL: Whether attendance is finalized and locked
     * Once true, no further imports or edits are allowed
     */
    @Column(name = "attendance_finalized", nullable = false)
    @Builder.Default
    private Boolean attendanceFinalized = false;

    /**
     * Who finalized the attendance (user ID or username)
     */
    @Column(name = "attendance_finalized_by", length = 100)
    private String attendanceFinalizedBy;

    /**
     * When attendance was finalized
     */
    @Column(name = "attendance_finalized_at")
    private LocalDateTime attendanceFinalizedAt;

    /**
     * Whether HR notification has been sent for this payroll
     */
    @Column(name = "hr_notification_sent", nullable = false)
    @Builder.Default
    private Boolean hrNotificationSent = false;

    /**
     * When HR notification was sent
     */
    @Column(name = "hr_notification_sent_at")
    private LocalDateTime hrNotificationSentAt;

    /**
     * Summary statistics from last import (stored as JSON)
     */
    @Column(name = "attendance_summary", columnDefinition = "TEXT")
    private String attendanceSummary;

    // ========================================
    // EXISTING FIELDS (UNCHANGED)
    // ========================================

    // Continuity validation
    @Column(name = "override_continuity")
    @Builder.Default
    private Boolean overrideContinuity = false;

    @Column(name = "continuity_override_reason", length = 1000)
    private String continuityOverrideReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "locked_by", length = 100)
    private String lockedBy;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "paid_by", length = 100)
    private String paidBy;

    @OneToMany(mappedBy = "payroll", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EmployeePayroll> employeePayrolls = new ArrayList<>();

    @OneToMany(mappedBy = "payroll", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PayrollPublicHoliday> publicHolidays = new ArrayList<>();

    @Version
    private Long version;

    // ========================================
    // EXISTING BUSINESS METHODS (UNCHANGED)
    // ========================================

    public boolean isLocked() {
        return status == PayrollStatus.CONFIRMED_AND_LOCKED ||
               status == PayrollStatus.PENDING_FINANCE_REVIEW ||
               status == PayrollStatus.PAID;
    }

    // ========================================
    // FINANCE REVIEW WORKFLOW FIELDS
    // ========================================

    @Column(name = "sent_to_finance_at")
    private LocalDateTime sentToFinanceAt;

    @Column(name = "sent_to_finance_by", length = 100)
    private String sentToFinanceBy;

    @Column(name = "payment_source_type", length = 50)
    private String paymentSourceType; // BANK_ACCOUNT, CASH_SAFE, CASH_WITH_PERSON

    @Column(name = "payment_source_id")
    private UUID paymentSourceId;

    @Column(name = "payment_source_name", length = 200)
    private String paymentSourceName;

    @Column(name = "finance_reviewed_at")
    private LocalDateTime financeReviewedAt;

    @Column(name = "finance_reviewed_by", length = 100)
    private String financeReviewedBy;

    @Column(name = "finance_notes", columnDefinition = "TEXT")
    private String financeNotes;

    public boolean isPaid() {
        return status == PayrollStatus.PAID;
    }


    // In Payroll.java

    public void addPublicHoliday(PayrollPublicHoliday holiday) {
        if (this.publicHolidays == null) {
            this.publicHolidays = new ArrayList<>(); // Initialize if null
        }
        this.publicHolidays.add(holiday);
        holiday.setPayroll(this);
    }

    // ========================================
    // ⭐ NEW: ATTENDANCE WORKFLOW METHODS
    // ========================================

    /**
     * Check if attendance can be imported/edited
     * Returns true if:
     * - Attendance is not finalized AND
     * - Payroll is in ATTENDANCE_IMPORT status
     */
    public boolean canEditAttendance() {
        return !attendanceFinalized &&
                status == PayrollStatus.ATTENDANCE_IMPORT;
    }

    /**
     * Check if attendance can be finalized
     * Returns true if:
     * - Attendance has been imported at least once AND
     * - Attendance is not already finalized AND
     * - Payroll is in ATTENDANCE_IMPORT status
     */
    public boolean canFinalizeAttendance() {
        return attendanceImported &&
                !attendanceFinalized &&
                status == PayrollStatus.ATTENDANCE_IMPORT;
    }

    /**
     * Mark attendance as imported
     * Increments import count and updates timestamp
     */
    public void markAttendanceImported() {
        this.attendanceImported = true;
        this.attendanceImportCount = (this.attendanceImportCount == null ? 0 : this.attendanceImportCount) + 1;
        this.lastAttendanceImportAt = LocalDateTime.now();
    }

    /**
     * Finalize attendance (LOCK IT)
     * This prevents any further imports or edits to attendance data
     *
     * @param finalizedBy The username or ID of the user finalizing attendance
     * @throws IllegalStateException if attendance cannot be finalized
     */
    public void finalizeAttendance(String finalizedBy) {
        if (!canFinalizeAttendance()) {
            throw new IllegalStateException(
                    "Cannot finalize attendance. " +
                            "Attendance must be imported first and not already finalized. " +
                            "Current state: imported=" + attendanceImported +
                            ", finalized=" + attendanceFinalized +
                            ", status=" + status
            );
        }
        this.attendanceFinalized = true;
        this.attendanceFinalizedBy = finalizedBy;
        this.attendanceFinalizedAt = LocalDateTime.now();
    }

    /**
     * Mark HR notification as sent
     */
    public void markHrNotificationSent() {
        this.hrNotificationSent = true;
        this.hrNotificationSentAt = LocalDateTime.now();
    }

    /**
     * Reset attendance workflow (DANGER - Admin only)
     * Resets all attendance-related flags
     * Note: This does NOT delete EmployeePayroll records - that must be done separately
     */
    public void resetAttendanceWorkflow() {
        if (attendanceFinalized) {
            throw new IllegalStateException("Cannot reset finalized attendance");
        }
        this.attendanceImported = false;
        this.attendanceImportCount = 0;
        this.lastAttendanceImportAt = null;
        this.attendanceSummary = null;
        this.hrNotificationSent = false;
        this.hrNotificationSentAt = null;
    }

    // ========================================
// ADD THESE TO Payroll.java - NULL-SAFE VERSION
// ========================================

// ========================================
// LEAVE REVIEW WORKFLOW FIELDS
// ========================================

    @Column(name = "leave_processed")
    @Builder.Default
    private Boolean leaveProcessed = false;

    @Column(name = "leave_finalized")
    @Builder.Default
    private Boolean leaveFinalized = false;

    @Column(name = "last_leave_processed_at")
    private LocalDateTime lastLeaveProcessedAt;

    @Column(name = "leave_finalized_by")
    private String leaveFinalizedBy;

    @Column(name = "leave_finalized_at")
    private LocalDateTime leaveFinalizedAt;

    @Column(name = "leave_hr_notification_sent")
    @Builder.Default
    private Boolean leaveHrNotificationSent = false;

    @Column(name = "leave_hr_notification_sent_at")
    private LocalDateTime leaveHrNotificationSentAt;

    @Column(name = "leave_summary", columnDefinition = "TEXT")
    private String leaveSummary;

// ========================================
// LEAVE REVIEW WORKFLOW METHODS
// ========================================

    /**
     * Mark leave as processed
     */
    public void markLeaveProcessed() {
        this.leaveProcessed = true;
        this.lastLeaveProcessedAt = LocalDateTime.now();
    }

    /**
     * Finalize leave review (LOCK IT)
     * Prevents further processing
     */
    public void finalizeLeave(String username) {
        if (!canFinalizeLeave()) {
            throw new IllegalStateException("Cannot finalize leave review in current state");
        }

        this.leaveFinalized = true;
        this.leaveFinalizedBy = username;
        this.leaveFinalizedAt = LocalDateTime.now();
    }

    /**
     * Check if leave data can be edited
     * ⭐ NULL-SAFE: Handles null Boolean values
     */
    public boolean canEditLeave() {
        return this.status == PayrollStatus.LEAVE_REVIEW &&
                !Boolean.TRUE.equals(this.leaveFinalized); // ⭐ null-safe check
    }

    /**
     * Check if leave can be finalized
     * ⭐ NULL-SAFE: Handles null Boolean values
     */
    public boolean canFinalizeLeave() {
        return this.status == PayrollStatus.LEAVE_REVIEW &&
                Boolean.TRUE.equals(this.leaveProcessed) && // ⭐ null-safe check
                !Boolean.TRUE.equals(this.leaveFinalized);   // ⭐ null-safe check
    }

    /**
     * Mark HR notification as sent for leave review
     */
    public void markLeaveHrNotificationSent() {
        this.leaveHrNotificationSent = true;
        this.leaveHrNotificationSentAt = LocalDateTime.now();
    }

    /**
     * Reset leave workflow
     * DANGER: Destructive operation
     */
    public void resetLeaveWorkflow() {
        this.leaveProcessed = false;
        this.leaveFinalized = false;
        this.lastLeaveProcessedAt = null;
        this.leaveFinalizedBy = null;
        this.leaveFinalizedAt = null;
        this.leaveHrNotificationSent = false;
        this.leaveHrNotificationSentAt = null;
        this.leaveSummary = null;
    }

    /**
     * Initialize leave workflow fields if they're null
     * Call this in @PostLoad or when loading old payroll records
     */
    @PostLoad
    private void initializeLeaveFields() {
        if (this.leaveProcessed == null) {
            this.leaveProcessed = false;
        }
        if (this.leaveFinalized == null) {
            this.leaveFinalized = false;
        }
        if (this.leaveHrNotificationSent == null) {
            this.leaveHrNotificationSent = false;
        }
    }

    // ========================================
// ADD THESE FIELDS AND METHODS TO Payroll.java
// Add after the Leave Review workflow section
// ========================================

// ========================================
// OVERTIME REVIEW WORKFLOW FIELDS
// ========================================

    @Column(name = "overtime_processed")
    @Builder.Default
    private Boolean overtimeProcessed = false;

    @Column(name = "overtime_finalized")
    @Builder.Default
    private Boolean overtimeFinalized = false;

    @Column(name = "last_overtime_processed_at")
    private LocalDateTime lastOvertimeProcessedAt;

    @Column(name = "overtime_finalized_by")
    private String overtimeFinalizedBy;

    @Column(name = "overtime_finalized_at")
    private LocalDateTime overtimeFinalizedAt;

    @Column(name = "overtime_hr_notification_sent")
    @Builder.Default
    private Boolean overtimeHrNotificationSent = false;

    @Column(name = "overtime_hr_notification_sent_at")
    private LocalDateTime overtimeHrNotificationSentAt;

    @Column(name = "overtime_summary", columnDefinition = "TEXT")
    private String overtimeSummary;

// ========================================
// OVERTIME REVIEW WORKFLOW METHODS
// ========================================

    /**
     * Initialize overtime fields after loading from database
     * Ensures null-safe operations for backward compatibility
     */
    private void initializeOvertimeFields() {
        if (this.overtimeProcessed == null) {
            this.overtimeProcessed = false;
        }
        if (this.overtimeFinalized == null) {
            this.overtimeFinalized = false;
        }
        if (this.overtimeHrNotificationSent == null) {
            this.overtimeHrNotificationSent = false;
        }
    }

    /**
     * Mark overtime as processed
     * Called after successfully processing overtime review
     */
    public void markOvertimeProcessed() {
        this.overtimeProcessed = true;
        this.lastOvertimeProcessedAt = LocalDateTime.now();
    }

    /**
     * Finalize overtime review and lock it
     * Prevents further changes to overtime data
     *
     * @param username The user finalizing the overtime review
     * @throws IllegalStateException if overtime not processed or already finalized
     */
    public void finalizeOvertime(String username) {
        if (!Boolean.TRUE.equals(this.overtimeProcessed)) {
            throw new IllegalStateException("Cannot finalize overtime review: Overtime has not been processed");
        }
        if (Boolean.TRUE.equals(this.overtimeFinalized)) {
            throw new IllegalStateException("Cannot finalize overtime review: Already finalized");
        }

        this.overtimeFinalized = true;
        this.overtimeFinalizedBy = username;
        this.overtimeFinalizedAt = LocalDateTime.now();
    }

    /**
     * Check if overtime data can be edited
     * NULL-SAFE: Returns false if overtimeFinalized is null
     *
     * @return true if overtime can be edited, false if finalized
     */
    public boolean canEditOvertime() {
        return !Boolean.TRUE.equals(this.overtimeFinalized);
    }

    /**
     * Check if overtime review can be finalized
     * NULL-SAFE: Handles null values gracefully
     *
     * @return true if overtime can be finalized
     */
    public boolean canFinalizeOvertime() {
        return Boolean.TRUE.equals(this.overtimeProcessed) && !Boolean.TRUE.equals(this.overtimeFinalized);
    }

    /**
     * Mark that HR notification has been sent for overtime review
     */
    public void markOvertimeHrNotificationSent() {
        this.overtimeHrNotificationSent = true;
        this.overtimeHrNotificationSentAt = LocalDateTime.now();
    }

    /**
     * Reset overtime workflow to initial state
     * ADMIN FUNCTION: Use with caution
     */
    public void resetOvertimeWorkflow() {
        this.overtimeProcessed = false;
        this.overtimeFinalized = false;
        this.lastOvertimeProcessedAt = null;
        this.overtimeFinalizedBy = null;
        this.overtimeFinalizedAt = null;
        this.overtimeHrNotificationSent = false;
        this.overtimeHrNotificationSentAt = null;
        this.overtimeSummary = null;
    }

    /**
     * Get overtime processed status (NULL-SAFE)
     *
     * @return true if overtime is processed, false otherwise
     */
    public Boolean getOvertimeProcessed() {
        return overtimeProcessed != null ? overtimeProcessed : false;
    }

    /**
     * Get overtime finalized status (NULL-SAFE)
     *
     * @return true if overtime is finalized, false otherwise
     */
    public Boolean getOvertimeFinalized() {
        return overtimeFinalized != null ? overtimeFinalized : false;
    }

    /**
     * Get overtime HR notification sent status (NULL-SAFE)
     *
     * @return true if HR notification sent, false otherwise
     */
    public Boolean getOvertimeHrNotificationSent() {
        return overtimeHrNotificationSent != null ? overtimeHrNotificationSent : false;
    }

    /**
     * Recalculate all payroll totals based on employee payrolls
     * Call this after adding/updating employee payrolls
     */
    public void recalculateTotals() {
        if (this.employeePayrolls == null || this.employeePayrolls.isEmpty()) {
            this.totalGrossAmount = BigDecimal.ZERO;
            this.totalDeductions = BigDecimal.ZERO;
            this.totalNetAmount = BigDecimal.ZERO;
            this.employeeCount = 0;
            return;
        }

        this.totalGrossAmount = this.employeePayrolls.stream()
                .map(ep -> ep.getGrossPay() != null ? ep.getGrossPay() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.totalDeductions = this.employeePayrolls.stream()
                .map(ep -> ep.getTotalDeductions() != null ? ep.getTotalDeductions() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.totalNetAmount = this.employeePayrolls.stream()
                .map(ep -> ep.getNetPay() != null ? ep.getNetPay() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.employeeCount = this.employeePayrolls.size();
    }

    /**
     * Add employee payroll and update totals
     */
    public void addEmployeePayroll(EmployeePayroll employeePayroll) {
        employeePayrolls.add(employeePayroll);
        employeePayroll.setPayroll(this);
        recalculateTotals(); // Auto-recalculate
    }
}