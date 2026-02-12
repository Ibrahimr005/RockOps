package com.example.backend.models.payroll;

public enum PayrollStatus {
    // HR Workflow Phases
    PUBLIC_HOLIDAYS_REVIEW(1, "Public Holidays Review", "Identify and mark public holidays in the payroll period"),
    ATTENDANCE_IMPORT(2, "Attendance Import", "Import and snapshot attendance data"),
    LEAVE_REVIEW(3, "Leave Review", "Review and process employee leave requests"),
    OVERTIME_REVIEW(4, "Overtime Review", "Review and approve overtime hours"),
    BONUS_REVIEW(5, "Bonus Review", "Review and confirm employee bonuses"),
    DEDUCTION_REVIEW(6, "Deduction Review", "Review and confirm all deductions including loans"),
    CONFIRMED_AND_LOCKED(7, "Confirmed and Locked", "Payroll calculations finalized and locked"),

    // Finance Workflow Phases
    PENDING_FINANCE_REVIEW(8, "Pending Finance Review", "Awaiting finance team to review and approve payment batches"),
    FINANCE_APPROVED(9, "Finance Approved", "Finance has approved all payment batches"),
    FINANCE_REJECTED(10, "Finance Rejected", "Finance has rejected one or more batches, requires HR review"),
    PARTIALLY_PAID(11, "Partially Paid", "Some payment batches have been processed"),
    PAID(12, "Paid", "All payroll batches processed and paid to employees");

    private final int order;
    private final String displayName;
    private final String description;

    PayrollStatus(int order, String displayName, String description) {
        this.order = order;
        this.displayName = displayName;
        this.description = description;
    }

    public int getOrder() {
        return order;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Get the next status in the standard HR workflow.
     * For finance statuses, transitions depend on batch actions.
     */
    public PayrollStatus next() {
        switch (this) {
            case PUBLIC_HOLIDAYS_REVIEW: return ATTENDANCE_IMPORT;
            case ATTENDANCE_IMPORT: return LEAVE_REVIEW;
            case LEAVE_REVIEW: return OVERTIME_REVIEW;
            case OVERTIME_REVIEW: return BONUS_REVIEW;
            case BONUS_REVIEW: return DEDUCTION_REVIEW;
            case DEDUCTION_REVIEW: return CONFIRMED_AND_LOCKED;
            case CONFIRMED_AND_LOCKED: return PENDING_FINANCE_REVIEW;
            case PENDING_FINANCE_REVIEW: return FINANCE_APPROVED;
            case FINANCE_APPROVED: return PAID;
            case PARTIALLY_PAID: return PAID;
            default: throw new IllegalStateException("Cannot transition from " + this);
        }
    }

    public boolean canTransitionTo(PayrollStatus target) {
        // Standard sequential transitions
        if (target.order == this.order + 1) {
            return true;
        }

        // Special transitions for finance workflow
        switch (this) {
            case PENDING_FINANCE_REVIEW:
                return target == FINANCE_APPROVED || target == FINANCE_REJECTED;
            case FINANCE_REJECTED:
                // Can go back to CONFIRMED_AND_LOCKED for HR to review and resend
                return target == CONFIRMED_AND_LOCKED;
            case FINANCE_APPROVED:
                return target == PARTIALLY_PAID || target == PAID;
            case PARTIALLY_PAID:
                return target == PAID;
            default:
                return false;
        }
    }

    /**
     * Check if this status is in the HR workflow phase
     */
    public boolean isHrPhase() {
        return this.order <= CONFIRMED_AND_LOCKED.order;
    }

    /**
     * Check if this status is in the Finance workflow phase
     */
    public boolean isFinancePhase() {
        return this.order > CONFIRMED_AND_LOCKED.order;
    }

    /**
     * Check if payroll is editable (HR phases including CONFIRMED_AND_LOCKED)
     * Payroll is locked once it reaches PENDING_FINANCE_REVIEW
     */
    public boolean isEditable() {
        return this.order <= CONFIRMED_AND_LOCKED.order;
    }
}
