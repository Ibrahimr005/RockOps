package com.example.backend.models.finance.accountsPayable;

public enum PaymentTargetType {
    MERCHANT("Merchant"),
    EMPLOYEE("Employee"),
    EMPLOYEE_GROUP("Employee Group"),
    FINANCIAL_INSTITUTION("Financial Institution");

    private final String displayName;

    PaymentTargetType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
