// ========================================
// FILE: PayrollNotificationService.java (COMPLETE)
// All notification methods: Attendance, Leave, and Overtime
// ========================================

package com.example.backend.services.payroll;

import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.services.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollNotificationService {

    private final NotificationService notificationService;

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Format payroll period for display
     */
    private String formatPayrollPeriod(Payroll payroll) {
        return String.format("%s to %s", payroll.getStartDate(), payroll.getEndDate());
    }

    /**
     * Generate unique identifier for payroll (for relatedEntity)
     */
    private String getPayrollIdentifier(Payroll payroll) {
        return String.format("PAYROLL_%s_%s",
            payroll.getStartDate().toString().replace("-", ""),
            payroll.getEndDate().toString().replace("-", ""));
    }

    // ========================================
    // ATTENDANCE NOTIFICATION METHODS
    // ========================================

    public void notifyHRForAttendanceReview(Payroll payroll, String requestedBy) {
        log.info("Sending HR notification for payroll {} requested by {}", payroll.getId(), requestedBy);

        try {
            String title = String.format("Attendance Review Required: %s Payroll",
                    formatPayrollPeriod(payroll));
            String message = buildAttendanceNotificationMessage(payroll, requestedBy);
            String actionUrl = String.format("/hr/attendance?payroll=%s", payroll.getId());
            String relatedEntity = getPayrollIdentifier(payroll);

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.INFO, actionUrl, relatedEntity);
            log.info("✅ HR notification sent successfully for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send HR notification", e);
        }
    }

    public void notifyHRAttendanceFinalized(Payroll payroll, String finalizedBy) {
        log.info("Notifying HR that attendance is finalized for payroll {}", payroll.getId());

        try {
            String title = String.format("Attendance Finalized: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "Attendance data for %s/%s payroll has been finalized and locked by %s. " +
                            "No further changes can be made. Payroll has moved to Leave Review phase.",
                    formatPayrollPeriod(payroll), finalizedBy
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.SUCCESS, actionUrl, relatedEntity);
            log.info("✅ HR finalization notification sent for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR finalization notification: {}", e.getMessage(), e);
        }
    }

    public void notifyHRAttendanceIssues(Payroll payroll, int issueCount) {
        log.info("Notifying HR about {} attendance issues for payroll {}", issueCount, payroll.getId());

        try {
            String title = String.format("Attendance Issues Found: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "%d attendance issue(s) detected in %s/%s payroll period. " +
                            "Please review and address these issues before finalization.",
                    issueCount, formatPayrollPeriod(payroll)
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.WARNING, actionUrl, relatedEntity);
            log.info("✅ HR issues notification sent for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR issues notification: {}", e.getMessage(), e);
        }
    }

    public void notifyUserImportComplete(Payroll payroll, String username, int employeesProcessed) {
        try {
            String title = "Attendance Import Complete";
            String message = String.format(
                    "Attendance import for %s/%s payroll completed successfully. Processed %d employees.",
                    formatPayrollPeriod(payroll), employeesProcessed
            );
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.broadcastSuccessNotification(title, message, relatedEntity);
            log.info("✅ Import completion notification sent");
        } catch (Exception e) {
            log.error("❌ Failed to send import completion notification: {}", e.getMessage(), e);
        }
    }

    // ========================================
    // LEAVE REVIEW NOTIFICATION METHODS
    // ========================================

    public void notifyHRForLeaveReview(Payroll payroll, String requestedBy) {
        log.info("Sending HR notification for leave review - payroll {} requested by {}", payroll.getId(), requestedBy);

        try {
            String title = String.format("Leave Review Required: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "Please review the leave requests for the %s/%s payroll period (%s to %s). " +
                            "Review all approved and pending leave requests to ensure they are accurate before finalization.",
                    formatPayrollPeriod(payroll), payroll.getStartDate(), payroll.getEndDate()
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.INFO, actionUrl, relatedEntity);
            log.info("✅ HR leave review notification sent successfully for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR leave review notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send HR notification", e);
        }
    }

    public void notifyHRLeaveFinalized(Payroll payroll, String finalizedBy) {
        log.info("Notifying HR that leave review is finalized for payroll {}", payroll.getId());

        try {
            String title = String.format("Leave Review Finalized: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "Leave review for %s/%s payroll has been finalized and locked by %s. " +
                            "No further changes can be made. Payroll has moved to Overtime Review phase.",
                    formatPayrollPeriod(payroll), finalizedBy
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.SUCCESS, actionUrl, relatedEntity);
            log.info("✅ HR leave finalization notification sent for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR leave finalization notification: {}", e.getMessage(), e);
        }
    }

    public void notifyHRLeaveIssues(Payroll payroll, int issueCount) {
        log.info("Notifying HR about {} leave issues for payroll {}", issueCount, payroll.getId());

        try {
            String title = String.format("Leave Issues Found: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "%d leave issue(s) detected in %s/%s payroll period. " +
                            "Issues include excess leave days that will result in deductions. " +
                            "Please review and address these issues before finalization.",
                    issueCount, formatPayrollPeriod(payroll)
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.WARNING, actionUrl, relatedEntity);
            log.info("✅ HR leave issues notification sent for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR leave issues notification: {}", e.getMessage(), e);
        }
    }

    public void notifyUserLeaveProcessComplete(Payroll payroll, String username, int requestsProcessed) {
        try {
            String title = "Leave Processing Complete";
            String message = String.format(
                    "Leave review for %s/%s payroll completed successfully. Processed %d leave request(s).",
                    formatPayrollPeriod(payroll), requestsProcessed
            );
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.broadcastSuccessNotification(title, message, relatedEntity);
            log.info("✅ Leave processing completion notification sent");
        } catch (Exception e) {
            log.error("❌ Failed to send leave processing completion notification: {}", e.getMessage(), e);
        }
    }

    // ========================================
    // OVERTIME REVIEW NOTIFICATION METHODS
    // ========================================

    public void notifyHRForOvertimeReview(Payroll payroll, String requestedBy) {
        log.info("Sending HR notification for overtime review - payroll {} requested by {}", payroll.getId(), requestedBy);

        try {
            String title = String.format("Overtime Review Required: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "Please review the overtime records for the %s/%s payroll period (%s to %s). " +
                            "Review all overtime hours and ensure they are approved and accurately calculated before finalization.",
                    formatPayrollPeriod(payroll), payroll.getStartDate(), payroll.getEndDate()
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.INFO, actionUrl, relatedEntity);
            log.info("✅ HR overtime review notification sent successfully for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR overtime review notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send HR notification", e);
        }
    }

    public void notifyHROvertimeFinalized(Payroll payroll, String finalizedBy) {
        log.info("Notifying HR that overtime review is finalized for payroll {}", payroll.getId());

        try {
            String title = String.format("Overtime Review Finalized: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "Overtime review for %s/%s payroll has been finalized and locked by %s. " +
                            "No further changes can be made. Payroll has moved to Confirmed & Locked phase.",
                    formatPayrollPeriod(payroll), finalizedBy
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.SUCCESS, actionUrl, relatedEntity);
            log.info("✅ HR overtime finalization notification sent for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR overtime finalization notification: {}", e.getMessage(), e);
        }
    }

    public void notifyHROvertimeIssues(Payroll payroll, int issueCount) {
        log.info("Notifying HR about {} overtime issues for payroll {}", issueCount, payroll.getId());

        try {
            String title = String.format("Overtime Issues Found: %s Payroll", formatPayrollPeriod(payroll));
            String message = String.format(
                    "%d overtime issue(s) detected in %s/%s payroll period. " +
                            "Issues may include excessive hours, unapproved overtime, or calculation errors. " +
                            "Please review and address these issues before finalization.",
                    issueCount, formatPayrollPeriod(payroll)
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.WARNING, actionUrl, relatedEntity);
            log.info("✅ HR overtime issues notification sent for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send HR overtime issues notification: {}", e.getMessage(), e);
        }
    }

    public void notifyUserOvertimeProcessComplete(Payroll payroll, String username, int recordsProcessed) {
        try {
            String title = "Overtime Processing Complete";
            String message = String.format(
                    "Overtime review for %s/%s payroll completed successfully. Processed %d overtime record(s).",
                    formatPayrollPeriod(payroll), recordsProcessed
            );
            String relatedEntity = String.format("PAYROLL_%s_%s", formatPayrollPeriod(payroll));

            notificationService.broadcastSuccessNotification(title, message, relatedEntity);
            log.info("✅ Overtime processing completion notification sent");
        } catch (Exception e) {
            log.error("❌ Failed to send overtime processing completion notification: {}", e.getMessage(), e);
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private String buildAttendanceNotificationMessage(Payroll payroll, String requestedBy) {
        return String.format(
                "Please review the attendance data for the payroll period %s to %s. " +
                        "Ensure all attendance records are accurate before the payroll team finalizes the data. " +
                        "Current import count: %d",
                payroll.getStartDate(),
                payroll.getEndDate(),
                payroll.getAttendanceImportCount() != null ? payroll.getAttendanceImportCount() : 0
        );
    }

    // ========================================
    // FINANCE NOTIFICATION METHODS
    // ========================================

    /**
     * Notify finance team that payroll is ready for review and payment
     */
    public void notifyFinancePayrollReady(Payroll payroll, String sentBy) {
        log.info("Notifying finance team that payroll {} is ready for review", payroll.getId());

        try {
            String title = String.format("Payroll Ready for Payment: %s", formatPayrollPeriod(payroll));
            String message = String.format(
                    "The payroll for period %s to %s is ready for finance review and payment. " +
                            "Total Net Amount: %.2f. Payment Source: %s (%s). " +
                            "Sent by: %s. Please review and process the payment.",
                    payroll.getStartDate(),
                    payroll.getEndDate(),
                    payroll.getTotalNetAmount(),
                    payroll.getPaymentSourceName() != null ? payroll.getPaymentSourceName() : "Not specified",
                    payroll.getPaymentSourceType() != null ? payroll.getPaymentSourceType() : "N/A",
                    sentBy
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = getPayrollIdentifier(payroll);

            notificationService.sendNotificationToFinanceUsers(title, message, NotificationType.INFO, actionUrl, relatedEntity);
            log.info("✅ Finance notification sent successfully for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send finance notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send finance notification", e);
        }
    }

    /**
     * Notify HR that payroll has been paid
     */
    public void notifyPayrollPaid(Payroll payroll, String paidBy) {
        log.info("Notifying that payroll {} has been paid", payroll.getId());

        try {
            String title = String.format("Payroll Paid: %s", formatPayrollPeriod(payroll));
            String message = String.format(
                    "The payroll for period %s to %s has been marked as PAID by %s. " +
                            "Total Net Amount: %.2f. Employees: %d.",
                    payroll.getStartDate(),
                    payroll.getEndDate(),
                    paidBy,
                    payroll.getTotalNetAmount(),
                    payroll.getEmployeeCount()
            );
            String actionUrl = String.format("/payroll/%s", payroll.getId());
            String relatedEntity = getPayrollIdentifier(payroll);

            notificationService.sendNotificationToHRUsers(title, message, NotificationType.SUCCESS, actionUrl, relatedEntity);
            log.info("✅ Payroll paid notification sent for payroll {}", payroll.getId());
        } catch (Exception e) {
            log.error("❌ Failed to send payroll paid notification: {}", e.getMessage(), e);
        }
    }
}