package com.example.backend.dto.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.DiscrepancyPriority;
import com.example.backend.models.finance.bankReconciliation.DiscrepancyStatus;
import com.example.backend.models.finance.bankReconciliation.DiscrepancyType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class DiscrepancyResponseDTO {

    private UUID id;
    private UUID bankAccountId;
    private String bankAccountName;
    private InternalTransactionResponseDTO internalTransaction;
    private BankStatementEntryResponseDTO bankStatementEntry;
    private DiscrepancyType discrepancyType;
    private BigDecimal amount;
    private String description;
    private String reason;
    private DiscrepancyStatus status;
    private DiscrepancyPriority priority;
    private String assignedTo;
    private String investigationNotes;
    private String resolution;
    private LocalDateTime identifiedAt;
    private String identifiedBy;
    private LocalDateTime assignedAt;
    private LocalDateTime resolvedAt;
    private String resolvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Helper fields
    private String formattedAmount;
    private String priorityColor; // For UI: "red", "orange", "yellow", "green"
    private String statusColor;   // For UI: "red", "yellow", "green", "gray"
    private Integer daysSinceIdentified;
    private Integer daysSinceAssigned;
    private Boolean isOverdue; // Based on priority and days open
}