// Create InvoiceStatus.java enum
package com.example.backend.models.finance.payables;

public enum InvoiceStatus {
    PENDING("Awaiting Payment"),
    PARTIALLY_PAID("Partially Paid"),
    FULLY_PAID("Fully Paid"),
    OVERDUE("Overdue"),
    CANCELLED("Cancelled");

    private final String displayName;

    InvoiceStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}