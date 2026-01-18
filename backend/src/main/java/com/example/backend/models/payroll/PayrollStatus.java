package com.example.backend.models.payroll;

public enum PayrollStatus {
    PUBLIC_HOLIDAYS_REVIEW(1, "Public Holidays Review", "Identify and mark public holidays in the payroll period"),
    ATTENDANCE_IMPORT(2, "Attendance Import", "Import and snapshot attendance data"),
    LEAVE_REVIEW(3, "Leave Review", "Review and process employee leave requests"),
    OVERTIME_REVIEW(4, "Overtime Review", "Review and approve overtime hours"),
    CONFIRMED_AND_LOCKED(5, "Confirmed and Locked", "Payroll calculations finalized and locked"),
    PENDING_FINANCE_REVIEW(6, "Pending Finance Review", "Awaiting finance team to review and approve payment"),
    PAID(7, "Paid", "Payroll processed and paid to employees");
    
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
    
    public PayrollStatus next() {
        switch (this) {
            case PUBLIC_HOLIDAYS_REVIEW: return ATTENDANCE_IMPORT;
            case ATTENDANCE_IMPORT: return LEAVE_REVIEW;
            case LEAVE_REVIEW: return OVERTIME_REVIEW;
            case OVERTIME_REVIEW: return CONFIRMED_AND_LOCKED;
            case CONFIRMED_AND_LOCKED: return PENDING_FINANCE_REVIEW;
            case PENDING_FINANCE_REVIEW: return PAID;
            default: throw new IllegalStateException("Cannot transition from " + this);
        }
    }
    
    public boolean canTransitionTo(PayrollStatus target) {
        return target.order == this.order + 1;
    }
}