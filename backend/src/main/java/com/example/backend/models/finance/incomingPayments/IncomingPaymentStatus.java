package com.example.backend.models.finance.incomingPayments;

public enum IncomingPaymentStatus {
    PENDING("Pending - Awaiting payment from supplier"),
    CONFIRMED("Confirmed - Payment received and recorded");

    private final String displayName;

    IncomingPaymentStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}