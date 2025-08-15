package com.example.backend.models.finance.bankReconciliation;

public enum DiscrepancyStatus {
    OPEN,           // Newly identified, not yet assigned
    IN_PROGRESS,    // Someone is investigating
    RESOLVED,       // Investigation complete, solution found
    CLOSED          // Discrepancy is closed (resolved or determined to be non-issue)
}