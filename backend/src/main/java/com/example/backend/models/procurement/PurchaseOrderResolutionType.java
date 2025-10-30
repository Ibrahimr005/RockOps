package com.example.backend.models.procurement;

public enum PurchaseOrderResolutionType {
    REDELIVERY("Re-delivery - Merchant will reship items"),
    REFUND("Refund - Issue refund for items"),
    REPLACEMENT_PO("New Purchase Order - Create new PO with different merchant"),
    ACCEPT_SHORTAGE("Accept Shortage - Accept issue and close PO");

    private final String displayName;

    PurchaseOrderResolutionType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}