package com.example.backend.models.finance.loans.enums;

public enum LoanInstallmentStatus {
    PENDING,                    // Not yet due
    PAYMENT_REQUEST_CREATED,    // PaymentRequest has been generated
    PARTIALLY_PAID,             // Some amount paid
    PAID,                       // Fully paid
    OVERDUE                     // Due date passed, not fully paid
}