package com.example.backend.models.finance.bankReconciliation;

public enum DiscrepancyPriority {
    LOW,      // Minor discrepancy, can wait
    MEDIUM,   // Normal priority
    HIGH,     // Significant amount or urgent
    CRITICAL  // Major discrepancy requiring immediate attention
}