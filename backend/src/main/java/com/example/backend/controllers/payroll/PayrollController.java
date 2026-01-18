package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.*;
import com.example.backend.models.payroll.*;
import com.example.backend.services.hr.LeaveRequestService;
import com.example.backend.services.payroll.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.repository.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class PayrollController {

    private final PayrollService payrollService;
    private final PayrollSnapshotService snapshotService;
    private final PayrollNotificationService notificationService;
    private final LeaveReviewService leaveReviewService;
    private final OvertimeReviewService overtimeReviewService;

    // ========================================
    // EXISTING ENDPOINTS (UNCHANGED)
    // ========================================
    @GetMapping("/latest")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getLatestPayroll() {
        try {
            return payrollService.getLastPayroll()
                    .map(payroll -> ResponseEntity.ok(convertToDTO(payroll)))
                    .orElse(ResponseEntity.noContent().build());
        } catch (Exception e) {
            log.error("Error fetching latest payroll", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    /**
     * Create a new payroll
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> createPayroll(@RequestBody CreatePayrollRequest request) {
        try {
            log.info("Creating payroll from {} to {}", request.getStartDate(), request.getEndDate());

            Payroll payroll;
            if (Boolean.TRUE.equals(request.getOverrideContinuity())) {
                payroll = payrollService.createPayrollWithOverride(
                        request.getStartDate(),
                        request.getEndDate(),
                        request.getCreatedBy(),
                        request.getOverrideReason()
                );
            } else {
                payroll = payrollService.createPayroll(
                        request.getStartDate(),
                        request.getEndDate(),
                        request.getCreatedBy()
                );
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(convertToDTO(payroll));

        } catch (IllegalStateException | IllegalArgumentException e) {
            log.error("Validation error creating payroll: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (PayrollService.PayrollContinuityException e) {
            log.error("Continuity error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (Exception e) {
            log.error("Error creating payroll", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to create payroll: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Get all payrolls
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<PayrollDTO>> getAllPayrolls() {
        try {
            List<Payroll> payrolls = payrollService.getAllPayrolls();
            List<PayrollDTO> dtos = payrolls.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.error("Error fetching payrolls", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get payroll by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getPayrollById(@PathVariable UUID id) {
        try {
            Payroll payroll = payrollService.getPayrollById(id);
            return ResponseEntity.ok(convertToDTO(payroll));
        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching payroll", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get payroll by date range
     * Query params: startDate and endDate in YYYY-MM-DD format
     */
    @GetMapping("/period")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getPayrollByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            java.time.LocalDate start = java.time.LocalDate.parse(startDate);
            java.time.LocalDate end = java.time.LocalDate.parse(endDate);
            Payroll payroll = payrollService.getPayrollByDateRange(start, end);
            return ResponseEntity.ok(convertToDTO(payroll));
        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching payroll for period {} to {}", startDate, endDate, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================================
    // ⭐ NEW: ATTENDANCE WORKFLOW ENDPOINTS
    // ========================================

    /**
     * Import or Re-import Attendance (UPSERT)
     * Can be called multiple times - updates existing records
     *
     * POST /api/v1/payroll/{id}/import-attendance
     */
    @PostMapping("/{id}/import-attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> importAttendance(
            @PathVariable UUID id,
            Principal principal) {

        log.info("========================================");
        log.info("🔵 IMPORT ATTENDANCE - START");
        log.info("========================================");

        try {
            log.info("1️⃣ INPUTS RECEIVED:");
            log.info("   Payroll ID: {}", id);

            String username = principal != null ? principal.getName() : "SYSTEM";
            log.info("   Username: {}", username);

            // Get payroll
            log.info("2️⃣ FETCHING PAYROLL...");
            Payroll payroll = payrollService.getPayrollById(id);
            log.info("   ✅ Payroll found: {} to {}", payroll.getStartDate(), payroll.getEndDate());
            log.info("   Current Status: {}", payroll.getStatus());

            // Validate state
            log.info("3️⃣ VALIDATING STATE...");
            if (payroll.getAttendanceFinalized()) {
                log.warn("   ❌ Attendance already finalized");
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Attendance is finalized and locked. Cannot import.", System.currentTimeMillis()));
            }

            // ⭐ CRITICAL FIX: Transition to ATTENDANCE_IMPORT if needed
            if (payroll.getStatus() == PayrollStatus.PUBLIC_HOLIDAYS_REVIEW) {
                log.info("   ⚠️ Payroll is in PUBLIC_HOLIDAYS_REVIEW, transitioning to ATTENDANCE_IMPORT...");
                payroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);
                payrollService.save(payroll);
                log.info("   ✅ Status transitioned to ATTENDANCE_IMPORT");
            } else if (payroll.getStatus() != PayrollStatus.ATTENDANCE_IMPORT) {
                log.warn("   ❌ Invalid status: {}", payroll.getStatus());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Cannot import attendance. Payroll must be in PUBLIC_HOLIDAYS_REVIEW or ATTENDANCE_IMPORT status. Current: " + payroll.getStatus(), System.currentTimeMillis()));
            }
            log.info("   ✅ State validation passed");

            // Import with upsert
            log.info("4️⃣ CALLING SNAPSHOT SERVICE...");
            AttendanceImportSummaryDTO summary = snapshotService.importAttendanceWithUpsert(payroll);
            log.info("   ✅ Import completed");
            log.info("   Summary: {}", summary.getMessage());

            // Save payroll and recalculate totals after attendance import
            log.info("4️⃣.5 SAVING PAYROLL AND RECALCULATING TOTALS...");
            payrollService.recalculateTotals(payroll.getId());
            log.info("   ✅ Payroll saved and totals recalculated");

            // Check for issues and notify HR
            log.info("5️⃣ CHECKING FOR ISSUES...");
            if (summary.getIssues() != null && !summary.getIssues().isEmpty()) {
                log.info("   ⚠️ {} issues found", summary.getIssues().size());
                try {
                    notificationService.notifyHRAttendanceIssues(payroll, summary.getIssues().size());
                } catch (Exception e) {
                    log.error("   ⚠️ Failed to send notification:", e);
                }
            } else {
                log.info("   ✅ No issues");
            }

            log.info("========================================");
            log.info("✅ IMPORT ATTENDANCE - SUCCESS");
            log.info("========================================");

            return ResponseEntity.ok(summary);

        } catch (IllegalStateException e) {
            log.error("❌ STATE ERROR: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));

        } catch (PayrollService.PayrollNotFoundException e) {
            log.error("❌ PAYROLL NOT FOUND: {}", id);
            return ResponseEntity.notFound().build();

        } catch (Exception e) {
            log.error("❌❌❌ CRITICAL ERROR ❌❌❌");
            log.error("Error type: {}", e.getClass().getName());
            log.error("Error message: {}", e.getMessage());
            log.error("Full stack trace:", e);

            if (e.getCause() != null) {
                log.error("CAUSED BY: {}", e.getCause().getClass().getName());
                log.error("Cause message: {}", e.getCause().getMessage());
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to import attendance: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Get Attendance Import Status
     * Returns current state of attendance import
     *
     * GET /api/v1/payroll/{id}/attendance-status
     */
    @GetMapping("/{id}/attendance-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getAttendanceStatus(@PathVariable UUID id) {
        try {
            Payroll payroll = payrollService.getPayrollById(id);

            Map<String, Object> status = new HashMap<>();
            status.put("attendanceImported", payroll.getAttendanceImported());
            status.put("attendanceFinalized", payroll.getAttendanceFinalized());
            status.put("canEdit", payroll.canEditAttendance());
            status.put("canFinalize", payroll.canFinalizeAttendance());
            status.put("importCount", payroll.getAttendanceImportCount());
            status.put("lastImportAt", payroll.getLastAttendanceImportAt());
            status.put("finalizedBy", payroll.getAttendanceFinalizedBy());
            status.put("finalizedAt", payroll.getAttendanceFinalizedAt());
            status.put("hrNotificationSent", payroll.getHrNotificationSent());
            status.put("hrNotificationSentAt", payroll.getHrNotificationSentAt());
            status.put("summary", payroll.getAttendanceSummary());

            return ResponseEntity.ok(status);

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error getting attendance status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Finalize Attendance (LOCK IT)
     * Prevents further imports or edits
     * Moves to next phase (Leave Review)
     *
     * POST /api/v1/payroll/{id}/finalize-attendance
     */
    @PostMapping("/{id}/finalize-attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> finalizeAttendance(@PathVariable UUID id, Principal principal) {
        log.info("Finalizing attendance for payroll: {} by user: {}", id, principal.getName());

        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // Validate can finalize
            if (!payroll.canFinalizeAttendance()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Cannot finalize attendance in current state", System.currentTimeMillis()));
            }

            // Finalize (LOCK)
            payroll.finalizeAttendance(principal.getName());

            // Move to next phase
            payroll.setStatus(PayrollStatus.LEAVE_REVIEW);

            payrollService.save(payroll);

            // Notify HR
            notificationService.notifyHRAttendanceFinalized(payroll, principal.getName());

            log.info("Attendance finalized for payroll {} by {}", id, principal.getName());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Attendance finalized and locked successfully");
            response.put("newStatus", payroll.getStatus().toString());
            response.put("finalizedBy", payroll.getAttendanceFinalizedBy());
            response.put("finalizedAt", payroll.getAttendanceFinalizedAt());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.error("Cannot finalize attendance: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error finalizing attendance: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to finalize attendance: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Send Notification to HR
     * Asks HR to review and update attendance
     *
     * POST /api/v1/payroll/{id}/notify-hr
     */
    @PostMapping("/{id}/notify-hr")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> notifyHR(@PathVariable UUID id, Principal principal) {
        log.info("Sending HR notification for payroll: {} by user: {}", id, principal.getName());

        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // Validate state
            if (payroll.getAttendanceFinalized()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Attendance is already finalized. Cannot send notification.", System.currentTimeMillis()));
            }

            // Send notification
            notificationService.notifyHRForAttendanceReview(payroll, principal.getName());

            // Mark as sent
            payroll.markHrNotificationSent();
            payrollService.save(payroll);

            log.info("HR notification sent for payroll {}", id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "HR notification sent successfully");
            response.put("sentAt", payroll.getHrNotificationSentAt());

            return ResponseEntity.ok(response);

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error sending HR notification: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to send notification: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Reset Attendance Import (DANGER - Admin only)
     * Deletes all attendance data and resets to initial state
     *
     * DELETE /api/v1/payroll/{id}/reset-attendance
     */
    @DeleteMapping("/{id}/reset-attendance")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resetAttendanceImport(@PathVariable UUID id, Principal principal) {
        log.warn("Resetting attendance import for payroll: {} by user: {}", id, principal.getName());

        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // Validate not finalized
            if (payroll.getAttendanceFinalized()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Cannot reset finalized attendance", System.currentTimeMillis()));
            }

            // Delete all employee payrolls and snapshots
            payrollService.resetAttendanceData(payroll);

            // Reset workflow
            payroll.resetAttendanceWorkflow();
            payrollService.save(payroll);

            log.info("Attendance import reset for payroll {}", id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Attendance import reset successfully");

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error resetting attendance: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to reset attendance: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    // ========================================
    // EXISTING ENDPOINTS (UNCHANGED)
    // ========================================

    /**
     * Manually recalculate payroll totals
     * Useful for fixing totals when they get out of sync
     *
     * POST /api/v1/payroll/{id}/recalculate-totals
     */
    @PostMapping("/{id}/recalculate-totals")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> recalculateTotals(@PathVariable UUID id) {
        log.info("Manually recalculating totals for payroll: {}", id);

        try {
            payrollService.recalculateTotals(id);

            // Fetch updated payroll
            Payroll payroll = payrollService.getPayrollById(id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payroll totals recalculated successfully");
            response.put("totalGrossAmount", payroll.getTotalGrossAmount());
            response.put("totalDeductions", payroll.getTotalDeductions());
            response.put("totalNetAmount", payroll.getTotalNetAmount());
            response.put("employeeCount", payroll.getEmployeeCount());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.error("Cannot recalculate: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error recalculating totals: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to recalculate totals: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Move to leave review
     */
    @PostMapping("/{id}/leave-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> moveToLeaveReview(@PathVariable UUID id, @RequestParam String username) {
        try {
            payrollService.moveToLeaveReview(id, username);
            return ResponseEntity.ok().body("Moved to leave review");
        } catch (Exception e) {
            log.error("Error moving to leave review", e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Move to overtime review
     */
    @PostMapping("/{id}/overtime-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> moveToOvertimeReview(@PathVariable UUID id, @RequestParam String username) {
        try {
            payrollService.moveToOvertimeReview(id, username);
            return ResponseEntity.ok().body("Moved to overtime review");
        } catch (Exception e) {
            log.error("Error moving to overtime review", e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Confirm and lock payroll (triggers calculations)
     */
    @PostMapping("/{id}/confirm-lock")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> confirmAndLock(@PathVariable UUID id, @RequestParam String username) {
        try {
            log.info("Confirming and locking payroll {} by user {}", id, username);
            payrollService.confirmAndLock(id, username);
            return ResponseEntity.ok().body("Payroll confirmed and locked successfully");
        } catch (Exception e) {
            log.error("Error confirming payroll", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to confirm payroll: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Send payroll to finance for review and payment
     * Transitions from CONFIRMED_AND_LOCKED to PENDING_FINANCE_REVIEW
     * Stores the selected payment source (balance) for salary payment
     *
     * POST /api/v1/payroll/{id}/send-to-finance
     */
    @PostMapping("/{id}/send-to-finance")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> sendToFinance(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> request,
            Principal principal) {

        log.info("========================================");
        log.info("🔵 SEND TO FINANCE - START");
        log.info("========================================");

        try {
            String username = principal != null ? principal.getName() : "SYSTEM";
            log.info("Payroll ID: {}, Username: {}", id, username);

            // Get payroll
            Payroll payroll = payrollService.getPayrollById(id);
            log.info("Current status: {}", payroll.getStatus());

            // Validate status
            if (payroll.getStatus() != PayrollStatus.CONFIRMED_AND_LOCKED) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Payroll must be in CONFIRMED_AND_LOCKED status to send to finance. Current: " + payroll.getStatus(), System.currentTimeMillis()));
            }

            // Extract payment source details from request
            String paymentSourceType = (String) request.get("paymentSourceType");
            String paymentSourceId = (String) request.get("paymentSourceId");
            String paymentSourceName = (String) request.get("paymentSourceName");

            if (paymentSourceType == null || paymentSourceId == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Payment source type and ID are required", System.currentTimeMillis()));
            }

            // Validate payment source type
            if (!List.of("BANK_ACCOUNT", "CASH_SAFE", "CASH_WITH_PERSON").contains(paymentSourceType)) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Invalid payment source type. Must be BANK_ACCOUNT, CASH_SAFE, or CASH_WITH_PERSON", System.currentTimeMillis()));
            }

            // Update payroll with finance review details
            payroll.setStatus(PayrollStatus.PENDING_FINANCE_REVIEW);
            payroll.setSentToFinanceAt(java.time.LocalDateTime.now());
            payroll.setSentToFinanceBy(username);
            payroll.setPaymentSourceType(paymentSourceType);
            payroll.setPaymentSourceId(UUID.fromString(paymentSourceId));
            payroll.setPaymentSourceName(paymentSourceName);

            payrollService.save(payroll);

            // Notify finance team
            try {
                notificationService.notifyFinancePayrollReady(payroll, username);
            } catch (Exception e) {
                log.warn("Failed to send finance notification: {}", e.getMessage());
            }

            log.info("========================================");
            log.info("✅ SEND TO FINANCE - SUCCESS");
            log.info("========================================");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payroll sent to finance for review");
            response.put("newStatus", payroll.getStatus().toString());
            response.put("sentToFinanceAt", payroll.getSentToFinanceAt());
            response.put("paymentSourceType", paymentSourceType);
            response.put("paymentSourceName", paymentSourceName);

            return ResponseEntity.ok(response);

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error sending payroll to finance: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to send payroll to finance: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Get employee payrolls for a payroll
     */
    @GetMapping("/{id}/employees")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<EmployeePayrollDTO>> getEmployeePayrolls(@PathVariable UUID id) {
        try {
            List<EmployeePayroll> employeePayrolls = payrollService.getEmployeePayrolls(id);
            List<EmployeePayrollDTO> dtos = employeePayrolls.stream()
                    .map(this::convertToEmployeePayrollDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.error("Error fetching employee payrolls", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    /**
     * Delete payroll (only if not locked)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePayroll(@PathVariable UUID id, @RequestParam String username) {
        try {
            payrollService.deletePayroll(id, username);
            return ResponseEntity.ok().body("Payroll deleted successfully");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (Exception e) {
            log.error("Error deleting payroll", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to delete payroll", System.currentTimeMillis()));
        }
    }

    /**
     * Get public holidays for a payroll
     */
    @GetMapping("/{id}/public-holidays")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<PublicHolidayDTO>> getPublicHolidays(@PathVariable UUID id) {
        try {
            log.info("Fetching public holidays for payroll: {}", id);
            Payroll payroll = payrollService.getPayrollById(id);

            if (payroll.getPublicHolidays() == null || payroll.getPublicHolidays().isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            List<PublicHolidayDTO> holidays = payroll.getPublicHolidays()
                    .stream()
                    .map(this::convertPublicHolidayToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(holidays);
        } catch (PayrollService.PayrollNotFoundException e) {
            log.warn("Payroll not found: {}", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching public holidays for payroll: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Add public holidays to payroll
     */

    @PostMapping("/{id}/add-public-holidays")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> addPublicHolidays(
            @PathVariable UUID id,
            @RequestBody List<PublicHolidayDTO> holidays,
            Principal principal) {

        log.info("Adding {} public holidays to payroll {}",
                holidays != null ? holidays.size() : 0, id);

        try {
            String username = principal != null ? principal.getName() : "SYSTEM";

            payrollService.addPublicHolidays(id, holidays, username);

            Payroll updatedPayroll = payrollService.getPayrollById(id);

            log.info("Public holidays added successfully to payroll {}", id);

            return ResponseEntity.ok(convertToDTO(updatedPayroll));

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Failed to add public holidays: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (Exception e) {
            log.error("Error adding public holidays to payroll {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to add public holidays: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private PayrollDTO convertToDTO(Payroll payroll) {
        return PayrollDTO.builder()
                .id(payroll.getId())
                .startDate(payroll.getStartDate())
                .endDate(payroll.getEndDate())
                .status(payroll.getStatus().name())
                .statusDisplayName(payroll.getStatus().getDisplayName())
                .totalGrossAmount(payroll.getTotalGrossAmount())
                .totalDeductions(payroll.getTotalDeductions())
                .totalNetAmount(payroll.getTotalNetAmount())
                .employeeCount(payroll.getEmployeeCount())
                .overrideContinuity(payroll.getOverrideContinuity())
                .continuityOverrideReason(payroll.getContinuityOverrideReason())
                .createdAt(payroll.getCreatedAt())
                .createdBy(payroll.getCreatedBy())
                .lockedAt(payroll.getLockedAt())
                .lockedBy(payroll.getLockedBy())
                .paidAt(payroll.getPaidAt())
                .paidBy(payroll.getPaidBy())
                .publicHolidayCount(payroll.getPublicHolidays() != null ? payroll.getPublicHolidays().size() : 0)
                // ⭐ NEW: Attendance workflow fields
                .attendanceImported(payroll.getAttendanceImported())
                .attendanceFinalized(payroll.getAttendanceFinalized())
                .attendanceImportCount(payroll.getAttendanceImportCount())
                .lastAttendanceImportAt(payroll.getLastAttendanceImportAt())
                .attendanceFinalizedBy(payroll.getAttendanceFinalizedBy())
                .attendanceFinalizedAt(payroll.getAttendanceFinalizedAt())
                .hrNotificationSent(payroll.getHrNotificationSent())
                .build();
    }

    private EmployeePayrollDTO convertToEmployeePayrollDTO(EmployeePayroll ep) {
        return EmployeePayrollDTO.builder()
                .id(ep.getId())
                .payrollId(ep.getPayroll().getId())
                .employeeId(ep.getEmployeeId())
                .employeeName(ep.getEmployeeName())
                .jobPositionName(ep.getJobPositionName())
                .departmentName(ep.getDepartmentName())
                .contractType(ep.getContractType().name())
                .monthlyBaseSalary(ep.getMonthlyBaseSalary())
                .dailyRate(ep.getDailyRate())
                .hourlyRate(ep.getHourlyRate())
                .absentDeduction(ep.getAbsentDeduction())
                .lateDeduction(ep.getLateDeduction())
                .lateForgivenessMinutes(ep.getLateForgivenessMinutes())
                .lateForgivenessCountPerQuarter(ep.getLateForgivenessCountPerQuarter())
                .leaveDeduction(ep.getLeaveDeduction())
                .grossPay(ep.getGrossPay())
                .totalDeductions(ep.getTotalDeductions())
                .netPay(ep.getNetPay())
                .totalWorkingDays(ep.getTotalWorkingDays())
                .attendedDays(ep.getAttendedDays())
                .absentDays(ep.getAbsentDays())
                .lateDays(ep.getLateDays())
                .forgivenLateDays(ep.getForgivenLateDays())
                .chargedLateDays(ep.getChargedLateDays())
                .excessLeaveDays(ep.getExcessLeaveDays())
                .totalWorkedHours(ep.getTotalWorkedHours())
                .overtimeHours(ep.getOvertimeHours())
                .overtimePay(ep.getOvertimePay())
                .absenceDeductionAmount(ep.getAbsenceDeductionAmount())
                .lateDeductionAmount(ep.getLateDeductionAmount())
                .leaveDeductionAmount(ep.getLeaveDeductionAmount())
                .loanDeductionAmount(ep.getLoanDeductionAmount())
                .otherDeductionAmount(ep.getOtherDeductionAmount())
                .calculatedAt(ep.getCalculatedAt())
                .build();
    }

    private PublicHolidayDTO convertPublicHolidayToDTO(PayrollPublicHoliday holiday) {
        return PublicHolidayDTO.builder()
                .id(holiday.getId())
                .startDate(holiday.getStartDate())
                .endDate(holiday.getEndDate())
                .name(holiday.getHolidayName())
                .isPaid(holiday.getIsPaid())
                .payrollId(holiday.getPayroll().getId())
                .build();
    }



    @PostMapping("/{id}/process-leave-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> processLeaveReview(
            @PathVariable UUID id,
            Principal principal) {

        log.info("========================================");
        log.info("🔵 PROCESS LEAVE REVIEW - START");
        log.info("========================================");

        try {
            log.info("1️⃣ INPUTS RECEIVED:");
            log.info("   Payroll ID: {}", id);

            String username = principal != null ? principal.getName() : "SYSTEM";
            log.info("   Username: {}", username);

            // Get payroll
            log.info("2️⃣ FETCHING PAYROLL...");
            Payroll payroll = payrollService.getPayrollById(id);
            log.info("   ✅ Payroll found: {} to {}", payroll.getStartDate(), payroll.getEndDate());
            log.info("   Current Status: {}", payroll.getStatus());

            // Validate state
            log.info("3️⃣ VALIDATING STATE...");

            // ⭐ FIX: Handle null Boolean values safely
            Boolean leaveFinalized = payroll.getLeaveFinalized();
            if (Boolean.TRUE.equals(leaveFinalized)) {
                log.warn("   ❌ Leave already finalized");
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Leave is finalized and locked. Cannot process.", System.currentTimeMillis()));
            }

            if (payroll.getStatus() != PayrollStatus.LEAVE_REVIEW) {
                log.warn("   ❌ Invalid status: {}", payroll.getStatus());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Cannot process leave review. Payroll must be in LEAVE_REVIEW status. Current: " + payroll.getStatus(), System.currentTimeMillis()));
            }
            log.info("   ✅ State validation passed");

            // Process leave review
            log.info("4️⃣ CALLING LEAVE SERVICE...");
            LeaveReviewSummaryDTO summary = leaveReviewService.processLeaveReview(payroll);
            log.info("   ✅ Processing completed");
            log.info("   Summary: {}", summary.getMessage());

            // Save payroll after leave processing
            log.info("4️⃣.5 SAVING PAYROLL AND RECALCULATING TOTALS...");
            payrollService.recalculateTotals(payroll.getId());
            log.info("   ✅ Payroll saved and totals recalculated");

            // Check for issues and notify HR
            log.info("5️⃣ CHECKING FOR ISSUES...");
            if (summary.getIssues() != null && !summary.getIssues().isEmpty()) {
                log.info("   ⚠️ {} issues found", summary.getIssues().size());
                try {
                    notificationService.notifyHRLeaveIssues(payroll, summary.getIssues().size());
                } catch (Exception e) {
                    log.error("   ⚠️ Failed to send notification:", e);
                }
            } else {
                log.info("   ✅ No issues");
            }

            log.info("========================================");
            log.info("✅ PROCESS LEAVE REVIEW - SUCCESS");
            log.info("========================================");

            return ResponseEntity.ok(summary);

        } catch (IllegalStateException e) {
            log.error("❌ STATE ERROR: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));

        } catch (PayrollService.PayrollNotFoundException e) {
            log.error("❌ PAYROLL NOT FOUND: {}", id);
            return ResponseEntity.notFound().build();

        } catch (Exception e) {
            log.error("❌❌❌ CRITICAL ERROR ❌❌❌");
            log.error("Error type: {}", e.getClass().getName());
            log.error("Error message: {}", e.getMessage());
            log.error("Full stack trace:", e);

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to process leave review: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Get Leave Review Status
     * Returns current state of leave review workflow
     *
     * GET /api/v1/payroll/{id}/leave-status
     */
    @GetMapping("/{id}/leave-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getLeaveStatus(@PathVariable UUID id) {
        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // ⭐ FIX: Handle null values safely with default false
            Map<String, Object> status = new HashMap<>();
            status.put("leaveProcessed", payroll.getLeaveProcessed() != null ? payroll.getLeaveProcessed() : false);
            status.put("leaveFinalized", payroll.getLeaveFinalized() != null ? payroll.getLeaveFinalized() : false);
            status.put("canEdit", payroll.canEditLeave());
            status.put("canFinalize", payroll.canFinalizeLeave());
            status.put("lastProcessedAt", payroll.getLastLeaveProcessedAt());
            status.put("finalizedBy", payroll.getLeaveFinalizedBy());
            status.put("finalizedAt", payroll.getLeaveFinalizedAt());
            status.put("hrNotificationSent", payroll.getLeaveHrNotificationSent() != null ? payroll.getLeaveHrNotificationSent() : false);
            status.put("hrNotificationSentAt", payroll.getLeaveHrNotificationSentAt());
            status.put("summary", payroll.getLeaveSummary());

            return ResponseEntity.ok(status);

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error getting leave status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Finalize Leave Review (LOCK IT)
     * Prevents further processing
     * Moves to next phase (Overtime Review)
     *
     * POST /api/v1/payroll/{id}/finalize-leave
     */
    @PostMapping("/{id}/finalize-leave")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> finalizeLeave(@PathVariable UUID id, Principal principal) {
        log.info("Finalizing leave review for payroll: {} by user: {}", id, principal.getName());

        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // ⭐ FIX: Initialize leave fields if null
            if (payroll.getLeaveProcessed() == null) {
                payroll.setLeaveProcessed(false);
            }
            if (payroll.getLeaveFinalized() == null) {
                payroll.setLeaveFinalized(false);
            }

            // Validate can finalize
            if (!payroll.canFinalizeLeave()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Cannot finalize leave review in current state", System.currentTimeMillis()));
            }

            // Finalize (LOCK)
            payroll.finalizeLeave(principal.getName());

            // Move to next phase
            payroll.setStatus(PayrollStatus.OVERTIME_REVIEW);

            payrollService.save(payroll);

            // Notify HR
            notificationService.notifyHRLeaveFinalized(payroll, principal.getName());

            log.info("Leave review finalized for payroll {} by {}", id, principal.getName());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Leave review finalized and locked successfully");
            response.put("newStatus", payroll.getStatus().toString());
            response.put("finalizedBy", payroll.getLeaveFinalizedBy());
            response.put("finalizedAt", payroll.getLeaveFinalizedAt());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.error("Cannot finalize leave review: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error finalizing leave review: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to finalize leave review: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Send Notification to HR for Leave Review
     * Asks HR to review leave requests
     *
     * POST /api/v1/payroll/{id}/notify-hr-leave
     */
    @PostMapping("/{id}/notify-hr-leave")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> notifyHRForLeave(@PathVariable UUID id, Principal principal) {
        log.info("Sending HR notification for leave review: {} by user: {}", id, principal.getName());

        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // ⭐ FIX: Handle null Boolean safely
            Boolean leaveFinalized = payroll.getLeaveFinalized();
            if (Boolean.TRUE.equals(leaveFinalized)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Leave is already finalized. Cannot send notification.", System.currentTimeMillis()));
            }

            // Send notification
            notificationService.notifyHRForLeaveReview(payroll, principal.getName());

            // Mark as sent
            payroll.markLeaveHrNotificationSent();
            payrollService.save(payroll);

            log.info("HR notification sent for leave review {}", id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "HR notification sent successfully");
            response.put("sentAt", payroll.getLeaveHrNotificationSentAt());

            return ResponseEntity.ok(response);

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error sending HR notification for leave: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to send notification: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Get Leave Requests for Payroll Period
     * Returns all leave requests within the payroll period
     *
     * GET /api/v1/payroll/{id}/leave-requests
     */
    @GetMapping("/{id}/leave-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getLeaveRequestsForPayroll(@PathVariable UUID id) {
        try {
            log.info("Fetching leave requests for payroll: {}", id);
            Payroll payroll = payrollService.getPayrollById(id);

            // Get leave requests within the payroll period
            List<LeaveRequestDTO> leaveRequests = leaveReviewService.getLeaveRequestsForPeriod(
                    payroll.getStartDate(),
                    payroll.getEndDate()
            );

            return ResponseEntity.ok(leaveRequests);

        } catch (PayrollService.PayrollNotFoundException e) {
            log.warn("Payroll not found: {}", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching leave requests for payroll: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================================
// ADD THESE ENDPOINTS TO PayrollController.java
// Add after the Leave Review endpoints
// ========================================

    /**
     * Get Overtime Review Status
     * Returns current state of overtime review workflow
     *
     * GET /api/v1/payroll/{id}/overtime-status
     */
    @GetMapping("/{id}/overtime-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getOvertimeStatus(@PathVariable UUID id) {
        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // ⭐ FIX: Handle null values safely with default false
            Map<String, Object> status = new HashMap<>();
            status.put("overtimeProcessed", payroll.getOvertimeProcessed() != null ? payroll.getOvertimeProcessed() : false);
            status.put("overtimeFinalized", payroll.getOvertimeFinalized() != null ? payroll.getOvertimeFinalized() : false);
            status.put("canEdit", payroll.canEditOvertime());
            status.put("canFinalize", payroll.canFinalizeOvertime());
            status.put("lastProcessedAt", payroll.getLastOvertimeProcessedAt());
            status.put("finalizedBy", payroll.getOvertimeFinalizedBy());
            status.put("finalizedAt", payroll.getOvertimeFinalizedAt());
            status.put("hrNotificationSent", payroll.getOvertimeHrNotificationSent() != null ? payroll.getOvertimeHrNotificationSent() : false);
            status.put("hrNotificationSentAt", payroll.getOvertimeHrNotificationSentAt());
            status.put("summary", payroll.getOvertimeSummary());

            return ResponseEntity.ok(status);

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error getting overtime status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Process Overtime Review
     * Calculates overtime hours and pay for all employees
     *
     * POST /api/v1/payroll/{id}/process-overtime-review
     */
    @PostMapping("/{id}/process-overtime-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> processOvertimeReview(
            @PathVariable UUID id,
            Principal principal) {

        log.info("========================================");
        log.info("🔵 PROCESS OVERTIME REVIEW - START");
        log.info("========================================");

        try {
            log.info("1️⃣ INPUTS RECEIVED:");
            log.info("   Payroll ID: {}", id);

            String username = principal != null ? principal.getName() : "SYSTEM";
            log.info("   Username: {}", username);

            // Get payroll
            log.info("2️⃣ FETCHING PAYROLL...");
            Payroll payroll = payrollService.getPayrollById(id);
            log.info("   ✅ Payroll found: {} to {}", payroll.getStartDate(), payroll.getEndDate());
            log.info("   Current Status: {}", payroll.getStatus());

            // Validate state
            log.info("3️⃣ VALIDATING STATE...");

            // ⭐ FIX: Handle null Boolean values safely
            Boolean overtimeFinalized = payroll.getOvertimeFinalized();
            if (Boolean.TRUE.equals(overtimeFinalized)) {
                log.warn("   ❌ Overtime already finalized");
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Overtime is finalized and locked. Cannot process.", System.currentTimeMillis()));
            }

            if (payroll.getStatus() != PayrollStatus.OVERTIME_REVIEW) {
                log.warn("   ❌ Invalid status: {}", payroll.getStatus());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Cannot process overtime review. Payroll must be in OVERTIME_REVIEW status. Current: " + payroll.getStatus(), System.currentTimeMillis()));
            }
            log.info("   ✅ State validation passed");

            // Process overtime review
            log.info("4️⃣ CALLING OVERTIME SERVICE...");
            OvertimeReviewSummaryDTO summary = overtimeReviewService.processOvertimeReview(payroll);
            log.info("   ✅ Processing completed");
            log.info("   Summary: {}", summary.getMessage());

            // Save payroll after overtime processing
            log.info("4️⃣.5 SAVING PAYROLL AND RECALCULATING TOTALS...");
            payrollService.recalculateTotals(payroll.getId());
            log.info("   ✅ Payroll saved and totals recalculated");

            // Check for issues and notify HR
            log.info("5️⃣ CHECKING FOR ISSUES...");
            if (summary.getIssues() != null && !summary.getIssues().isEmpty()) {
                log.info("   ⚠️ {} issues found", summary.getIssues().size());
                try {
                    notificationService.notifyHROvertimeIssues(payroll, summary.getIssues().size());
                } catch (Exception e) {
                    log.error("   ⚠️ Failed to send notification:", e);
                }
            } else {
                log.info("   ✅ No issues");
            }

            log.info("========================================");
            log.info("✅ PROCESS OVERTIME REVIEW - SUCCESS");
            log.info("========================================");

            return ResponseEntity.ok(summary);

        } catch (IllegalStateException e) {
            log.error("❌ STATE ERROR: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));

        } catch (PayrollService.PayrollNotFoundException e) {
            log.error("❌ PAYROLL NOT FOUND: {}", id);
            return ResponseEntity.notFound().build();

        } catch (Exception e) {
            log.error("❌❌❌ CRITICAL ERROR ❌❌❌");
            log.error("Error type: {}", e.getClass().getName());
            log.error("Error message: {}", e.getMessage());
            log.error("Full stack trace:", e);

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to process overtime review: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Finalize Overtime Review (LOCK IT)
     * Prevents further processing
     * Moves to next phase (Confirmed & Locked)
     *
     * POST /api/v1/payroll/{id}/finalize-overtime
     */
    @PostMapping("/{id}/finalize-overtime")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> finalizeOvertime(@PathVariable UUID id, Principal principal) {
        log.info("Finalizing overtime review for payroll: {} by user: {}", id, principal.getName());

        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // ⭐ FIX: Initialize overtime fields if null
            if (payroll.getOvertimeProcessed() == null) {
                payroll.setOvertimeProcessed(false);
            }
            if (payroll.getOvertimeFinalized() == null) {
                payroll.setOvertimeFinalized(false);
            }

            // Validate can finalize
            if (!payroll.canFinalizeOvertime()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Cannot finalize overtime review in current state", System.currentTimeMillis()));
            }

            // Finalize (LOCK)
            payroll.finalizeOvertime(principal.getName());

            // Move to next phase
            payroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);

            payrollService.save(payroll);

            // Notify HR
            notificationService.notifyHROvertimeFinalized(payroll, principal.getName());

            log.info("Overtime review finalized for payroll {} by {}", id, principal.getName());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Overtime review finalized and locked successfully");
            response.put("newStatus", payroll.getStatus().toString());
            response.put("finalizedBy", payroll.getOvertimeFinalizedBy());
            response.put("finalizedAt", payroll.getOvertimeFinalizedAt());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.error("Cannot finalize overtime review: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage(), System.currentTimeMillis()));
        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error finalizing overtime review: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to finalize overtime review: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Send Notification to HR for Overtime Review
     * Asks HR to review overtime records
     *
     * POST /api/v1/payroll/{id}/notify-hr-overtime
     */
    @PostMapping("/{id}/notify-hr-overtime")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> notifyHRForOvertime(@PathVariable UUID id, Principal principal) {
        log.info("Sending HR notification for overtime review: {} by user: {}", id, principal.getName());

        try {
            Payroll payroll = payrollService.getPayrollById(id);

            // ⭐ FIX: Handle null Boolean safely
            Boolean overtimeFinalized = payroll.getOvertimeFinalized();
            if (Boolean.TRUE.equals(overtimeFinalized)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("Overtime is already finalized. Cannot send notification.", System.currentTimeMillis()));
            }

            // Send notification
            notificationService.notifyHRForOvertimeReview(payroll, principal.getName());

            // Mark as sent
            payroll.markOvertimeHrNotificationSent();
            payrollService.save(payroll);

            log.info("HR notification sent for overtime review {}", id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "HR notification sent successfully");
            response.put("sentAt", payroll.getOvertimeHrNotificationSentAt());

            return ResponseEntity.ok(response);

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error sending HR notification for overtime: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to send notification: " + e.getMessage(), System.currentTimeMillis()));
        }
    }

    /**
     * Get Overtime Records for Payroll Period
     * Returns all overtime records within the payroll period
     *
     * GET /api/v1/payroll/{id}/overtime-records
     */
    @GetMapping("/{id}/overtime-records")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getOvertimeRecordsForPayroll(@PathVariable UUID id) {
        try {
            log.info("Fetching overtime records for payroll: {}", id);
            Payroll payroll = payrollService.getPayrollById(id);

            // Get overtime records within the payroll period
            List<OvertimeRecordDTO> overtimeRecords = overtimeReviewService.getOvertimeRecordsForPeriod(
                    payroll.getStartDate(),
                    payroll.getEndDate()
            );

            return ResponseEntity.ok(overtimeRecords);

        } catch (PayrollService.PayrollNotFoundException e) {
            log.warn("Payroll not found: {}", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching overtime records for payroll: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{payrollId}/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<?> getEmployeePayroll(@PathVariable UUID payrollId, @PathVariable UUID employeeId) {
        try {
            EmployeePayroll employeePayroll = payrollService.getEmployeePayroll(payrollId, employeeId);

            // ⭐ CHANGE: Use the DETAILED converter here
            return ResponseEntity.ok(convertToDetailedEmployeePayrollDTO(employeePayroll));

        } catch (PayrollService.PayrollNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching employee payroll", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==========================================
    // ADD THESE HELPER METHODS
    // ==========================================

    /**
     * Converts to DTO AND includes the daily snapshots list.
     * Only use this for Single Entity endpoints, not Lists.
     */
    private EmployeePayrollDTO convertToDetailedEmployeePayrollDTO(EmployeePayroll ep) {
        // 1. Get the base DTO
        EmployeePayrollDTO dto = convertToEmployeePayrollDTO(ep);

        // 2. Map the snapshots
        if (ep.getAttendanceSnapshots() != null) {
            List<PayrollAttendanceSnapshotDTO> snapshotDTOs = ep.getAttendanceSnapshots().stream()
                    .sorted(Comparator.comparing(PayrollAttendanceSnapshot::getAttendanceDate))
                    .map(this::convertSnapshotToDTO)
                    .collect(Collectors.toList());

            dto.setAttendanceSnapshots(snapshotDTOs);
        }

        return dto;
    }

    private PayrollAttendanceSnapshotDTO convertSnapshotToDTO(PayrollAttendanceSnapshot snap) {
        return PayrollAttendanceSnapshotDTO.builder()
                .id(snap.getId() != null ? snap.getId().toString() : null)
                .attendanceDate(snap.getAttendanceDate())
                .isPublicHoliday(snap.getIsPublicHoliday())
                .isWeekend(snap.getIsWeekend())
                .status(snap.getStatus() != null ? snap.getStatus().name() : "ABSENT")
                .checkIn(snap.getCheckIn())
                .checkOut(snap.getCheckOut())
                .workedHours(snap.getWorkedHours())
                .overtimeHours(snap.getOvertimeHours())
                .lateMinutes(snap.getLateMinutes())
                .notes(snap.getNotes())
                .build();
    }
}