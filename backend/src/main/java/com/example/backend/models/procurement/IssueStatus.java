package com.example.backend.models.procurement;

/**
 * Status of a reported purchase order issue
 * Tracks the lifecycle from report to resolution
 */
public enum IssueStatus {
    REPORTED("Reported - Awaiting Resolution"),
    IN_PROGRESS("In Progress"),
    RESOLVED("Resolved"),
    CLOSED("Closed");

    private final String displayName;

    IssueStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}