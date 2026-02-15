package com.example.backend.models.procurement.Logistics;

public enum LogisticsPaymentStatus {
    PENDING,    // Payment not yet approved
    APPROVED,   // Approved, ready to pay
    PAID,       // Fully paid
    REJECTED    // Payment rejected
}