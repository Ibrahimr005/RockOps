package com.example.backend.models.transaction;

public enum TransactionStatus {
    PENDING,
    DELIVERING,
    ACCEPTED,
    REJECTED,
    PARTIALLY_ACCEPTED,
    RESOLVING,
    RESOLVED
}
