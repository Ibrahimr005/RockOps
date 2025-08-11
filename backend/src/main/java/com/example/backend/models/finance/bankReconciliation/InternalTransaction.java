package com.example.backend.models.finance.bankReconciliation;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "internal_transactions")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class InternalTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Which bank account this affects
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_account_id", nullable = false)
    @NotNull(message = "Bank account is required")
    private BankAccount bankAccount;

    // Transaction amount (positive = money coming in, negative = money going out)
    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    // When you recorded this transaction
    @Column(name = "transaction_date", nullable = false)
    @NotNull(message = "Transaction date is required")
    private LocalDate transactionDate;

    // What this transaction is for
    // Example: "Check #1001 to ABC Lumber", "Client payment - Oak Street project"
    @Column(name = "description", nullable = false, length = 500)
    @NotBlank(message = "Description is required")
    private String description;

    // Reference number (check number, wire confirmation, etc.)
    // Example: "1001", "WIRE123456", "DEP-20240715"
    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    // Type of transaction
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    // Whether this transaction has been matched with a bank statement entry
    @Column(name = "is_reconciled", nullable = false)
    private Boolean isReconciled = false;

    // When it was reconciled (if applicable)
    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

    // Who reconciled it
    @Column(name = "reconciled_by")
    private String reconciledBy;

    // Audit fields
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper method to mark as reconciled
    public void markAsReconciled(String reconciledBy) {
        this.isReconciled = true;
        this.reconciledAt = LocalDateTime.now();
        this.reconciledBy = reconciledBy;
    }

    // Helper method to check if this is money coming in
    public boolean isIncoming() {
        return amount.compareTo(BigDecimal.ZERO) > 0;
    }

    // Helper method to check if this is money going out
    public boolean isOutgoing() {
        return amount.compareTo(BigDecimal.ZERO) < 0;
    }
}