package com.example.backend.models.finance.refunds;

public enum RefundStatus {
    PENDING("Pending - Awaiting refund from supplier"),
    CONFIRMED("Confirmed - Refund received and recorded");

    private final String displayName;

    RefundStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}