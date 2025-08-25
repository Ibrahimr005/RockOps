package com.example.backend.dto.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.DiscrepancyPriority;
import com.example.backend.models.finance.bankReconciliation.DiscrepancyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class DiscrepancyRequestDTO {

    @NotNull(message = "Bank account ID is required")
    private UUID bankAccountId;

    private UUID internalTransactionId;
    private UUID bankStatementEntryId;

    @NotNull(message = "Discrepancy type is required")
    private DiscrepancyType discrepancyType;

    private BigDecimal amount;

    @NotBlank(message = "Description is required")
    private String description;

    private String reason;

    @NotNull(message = "Priority is required")
    private DiscrepancyPriority priority;

    private String assignedTo;
    private String investigationNotes;

    @NotBlank(message = "Identified by is required")
    private String identifiedBy;
}