package com.example.backend.models.finance.incomingPayments;

public enum IncomingPaymentSource {
    REFUND("Refund from Issue Resolution"),
    PO_RETURN("Purchase Order Return");

    private final String displayName;

    IncomingPaymentSource(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}