package com.example.backend.models.finance.bankReconciliation;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "transaction_matches")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TransactionMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // The bank statement entry being matched
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_statement_entry_id", nullable = false)
    @NotNull(message = "Bank statement entry is required")
    private BankStatementEntry bankStatementEntry;

    // The internal transaction(s) being matched
    // Note: One bank entry might match multiple internal transactions (or vice versa)
    @ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.DETACH)
    @JoinTable(
            name = "transaction_match_internal_transactions",
            joinColumns = @JoinColumn(name = "transaction_match_id"),
            inverseJoinColumns = @JoinColumn(name = "internal_transaction_id")
    )
    private List<InternalTransaction> internalTransactions = new ArrayList<>();

    // Type of match
    @Enumerated(EnumType.STRING)
    @Column(name = "match_type", nullable = false)
    @NotNull(message = "Match type is required")
    private MatchType matchType;

    // How confident we are in this match (0.0 to 1.0)
    // 1.0 = Perfect match, 0.5 = Uncertain, 0.1 = Unlikely but possible
    @Column(name = "confidence_score")
    private Double confidenceScore;

    // Whether this match was done automatically or manually
    @Column(name = "is_automatic", nullable = false)
    private Boolean isAutomatic = false;

    // Notes about why this match was made
    @Column(name = "match_notes", length = 1000)
    private String matchNotes;

    // When this match was created
    @Column(name = "matched_at", nullable = false)
    private LocalDateTime matchedAt = LocalDateTime.now();

    // Who created this match
    @Column(name = "matched_by", nullable = false)
    private String matchedBy;

    // Whether this match has been approved/confirmed
    @Column(name = "is_confirmed", nullable = false)
    private Boolean isConfirmed = false;

    // When it was confirmed
    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    // Who confirmed it
    @Column(name = "confirmed_by")
    private String confirmedBy;

    // Audit fields
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper method to confirm the match
    public void confirmMatch(String confirmedBy) {
        this.isConfirmed = true;
        this.confirmedAt = LocalDateTime.now();
        this.confirmedBy = confirmedBy;

        // Mark the bank statement entry as matched
        this.bankStatementEntry.markAsMatched(confirmedBy);

        // Mark all internal transactions as reconciled
        for (InternalTransaction transaction : internalTransactions) {
            transaction.markAsReconciled(confirmedBy);
        }
    }

    // Helper method to add an internal transaction to this match
    public void addInternalTransaction(InternalTransaction transaction) {
        if (!internalTransactions.contains(transaction)) {
            internalTransactions.add(transaction);
        }
    }

    // Helper method to remove an internal transaction from this match
    public void removeInternalTransaction(InternalTransaction transaction) {
        internalTransactions.remove(transaction);
    }
}