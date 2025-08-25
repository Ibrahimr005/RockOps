package com.example.backend.models.finance.bankReconciliation;

public enum MatchType {
    // Perfect matches
    EXACT_MATCH,          // Amount, date, and reference all match perfectly

    // Good matches
    AMOUNT_DATE_MATCH,    // Amount and date match, description similar
    AMOUNT_REF_MATCH,     // Amount and reference match, date close

    // Acceptable matches
    AMOUNT_MATCH,         // Only amount matches, but likely the same transaction

    // Complex matches
    SPLIT_MATCH,          // One bank entry matches multiple internal transactions
    COMBINED_MATCH,       // Multiple bank entries match one internal transaction

    // Manual matches
    MANUAL_MATCH,         // Manually matched by user despite differences

    // Uncertain matches
    POSSIBLE_MATCH        // System thinks these might match, needs review
}