package com.example.backend.models.procurement.PurchaseOrderReturn;

public enum PurchaseOrderReturnStatus {
    PENDING("Pending - Awaiting return confirmation"),
    CONFIRMED("Confirmed - Return processed"),
    REJECTED("Rejected - Return request denied");

    private final String displayName;

    PurchaseOrderReturnStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}