package com.example.backend.models.equipment;

public enum MaintenanceStatus {
    DRAFT,
    PENDING_MANAGER_APPROVAL,
    PENDING_FINANCE_APPROVAL,
    APPROVED_BY_FINANCE,
    ACTIVE,
    COMPLETED,
    REJECTED,
    CANCELLED,
    ON_HOLD
}