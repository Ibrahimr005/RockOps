package com.example.backend.models.procurement.Logistics;

public enum LogisticsStatus {
    PENDING_APPROVAL,  // Waiting for finance approval
    PENDING_PAYMENT,   // Approved, waiting for payment
    COMPLETED          // Fully paid or rejected
}