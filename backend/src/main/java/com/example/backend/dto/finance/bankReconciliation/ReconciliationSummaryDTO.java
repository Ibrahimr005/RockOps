package com.example.backend.dto.finance.bankReconciliation;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ReconciliationSummaryDTO {

    private UUID bankAccountId;
    private String bankAccountName;

    // Transaction counts
    private Long totalInternalTransactions;
    private Long totalBankStatementEntries;
    private Long reconciledTransactions;
    private Long unmatchedInternalTransactions;
    private Long unmatchedBankEntries;
    private Long totalMatches;
    private Long confirmedMatches;
    private Long pendingMatches;

    // Discrepancy counts
    private Long totalDiscrepancies;
    private Long openDiscrepancies;
    private Long highPriorityDiscrepancies;
    private Long resolvedDiscrepancies;

    // Amount summaries
    private BigDecimal totalInternalAmount;
    private BigDecimal totalBankAmount;
    private BigDecimal reconciledAmount;
    private BigDecimal unreconciledAmount;
    private BigDecimal discrepancyAmount;

    // Calculated fields
    private Double reconciliationPercentage;
    private String reconciliationStatus; // "COMPLETE", "IN_PROGRESS", "ISSUES"
    private BigDecimal adjustedBookBalance;
    private BigDecimal adjustedBankBalance;
    private BigDecimal finalDifference;
}