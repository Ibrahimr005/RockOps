package com.example.backend.models.finance.bankReconciliation;

import jakarta.persistence.*;
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
@Table(name = "bank_statement_entries")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BankStatementEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Which bank account this entry belongs to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_account_id", nullable = false)
    @NotNull(message = "Bank account is required")
    private BankAccount bankAccount;

    // Amount from bank statement (positive = credit, negative = debit)
    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    // Date when transaction occurred according to bank
    @Column(name = "transaction_date", nullable = false)
    @NotNull(message = "Transaction date is required")
    private LocalDate transactionDate;

    // Description from bank statement
    // Example: "CHECK 1001", "DEP MOBILE", "ACH CREDIT ABC COMPANY"
    @Column(name = "bank_description", nullable = false, length = 500)
    @NotBlank(message = "Bank description is required")
    private String bankDescription;

    // Reference number from bank (if any)
    // Example: Check number, confirmation number, etc.
    @Column(name = "bank_reference", length = 100)
    private String bankReference;

    // Category assigned by bank
    // Example: "CHECK", "DEPOSIT", "FEE", "TRANSFER"
    @Column(name = "bank_category", length = 50)
    private String bankCategory;

    // Whether this entry has been matched with an internal transaction
    @Column(name = "is_matched", nullable = false)
    private Boolean isMatched = false;

    // When it was matched (if applicable)
    @Column(name = "matched_at")
    private LocalDateTime matchedAt;

    // Who matched it
    @Column(name = "matched_by")
    private String matchedBy;

    // Running balance from bank statement (optional)
    @Column(name = "running_balance", precision = 15, scale = 2)
    private BigDecimal runningBalance;

    // When this entry was imported into the system
    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt = LocalDateTime.now();

    // Who imported this entry
    @Column(name = "imported_by", nullable = false)
    private String importedBy;

    // Audit fields
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper method to mark as matched
    public void markAsMatched(String matchedBy) {
        this.isMatched = true;
        this.matchedAt = LocalDateTime.now();
        this.matchedBy = matchedBy;
    }

    // Helper method to check if this is money coming in
    public boolean isCredit() {
        return amount.compareTo(BigDecimal.ZERO) > 0;
    }

    // Helper method to check if this is money going out
    public boolean isDebit() {
        return amount.compareTo(BigDecimal.ZERO) < 0;
    }
}