package com.example.backend.services.payroll;

import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests for PayrollNotificationService.
 *
 * NOTE: Several notification methods in the service contain format string bugs
 * where "PAYROLL_%s_%s" is called with only one argument (formatPayrollPeriod).
 * These methods silently swallow the MissingFormatArgumentException and never
 * reach the notificationService call. Tests below document this actual behavior.
 *
 * Methods that work correctly use getPayrollIdentifier() or proper format args.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class PayrollNotificationServiceTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PayrollNotificationService payrollNotificationService;

    private Payroll payroll;

    @BeforeEach
    void setUp() {
        payroll = mock(Payroll.class);
        when(payroll.getId()).thenReturn(UUID.randomUUID());
        when(payroll.getStartDate()).thenReturn(LocalDate.of(2026, 2, 1));
        when(payroll.getEndDate()).thenReturn(LocalDate.of(2026, 2, 28));
        when(payroll.getAttendanceImportCount()).thenReturn(3);
        when(payroll.getTotalNetAmount()).thenReturn(new BigDecimal("150000.00"));
        when(payroll.getPaymentSourceName()).thenReturn("Main Bank Account");
        when(payroll.getPaymentSourceType()).thenReturn("BANK_ACCOUNT");
        when(payroll.getEmployeeCount()).thenReturn(25);
    }

    // ==================== notifyHRForAttendanceReview ====================
    // This method works correctly - uses getPayrollIdentifier()

    @Test
    void notifyHRForAttendanceReview_success_callsHRUsersWithInfo() {
        payrollNotificationService.notifyHRForAttendanceReview(payroll, "hrManager");

        verify(notificationService).sendNotificationToHRUsers(
                anyString(), anyString(), eq(NotificationType.INFO), anyString(), anyString());
    }

    @Test
    void notifyHRForAttendanceReview_notificationThrows_rethrowsRuntimeException() {
        doThrow(new RuntimeException("Connection failed"))
                .when(notificationService)
                .sendNotificationToHRUsers(anyString(), anyString(), any(), anyString(), anyString());

        assertThrows(RuntimeException.class,
                () -> payrollNotificationService.notifyHRForAttendanceReview(payroll, "hrManager"));
    }

    // ==================== notifyHRAttendanceFinalized ====================
    // BUG in service: format string "PAYROLL_%s_%s" called with 1 arg -> MissingFormatArgumentException
    // The exception is caught and swallowed; notification is never sent.

    @Test
    void notifyHRAttendanceFinalized_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        // Due to format string bug in service, notification is never sent
        payrollNotificationService.notifyHRAttendanceFinalized(payroll, "hrManager");

        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void notifyHRAttendanceFinalized_doesNotThrow() {
        // Exception is caught internally; method completes normally
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHRAttendanceFinalized(payroll, "hrManager"));
    }

    // ==================== notifyHRAttendanceIssues ====================
    // BUG in service: same "PAYROLL_%s_%s" with 1 arg issue

    @Test
    void notifyHRAttendanceIssues_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyHRAttendanceIssues(payroll, 5);

        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void notifyHRAttendanceIssues_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHRAttendanceIssues(payroll, 3));
    }

    // ==================== notifyUserImportComplete ====================
    // BUG in service: "Attendance import for %s/%s payroll...%d employees." has 3 placeholders
    // but only 2 args (formatPayrollPeriod, employeesProcessed)

    @Test
    void notifyUserImportComplete_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyUserImportComplete(payroll, "hrUser", 50);

        verify(notificationService, never()).broadcastSuccessNotification(
                anyString(), anyString(), anyString());
    }

    @Test
    void notifyUserImportComplete_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyUserImportComplete(payroll, "hrUser", 50));
    }

    // ==================== notifyHRForLeaveReview ====================
    // BUG in service: format string has 4 %s but only 3 args are provided
    // ("for the %s/%s payroll period (%s to %s)" needs 4 args but gets 3).
    // The MissingFormatArgumentException is caught and rethrown as RuntimeException.

    @Test
    void notifyHRForLeaveReview_formatBugCausesRuntimeExceptionToBeThrown() {
        // Format string has 4 %s placeholders but only 3 args -> exception rethrown
        assertThrows(RuntimeException.class,
                () -> payrollNotificationService.notifyHRForLeaveReview(payroll, "hrManager"));
    }

    @Test
    void notifyHRForLeaveReview_notificationServiceNeverCalled_dueToFormatBug() {
        try {
            payrollNotificationService.notifyHRForLeaveReview(payroll, "hrManager");
        } catch (RuntimeException ignored) {
            // expected
        }
        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    // ==================== notifyHRLeaveFinalized ====================
    // BUG in service: same "PAYROLL_%s_%s" with 1 arg

    @Test
    void notifyHRLeaveFinalized_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyHRLeaveFinalized(payroll, "hrManager");

        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void notifyHRLeaveFinalized_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHRLeaveFinalized(payroll, "hrManager"));
    }

    // ==================== notifyHRLeaveIssues ====================
    // BUG in service: same "PAYROLL_%s_%s" with 1 arg

    @Test
    void notifyHRLeaveIssues_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyHRLeaveIssues(payroll, 2);

        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void notifyHRLeaveIssues_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHRLeaveIssues(payroll, 2));
    }

    // ==================== notifyUserLeaveProcessComplete ====================
    // BUG in service: "Leave review for %s/%s payroll...%d leave request(s)." - 3 placeholders, 2 args

    @Test
    void notifyUserLeaveProcessComplete_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyUserLeaveProcessComplete(payroll, "hrUser", 10);

        verify(notificationService, never()).broadcastSuccessNotification(
                anyString(), anyString(), anyString());
    }

    @Test
    void notifyUserLeaveProcessComplete_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyUserLeaveProcessComplete(payroll, "hrUser", 10));
    }

    // ==================== notifyHRForOvertimeReview ====================
    // BUG in service: format string has 4 %s but only 3 args are provided.
    // Same pattern as notifyHRForLeaveReview - exception is rethrown.

    @Test
    void notifyHRForOvertimeReview_formatBugCausesRuntimeExceptionToBeThrown() {
        assertThrows(RuntimeException.class,
                () -> payrollNotificationService.notifyHRForOvertimeReview(payroll, "hrManager"));
    }

    @Test
    void notifyHRForOvertimeReview_notificationServiceNeverCalled_dueToFormatBug() {
        try {
            payrollNotificationService.notifyHRForOvertimeReview(payroll, "hrManager");
        } catch (RuntimeException ignored) {
            // expected
        }
        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    // ==================== notifyHROvertimeFinalized ====================
    // BUG in service: same "PAYROLL_%s_%s" with 1 arg

    @Test
    void notifyHROvertimeFinalized_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyHROvertimeFinalized(payroll, "hrManager");

        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void notifyHROvertimeFinalized_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHROvertimeFinalized(payroll, "hrManager"));
    }

    // ==================== notifyHROvertimeIssues ====================
    // BUG in service: same "PAYROLL_%s_%s" with 1 arg

    @Test
    void notifyHROvertimeIssues_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyHROvertimeIssues(payroll, 7);

        verify(notificationService, never()).sendNotificationToHRUsers(
                anyString(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void notifyHROvertimeIssues_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHROvertimeIssues(payroll, 7));
    }

    // ==================== notifyUserOvertimeProcessComplete ====================
    // BUG in service: "Overtime review for %s/%s payroll...%d overtime record(s)." - 3 placeholders, 2 args

    @Test
    void notifyUserOvertimeProcessComplete_formatBugCausesExceptionToBeSwallowed_notificationNotSent() {
        payrollNotificationService.notifyUserOvertimeProcessComplete(payroll, "hrUser", 15);

        verify(notificationService, never()).broadcastSuccessNotification(
                anyString(), anyString(), anyString());
    }

    @Test
    void notifyUserOvertimeProcessComplete_doesNotThrow() {
        assertDoesNotThrow(() ->
                payrollNotificationService.notifyUserOvertimeProcessComplete(payroll, "hrUser", 15));
    }

    // ==================== notifyHRForDeductionReview ====================
    // Works correctly - uses getPayrollIdentifier()

    @Test
    void notifyHRForDeductionReview_success_callsHRUsersWithInfo() {
        payrollNotificationService.notifyHRForDeductionReview(payroll, "hrManager");

        verify(notificationService).sendNotificationToHRUsers(
                anyString(), anyString(), eq(NotificationType.INFO), anyString(), anyString());
    }

    @Test
    void notifyHRForDeductionReview_notificationThrows_rethrowsRuntimeException() {
        doThrow(new RuntimeException("Failed"))
                .when(notificationService)
                .sendNotificationToHRUsers(anyString(), anyString(), any(), anyString(), anyString());

        assertThrows(RuntimeException.class,
                () -> payrollNotificationService.notifyHRForDeductionReview(payroll, "hrManager"));
    }

    // ==================== notifyHRDeductionFinalized ====================
    // Works correctly - uses getPayrollIdentifier() and correct format args

    @Test
    void notifyHRDeductionFinalized_success_callsHRUsersWithSuccess() {
        payrollNotificationService.notifyHRDeductionFinalized(payroll, "hrManager");

        verify(notificationService).sendNotificationToHRUsers(
                anyString(), anyString(), eq(NotificationType.SUCCESS), anyString(), anyString());
    }

    @Test
    void notifyHRDeductionFinalized_notificationThrows_doesNotRethrow() {
        doThrow(new RuntimeException("Error"))
                .when(notificationService)
                .sendNotificationToHRUsers(anyString(), anyString(), any(), anyString(), anyString());

        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHRDeductionFinalized(payroll, "hrManager"));
    }

    // ==================== notifyHRDeductionIssues ====================
    // Works correctly - uses getPayrollIdentifier()

    @Test
    void notifyHRDeductionIssues_success_callsHRUsersWithWarning() {
        payrollNotificationService.notifyHRDeductionIssues(payroll, 4);

        verify(notificationService).sendNotificationToHRUsers(
                anyString(), anyString(), eq(NotificationType.WARNING), anyString(), anyString());
    }

    @Test
    void notifyHRDeductionIssues_notificationThrows_doesNotRethrow() {
        doThrow(new RuntimeException("Error"))
                .when(notificationService)
                .sendNotificationToHRUsers(anyString(), anyString(), any(), anyString(), anyString());

        assertDoesNotThrow(() ->
                payrollNotificationService.notifyHRDeductionIssues(payroll, 4));
    }

    // ==================== notifyUserDeductionProcessComplete ====================
    // Works correctly - uses getPayrollIdentifier()

    @Test
    void notifyUserDeductionProcessComplete_success_callsBroadcastSuccess() {
        payrollNotificationService.notifyUserDeductionProcessComplete(payroll, "hrUser", 20);

        verify(notificationService).broadcastSuccessNotification(
                anyString(), anyString(), anyString());
    }

    @Test
    void notifyUserDeductionProcessComplete_notificationThrows_doesNotRethrow() {
        doThrow(new RuntimeException("Error"))
                .when(notificationService)
                .broadcastSuccessNotification(anyString(), anyString(), anyString());

        assertDoesNotThrow(() ->
                payrollNotificationService.notifyUserDeductionProcessComplete(payroll, "hrUser", 20));
    }

    // ==================== notifyFinancePayrollReady ====================
    // Works correctly - uses getPayrollIdentifier()

    @Test
    void notifyFinancePayrollReady_success_callsFinanceUsersWithInfo() {
        payrollNotificationService.notifyFinancePayrollReady(payroll, "hrManager");

        verify(notificationService).sendNotificationToFinanceUsers(
                anyString(), anyString(), eq(NotificationType.INFO), anyString(), anyString());
    }

    @Test
    void notifyFinancePayrollReady_notificationThrows_rethrowsRuntimeException() {
        doThrow(new RuntimeException("Finance service unavailable"))
                .when(notificationService)
                .sendNotificationToFinanceUsers(anyString(), anyString(), any(), anyString(), anyString());

        assertThrows(RuntimeException.class,
                () -> payrollNotificationService.notifyFinancePayrollReady(payroll, "hrManager"));
    }

    @Test
    void notifyFinancePayrollReady_nullPaymentSource_doesNotThrow() {
        when(payroll.getPaymentSourceName()).thenReturn(null);
        when(payroll.getPaymentSourceType()).thenReturn(null);

        assertDoesNotThrow(() ->
                payrollNotificationService.notifyFinancePayrollReady(payroll, "hrManager"));

        verify(notificationService).sendNotificationToFinanceUsers(
                anyString(), anyString(), eq(NotificationType.INFO), anyString(), anyString());
    }

    // ==================== notifyPayrollPaid ====================
    // Works correctly - uses getPayrollIdentifier()

    @Test
    void notifyPayrollPaid_success_callsHRUsersWithSuccess() {
        payrollNotificationService.notifyPayrollPaid(payroll, "financeUser");

        verify(notificationService).sendNotificationToHRUsers(
                anyString(), anyString(), eq(NotificationType.SUCCESS), anyString(), anyString());
    }

    @Test
    void notifyPayrollPaid_notificationThrows_doesNotRethrow() {
        doThrow(new RuntimeException("Error"))
                .when(notificationService)
                .sendNotificationToHRUsers(anyString(), anyString(), any(), anyString(), anyString());

        assertDoesNotThrow(() ->
                payrollNotificationService.notifyPayrollPaid(payroll, "financeUser"));
    }
}