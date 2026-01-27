package com.example.backend.models.finance.loans.enums;

public enum CompanyLoanStatus {
    ACTIVE,         // Loan is running, installments being paid
    COMPLETED,      // All installments paid, loan closed
    DEFAULTED,      // Missed too many payments (manual status change)
    CANCELLED       // Loan was cancelled
}