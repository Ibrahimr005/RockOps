package com.example.backend.models.procurement;

/**
 * Types of issues that can be reported on purchase order items
 * Used when warehouse users report problems with deliveries
 */
public enum IssueType {
    NOT_ARRIVED("Items Never Arrived"),
    WRONG_QUANTITY("Wrong Quantity Delivered"),
    DAMAGED("Items Damaged"),
    WRONG_ITEM("Wrong Items Delivered"),
    QUALITY_ISSUE("Quality Issue"),
    OTHER("Other Issue");

    private final String displayName;

    IssueType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}