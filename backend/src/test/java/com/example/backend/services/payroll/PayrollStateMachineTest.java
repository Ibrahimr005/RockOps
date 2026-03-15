package com.example.backend.services.payroll;

import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class PayrollStateMachineTest {

    @InjectMocks
    private PayrollStateMachine payrollStateMachine;

    private Payroll buildPayroll(PayrollStatus status) {
        return Payroll.builder()
                .id(UUID.randomUUID())
                .payrollNumber("PRL-2026-000001")
                .startDate(LocalDate.of(2026, 2, 1))
                .endDate(LocalDate.of(2026, 2, 28))
                .status(status)
                .createdBy("admin")
                .build();
    }

    // ==================== validateTransition ====================

    @Test
    void validateTransition_sameStatus_throwsIllegalStateTransitionException() {
        assertThrows(PayrollStateMachine.IllegalStateTransitionException.class,
                () -> payrollStateMachine.validateTransition(
                        PayrollStatus.PUBLIC_HOLIDAYS_REVIEW, PayrollStatus.PUBLIC_HOLIDAYS_REVIEW));
    }

    @Test
    void validateTransition_invalidTransition_throwsIllegalStateTransitionException() {
        // Cannot jump from PUBLIC_HOLIDAYS_REVIEW to OVERTIME_REVIEW
        assertThrows(PayrollStateMachine.IllegalStateTransitionException.class,
                () -> payrollStateMachine.validateTransition(
                        PayrollStatus.PUBLIC_HOLIDAYS_REVIEW, PayrollStatus.OVERTIME_REVIEW));
    }

    @Test
    void validateTransition_validSequentialTransition_doesNotThrow() {
        assertDoesNotThrow(() -> payrollStateMachine.validateTransition(
                PayrollStatus.PUBLIC_HOLIDAYS_REVIEW, PayrollStatus.ATTENDANCE_IMPORT));
    }

    @Test
    void validateTransition_financeRejectedToConfirmedAndLocked_isValid() {
        assertDoesNotThrow(() -> payrollStateMachine.validateTransition(
                PayrollStatus.FINANCE_REJECTED, PayrollStatus.CONFIRMED_AND_LOCKED));
    }

    @Test
    void validateTransition_pendingFinanceReviewToFinanceApproved_isValid() {
        assertDoesNotThrow(() -> payrollStateMachine.validateTransition(
                PayrollStatus.PENDING_FINANCE_REVIEW, PayrollStatus.FINANCE_APPROVED));
    }

    @Test
    void validateTransition_pendingFinanceReviewToFinanceRejected_isValid() {
        assertDoesNotThrow(() -> payrollStateMachine.validateTransition(
                PayrollStatus.PENDING_FINANCE_REVIEW, PayrollStatus.FINANCE_REJECTED));
    }

    @Test
    void validateTransition_financeApprovedToPartiallyPaid_isValid() {
        assertDoesNotThrow(() -> payrollStateMachine.validateTransition(
                PayrollStatus.FINANCE_APPROVED, PayrollStatus.PARTIALLY_PAID));
    }

    @Test
    void validateTransition_financeApprovedToPaid_isValid() {
        assertDoesNotThrow(() -> payrollStateMachine.validateTransition(
                PayrollStatus.FINANCE_APPROVED, PayrollStatus.PAID));
    }

    @Test
    void validateTransition_partiallyPaidToPaid_isValid() {
        assertDoesNotThrow(() -> payrollStateMachine.validateTransition(
                PayrollStatus.PARTIALLY_PAID, PayrollStatus.PAID));
    }

    // ==================== canTransition ====================

    @Test
    void canTransition_validNextStatus_returnsTrue() {
        Payroll payroll = buildPayroll(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW);

        assertTrue(payrollStateMachine.canTransition(payroll, PayrollStatus.ATTENDANCE_IMPORT));
    }

    @Test
    void canTransition_invalidStatus_returnsFalse() {
        Payroll payroll = buildPayroll(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW);

        assertFalse(payrollStateMachine.canTransition(payroll, PayrollStatus.PAID));
    }

    @Test
    void canTransition_sameStatus_returnsFalse() {
        Payroll payroll = buildPayroll(PayrollStatus.ATTENDANCE_IMPORT);

        assertFalse(payrollStateMachine.canTransition(payroll, PayrollStatus.ATTENDANCE_IMPORT));
    }

    // ==================== transitionToNext ====================

    @Test
    void transitionToNext_validTransition_updatesStatus() {
        Payroll payroll = buildPayroll(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW);

        payrollStateMachine.transitionToNext(payroll, "admin");

        assertEquals(PayrollStatus.ATTENDANCE_IMPORT, payroll.getStatus());
    }

    @Test
    void transitionToNext_toConfirmedAndLocked_setsLockedAtAndLockedBy() {
        Payroll payroll = buildPayroll(PayrollStatus.DEDUCTION_REVIEW);

        payrollStateMachine.transitionToNext(payroll, "lockUser");

        assertEquals(PayrollStatus.CONFIRMED_AND_LOCKED, payroll.getStatus());
        assertNotNull(payroll.getLockedAt());
        assertEquals("lockUser", payroll.getLockedBy());
    }

    @Test
    void transitionToNext_toPaid_setsPaidAtAndPaidBy() {
        Payroll payroll = buildPayroll(PayrollStatus.FINANCE_APPROVED);

        payrollStateMachine.transitionToNext(payroll, "financeUser");

        assertEquals(PayrollStatus.PAID, payroll.getStatus());
        assertNotNull(payroll.getPaidAt());
        assertEquals("financeUser", payroll.getPaidBy());
    }

    @Test
    void transitionToNext_paidStatus_throwsBecausePaidHasNoNext() {
        // PayrollStatus.PAID has no next() - it throws IllegalStateException from the enum
        // which then propagates up (it is not caught and rewrapped as IllegalStateTransitionException)
        Payroll payroll = buildPayroll(PayrollStatus.PAID);

        // PAID.next() throws IllegalStateException from the enum switch default case
        assertThrows(IllegalStateException.class,
                () -> payrollStateMachine.transitionToNext(payroll, "admin"));
    }

    // ==================== transitionTo ====================

    @Test
    void transitionTo_validTransition_updatesStatus() {
        Payroll payroll = buildPayroll(PayrollStatus.PENDING_FINANCE_REVIEW);

        payrollStateMachine.transitionTo(payroll, PayrollStatus.FINANCE_APPROVED, "financeUser");

        assertEquals(PayrollStatus.FINANCE_APPROVED, payroll.getStatus());
    }

    @Test
    void transitionTo_invalidTransition_throwsIllegalStateTransitionException() {
        Payroll payroll = buildPayroll(PayrollStatus.ATTENDANCE_IMPORT);

        assertThrows(PayrollStateMachine.IllegalStateTransitionException.class,
                () -> payrollStateMachine.transitionTo(payroll, PayrollStatus.CONFIRMED_AND_LOCKED, "admin"));
    }

    // ==================== validateNotLocked ====================

    @Test
    void validateNotLocked_lockedPayroll_throwsPayrollLockedException() {
        // Payroll is locked when status is CONFIRMED_AND_LOCKED, PENDING_FINANCE_REVIEW, or PAID
        Payroll payroll = buildPayroll(PayrollStatus.CONFIRMED_AND_LOCKED);
        payroll.setLockedAt(LocalDateTime.now());
        payroll.setLockedBy("admin");

        assertThrows(PayrollStateMachine.PayrollLockedException.class,
                () -> payrollStateMachine.validateNotLocked(payroll));
    }

    @Test
    void validateNotLocked_pendingFinanceReview_throwsPayrollLockedException() {
        Payroll payroll = buildPayroll(PayrollStatus.PENDING_FINANCE_REVIEW);
        payroll.setLockedAt(LocalDateTime.now());
        payroll.setLockedBy("admin");

        assertThrows(PayrollStateMachine.PayrollLockedException.class,
                () -> payrollStateMachine.validateNotLocked(payroll));
    }

    @Test
    void validateNotLocked_unlockedPayroll_doesNotThrow() {
        Payroll payroll = buildPayroll(PayrollStatus.ATTENDANCE_IMPORT);
        // lockedAt is null by default in builder — isLocked() returns false

        assertDoesNotThrow(() -> payrollStateMachine.validateNotLocked(payroll));
    }

    // ==================== validateNotPaid ====================

    @Test
    void validateNotPaid_paidPayroll_throwsPayrollLockedException() {
        Payroll payroll = buildPayroll(PayrollStatus.PAID);
        payroll.setPaidAt(LocalDateTime.now());
        payroll.setPaidBy("financeUser");

        assertThrows(PayrollStateMachine.PayrollLockedException.class,
                () -> payrollStateMachine.validateNotPaid(payroll));
    }

    @Test
    void validateNotPaid_notPaidPayroll_doesNotThrow() {
        Payroll payroll = buildPayroll(PayrollStatus.FINANCE_APPROVED);

        assertDoesNotThrow(() -> payrollStateMachine.validateNotPaid(payroll));
    }

    // ==================== validateStatus ====================

    @Test
    void validateStatus_matchingStatus_doesNotThrow() {
        Payroll payroll = buildPayroll(PayrollStatus.ATTENDANCE_IMPORT);

        assertDoesNotThrow(() -> payrollStateMachine.validateStatus(
                payroll, PayrollStatus.ATTENDANCE_IMPORT));
    }

    @Test
    void validateStatus_nonMatchingStatus_throwsInvalidPayrollStatusException() {
        Payroll payroll = buildPayroll(PayrollStatus.ATTENDANCE_IMPORT);

        assertThrows(PayrollStateMachine.InvalidPayrollStatusException.class,
                () -> payrollStateMachine.validateStatus(payroll, PayrollStatus.LEAVE_REVIEW));
    }

    // ==================== validateStatusIn ====================

    @Test
    void validateStatusIn_statusInList_doesNotThrow() {
        Payroll payroll = buildPayroll(PayrollStatus.OVERTIME_REVIEW);

        assertDoesNotThrow(() -> payrollStateMachine.validateStatusIn(
                payroll,
                PayrollStatus.LEAVE_REVIEW,
                PayrollStatus.OVERTIME_REVIEW,
                PayrollStatus.BONUS_REVIEW));
    }

    @Test
    void validateStatusIn_statusNotInList_throwsInvalidPayrollStatusException() {
        Payroll payroll = buildPayroll(PayrollStatus.PAID);

        assertThrows(PayrollStateMachine.InvalidPayrollStatusException.class,
                () -> payrollStateMachine.validateStatusIn(
                        payroll,
                        PayrollStatus.ATTENDANCE_IMPORT,
                        PayrollStatus.LEAVE_REVIEW));
    }

    // ==================== getNextStatus ====================

    @Test
    void getNextStatus_returnsCorrectNext() {
        Payroll payroll = buildPayroll(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW);

        PayrollStatus next = payrollStateMachine.getNextStatus(payroll);

        assertEquals(PayrollStatus.ATTENDANCE_IMPORT, next);
    }

    @Test
    void getNextStatus_deductionReview_returnsConfirmedAndLocked() {
        Payroll payroll = buildPayroll(PayrollStatus.DEDUCTION_REVIEW);

        PayrollStatus next = payrollStateMachine.getNextStatus(payroll);

        assertEquals(PayrollStatus.CONFIRMED_AND_LOCKED, next);
    }

    // ==================== isFinalStatus ====================

    @Test
    void isFinalStatus_paid_returnsTrue() {
        Payroll payroll = buildPayroll(PayrollStatus.PAID);

        assertTrue(payrollStateMachine.isFinalStatus(payroll));
    }

    @Test
    void isFinalStatus_otherStatus_returnsFalse() {
        Payroll payroll = buildPayroll(PayrollStatus.FINANCE_APPROVED);

        assertFalse(payrollStateMachine.isFinalStatus(payroll));
    }

    @Test
    void isFinalStatus_publicHolidaysReview_returnsFalse() {
        Payroll payroll = buildPayroll(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW);

        assertFalse(payrollStateMachine.isFinalStatus(payroll));
    }

    // ==================== DEDUCTION_REVIEW side effect ====================

    @Test
    void transitionToNext_toDeductionReview_setsOvertimeFinalizedWhenNotSet() {
        Payroll payroll = buildPayroll(PayrollStatus.BONUS_REVIEW);
        // overtimeFinalized is false by default

        payrollStateMachine.transitionToNext(payroll, "hrAdmin");

        assertEquals(PayrollStatus.DEDUCTION_REVIEW, payroll.getStatus());
        assertTrue(payroll.getOvertimeFinalized());
        assertEquals("hrAdmin", payroll.getOvertimeFinalizedBy());
        assertNotNull(payroll.getOvertimeFinalizedAt());
    }

    @Test
    void transitionToNext_toDeductionReview_doesNotOverrideAlreadyFinalizedOvertime() {
        Payroll payroll = buildPayroll(PayrollStatus.BONUS_REVIEW);
        payroll.setOvertimeFinalized(true);
        payroll.setOvertimeFinalizedBy("originalUser");

        payrollStateMachine.transitionToNext(payroll, "hrAdmin");

        // Should not override existing finalized overtime
        assertEquals("originalUser", payroll.getOvertimeFinalizedBy());
    }
}