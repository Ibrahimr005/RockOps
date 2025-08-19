package com.example.backend.models.procurement;

public enum TimelineEventType {
    // Core workflow events
    REQUEST_APPROVED("Request Order Approved", "The request order was approved and is ready for offers"),
    OFFER_SUBMITTED("Offer Submitted", "Offer submitted for manager review"),
    MANAGER_ACCEPTED("Manager Accepted", "Offer accepted by manager"),
    MANAGER_REJECTED("Manager Rejected", "Offer rejected by manager"),

    // Retry events
    OFFER_RETRIED("Offer Retried", "Offer was retried after rejection"),

    // Finance events
    FINANCE_PROCESSING("Finance Processing", "Offer sent to finance for review"),
    FINANCE_ACCEPTED("Finance Accepted", "Offer approved by finance"),
    FINANCE_REJECTED("Finance Rejected", "Offer rejected by finance"),
    FINANCE_PARTIALLY_ACCEPTED("Finance Partially Accepted", "Offer partially approved by finance"),

    // Final stages
    OFFER_FINALIZING("Offer Finalizing", "Offer is being finalized"),
    OFFER_FINALIZED("Offer Finalized", "Offer finalization completed"),
    OFFER_COMPLETED("Offer Completed", "Offer completed and purchase order created");

    private final String displayName;
    private final String description;

    TimelineEventType(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    // Helper methods to categorize event types
    public boolean isSubmissionEvent() {
        return this == OFFER_SUBMITTED;
    }

    public boolean isRejectionEvent() {
        return this == MANAGER_REJECTED || this == FINANCE_REJECTED;
    }

    public boolean isAcceptanceEvent() {
        return this == MANAGER_ACCEPTED || this == FINANCE_ACCEPTED || this == FINANCE_PARTIALLY_ACCEPTED;
    }

    public boolean isRetryEvent() {
        return this == OFFER_RETRIED;
    }
}