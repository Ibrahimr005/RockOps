package com.example.backend.models.finance.payables;

public enum PaymentMethod {
    CASH("Cash Payment"),
    CHECK("Check Payment"),
    BANK_TRANSFER("Bank Transfer/Wire"),
    CREDIT_CARD("Credit Card"),
    ACH("ACH Transfer");

    private final String displayName;

    PaymentMethod(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
