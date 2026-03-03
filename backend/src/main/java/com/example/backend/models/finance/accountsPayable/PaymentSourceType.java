package com.example.backend.models.finance.accountsPayable;

public enum PaymentSourceType {
    PURCHASE_ORDER("Purchase Order"),
    MAINTENANCE("Maintenance"),
    PAYROLL_BATCH("Payroll Batch"),
    ELOAN("Employee Loan"),
    CLOAN("Company Loan"),
    BONUS("Bonus"),
    LOGISTICS("Logistics");

    private final String displayName;

    PaymentSourceType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
