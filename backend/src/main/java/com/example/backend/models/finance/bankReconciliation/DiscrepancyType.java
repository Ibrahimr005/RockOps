package com.example.backend.models.finance.bankReconciliation;

public enum DiscrepancyType {
    // Missing transactions
    MISSING_INTERNAL,         // We have bank entry but no internal transaction
    MISSING_BANK,            // We have internal transaction but no bank entry

    // Amount differences
    AMOUNT_DIFFERENCE,       // Amounts don't match between internal and bank

    // Date differences
    DATE_DIFFERENCE,         // Dates don't match (but might be same transaction)

    // Duplicate transactions
    DUPLICATE_INTERNAL,      // Same transaction recorded twice internally
    DUPLICATE_BANK,          // Same transaction appears twice on bank statement

    // Bank specific
    UNKNOWN_BANK_FEE,        // Bank charged a fee we didn't expect
    UNKNOWN_BANK_INTEREST,   // Bank paid interest we didn't record
    BANK_ERROR,              // Bank made an error

    // Internal specific
    OUTSTANDING_CHECK,       // Check was written but hasn't cleared
    DEPOSIT_IN_TRANSIT,      // Deposit made but not yet on bank statement
    DATA_ENTRY_ERROR,        // We made an error in recording

    // Other
    TIMING_DIFFERENCE,       // Transaction recorded in different periods
    OTHER                    // Other type of discrepancy
}