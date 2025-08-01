package com.example.backend.models.finance.bankReconciliation;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "discrepancies")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Discrepancy {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Which bank account this discrepancy relates to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_account_id", nullable = false)
    @NotNull(message = "Bank account is required")
    private BankAccount bankAccount;

    // Related internal transaction (if applicable)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "internal_transaction_id")
    private InternalTransaction internalTransaction;

    // Related bank statement entry (if applicable)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_statement_entry_id")
    private BankStatementEntry bankStatementEntry;

    // Type of discrepancy
    @Enumerated(EnumType.STRING)
    @Column(name = "discrepancy_type", nullable = false)
    @NotNull(message = "Discrepancy type is required")
    private DiscrepancyType discrepancyType;

    // Amount of the discrepancy (difference between expected and actual)
    @Column(name = "amount")
    private BigDecimal amount;

    // Description of the discrepancy
    @Column(name = "description", nullable = false, length = 1000)
    @NotBlank(message = "Description is required")
    private String description;

    // Why this discrepancy occurred (reason)
    @Column(name = "reason", length = 1000)
    private String reason;

    // Current status of the discrepancy
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DiscrepancyStatus status = DiscrepancyStatus.OPEN;

    // Priority level for investigation
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private DiscrepancyPriority priority = DiscrepancyPriority.MEDIUM;

    // Who is assigned to investigate this discrepancy
    @Column(name = "assigned_to")
    private String assignedTo;

    // Investigation notes
    @Column(name = "investigation_notes", length = 2000)
    private String investigationNotes;

    // Resolution details
    @Column(name = "resolution", length = 1000)
    private String resolution;

    // When this discrepancy was identified
    @Column(name = "identified_at", nullable = false)
    private LocalDateTime identifiedAt = LocalDateTime.now();

    // Who identified this discrepancy
    @Column(name = "identified_by", nullable = false)
    private String identifiedBy;

    // When this discrepancy was assigned
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    // When this discrepancy was resolved
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    // Who resolved this discrepancy
    @Column(name = "resolved_by")
    private String resolvedBy;

    // Audit fields
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper method to assign discrepancy to someone
    public void assignTo(String assignee) {
        this.assignedTo = assignee;
        this.assignedAt = LocalDateTime.now();
        this.status = DiscrepancyStatus.IN_PROGRESS;
    }

    // Helper method to resolve discrepancy
    public void resolve(String resolution, String resolvedBy) {
        this.resolution = resolution;
        this.resolvedBy = resolvedBy;
        this.resolvedAt = LocalDateTime.now();
        this.status = DiscrepancyStatus.RESOLVED;
    }

    // Helper method to close discrepancy
    public void close() {
        this.status = DiscrepancyStatus.CLOSED;
    }
}