package com.example.backend.services.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.ReconciliationSummaryDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.bankReconciliation.BankAccount;
import com.example.backend.models.finance.bankReconciliation.DiscrepancyStatus;
import com.example.backend.repositories.finance.bankReconciliation.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReconciliationReportService {

    private final BankAccountRepository bankAccountRepository;
    private final InternalTransactionRepository internalTransactionRepository;
    private final BankStatementEntryRepository bankStatementEntryRepository;
    private final TransactionMatchRepository transactionMatchRepository;
    private final DiscrepancyRepository discrepancyRepository;

    // Generate reconciliation summary for a specific bank account
    public ReconciliationSummaryDTO generateReconciliationSummary(UUID bankAccountId, LocalDate startDate, LocalDate endDate) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        ReconciliationSummaryDTO summary = new ReconciliationSummaryDTO();
        summary.setBankAccountId(bankAccountId);
        summary.setBankAccountName(bankAccount.getAccountName());

        // Get transactions in date range
        var internalTransactions = internalTransactionRepository.findByAccountAndDateRange(bankAccount, startDate, endDate);
        var bankStatementEntries = bankStatementEntryRepository.findByAccountAndDateRange(bankAccount, startDate, endDate);
        var matches = transactionMatchRepository.findByBankAccount(bankAccount);
        var discrepancies = discrepancyRepository.findByBankAccount(bankAccount);

        // Transaction counts
        summary.setTotalInternalTransactions((long) internalTransactions.size());
        summary.setTotalBankStatementEntries((long) bankStatementEntries.size());
        summary.setReconciledTransactions((long) internalTransactions.stream().mapToInt(t -> t.getIsReconciled() ? 1 : 0).sum());
        summary.setUnmatchedInternalTransactions((long) internalTransactions.stream().mapToInt(t -> t.getIsReconciled() ? 0 : 1).sum());
        summary.setUnmatchedBankEntries((long) bankStatementEntries.stream().mapToInt(e -> e.getIsMatched() ? 0 : 1).sum());
        summary.setTotalMatches((long) matches.size());
        summary.setConfirmedMatches((long) matches.stream().mapToInt(m -> m.getIsConfirmed() ? 1 : 0).sum());
        summary.setPendingMatches((long) matches.stream().mapToInt(m -> m.getIsConfirmed() ? 0 : 1).sum());

        // Discrepancy counts
        summary.setTotalDiscrepancies((long) discrepancies.size());
        summary.setOpenDiscrepancies((long) discrepancies.stream().mapToInt(d ->
                d.getStatus() == DiscrepancyStatus.OPEN || d.getStatus() == DiscrepancyStatus.IN_PROGRESS ? 1 : 0).sum());
        summary.setHighPriorityDiscrepancies(discrepancyRepository.findHighPriorityOpenDiscrepancies().stream()
                .filter(d -> d.getBankAccount().getId().equals(bankAccountId)).count());
        summary.setResolvedDiscrepancies((long) discrepancies.stream().mapToInt(d ->
                d.getStatus() == DiscrepancyStatus.RESOLVED || d.getStatus() == DiscrepancyStatus.CLOSED ? 1 : 0).sum());

        // Amount summaries
        summary.setTotalInternalAmount(internalTransactions.stream()
                .map(t -> t.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        summary.setTotalBankAmount(bankStatementEntries.stream()
                .map(e -> e.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        summary.setReconciledAmount(internalTransactions.stream()
                .filter(t -> t.getIsReconciled())
                .map(t -> t.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        summary.setUnreconciledAmount(internalTransactions.stream()
                .filter(t -> !t.getIsReconciled())
                .map(t -> t.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        summary.setDiscrepancyAmount(discrepancies.stream()
                .filter(d -> d.getAmount() != null)
                .map(d -> d.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));

        // Calculated fields
        if (summary.getTotalInternalTransactions() > 0) {
            summary.setReconciliationPercentage(
                    (summary.getReconciledTransactions().doubleValue() / summary.getTotalInternalTransactions().doubleValue()) * 100
            );
        } else {
            summary.setReconciliationPercentage(0.0);
        }

        // Determine reconciliation status
        if (summary.getReconciliationPercentage() >= 100.0 && summary.getOpenDiscrepancies() == 0) {
            summary.setReconciliationStatus("COMPLETE");
        } else if (summary.getHighPriorityDiscrepancies() > 0) {
            summary.setReconciliationStatus("ISSUES");
        } else {
            summary.setReconciliationStatus("IN_PROGRESS");
        }

        // Calculate adjusted balances
        summary.setAdjustedBookBalance(bankAccount.getCurrentBalance().add(summary.getUnreconciledAmount()));
        summary.setAdjustedBankBalance(bankAccount.getCurrentBalance().add(summary.getTotalBankAmount()));
        summary.setFinalDifference(summary.getAdjustedBookBalance().subtract(summary.getAdjustedBankBalance()));

        return summary;
    }

    // Generate summary for all active bank accounts
    public List<ReconciliationSummaryDTO> generateAllAccountsSummary(LocalDate startDate, LocalDate endDate) {
        return bankAccountRepository.findByIsActiveTrue()
                .stream()
                .map(account -> generateReconciliationSummary(account.getId(), startDate, endDate))
                .collect(Collectors.toList());
    }

    // Get outstanding checks (internal transactions not yet cleared by bank)
    public List<Object> getOutstandingChecks(UUID bankAccountId) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return internalTransactionRepository.findByBankAccountAndIsReconciledFalse(bankAccount)
                .stream()
                .filter(t -> t.getAmount().compareTo(BigDecimal.ZERO) < 0) // Outgoing transactions
                .map(t -> {
                    return new Object() {
                        public final UUID id = t.getId();
                        public final String description = t.getDescription();
                        public final BigDecimal amount = t.getAmount();
                        public final LocalDate transactionDate = t.getTransactionDate();
                        public final String referenceNumber = t.getReferenceNumber();
                        public final String transactionType = t.getTransactionType().toString();
                        public final int daysOutstanding = java.time.Period.between(t.getTransactionDate(), LocalDate.now()).getDays();
                    };
                })
                .collect(Collectors.toList());
    }

    // Get deposits in transit (internal deposits not yet showing on bank statement)
    public List<Object> getDepositsInTransit(UUID bankAccountId) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return internalTransactionRepository.findByBankAccountAndIsReconciledFalse(bankAccount)
                .stream()
                .filter(t -> t.getAmount().compareTo(BigDecimal.ZERO) > 0) // Incoming transactions
                .map(t -> {
                    return new Object() {
                        public final UUID id = t.getId();
                        public final String description = t.getDescription();
                        public final BigDecimal amount = t.getAmount();
                        public final LocalDate transactionDate = t.getTransactionDate();
                        public final String referenceNumber = t.getReferenceNumber();
                        public final String transactionType = t.getTransactionType().toString();
                        public final int daysOutstanding = java.time.Period.between(t.getTransactionDate(), LocalDate.now()).getDays();
                    };
                })
                .collect(Collectors.toList());
    }
}