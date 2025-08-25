package com.example.backend.models.finance.payables;

public enum PaymentStatus {
    PENDING("Payment Scheduled/Pending"),
    PROCESSED("Payment Completed"),
    CANCELLED("Payment Cancelled"),
    FAILED("Payment Failed");

    private final String displayName;

    PaymentStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
