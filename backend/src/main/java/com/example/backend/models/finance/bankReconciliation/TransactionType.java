package com.example.backend.models.finance.bankReconciliation;

public enum TransactionType {
    // Money coming in
    DEPOSIT,           // Cash/check deposits
    CLIENT_PAYMENT,    // Payment from clients
    BANK_INTEREST,     // Interest earned
    REFUND,           // Refunds received
    TRANSFER_IN,      // Money transferred in from another account

    // Money going out
    CHECK,            // Checks written
    VENDOR_PAYMENT,   // Payments to vendors/suppliers
    BANK_FEE,         // Bank charges and fees
    WITHDRAWAL,       // Cash withdrawals
    TRANSFER_OUT,     // Money transferred out to another account
    ACH_PAYMENT,      // Electronic payments
    WIRE_TRANSFER,    // Wire transfers

    // Other
    ADJUSTMENT,       // Manual adjustments
    OTHER            // Miscellaneous transactions
}