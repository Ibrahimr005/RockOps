package com.example.backend.controllers.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.ReconciliationSummaryDTO;
import com.example.backend.services.finance.bankReconciliation.ReconciliationReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reconciliation-reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReconciliationReportController {

    private final ReconciliationReportService reconciliationReportService;

    // Generate reconciliation summary for specific bank account
    @GetMapping("/summary/bank-account/{bankAccountId}")
    public ResponseEntity<ReconciliationSummaryDTO> getReconciliationSummary(
            @PathVariable UUID bankAccountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        ReconciliationSummaryDTO summary = reconciliationReportService.generateReconciliationSummary(
                bankAccountId, startDate, endDate);
        return ResponseEntity.ok(summary);
    }

    // Generate summary for all active bank accounts
    @GetMapping("/summary/all-accounts")
    public ResponseEntity<List<ReconciliationSummaryDTO>> getAllAccountsSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<ReconciliationSummaryDTO> summaries = reconciliationReportService.generateAllAccountsSummary(
                startDate, endDate);
        return ResponseEntity.ok(summaries);
    }

    // Get outstanding checks for specific account
    @GetMapping("/outstanding-checks/bank-account/{bankAccountId}")
    public ResponseEntity<List<Object>> getOutstandingChecks(@PathVariable UUID bankAccountId) {
        List<Object> outstandingChecks = reconciliationReportService.getOutstandingChecks(bankAccountId);
        return ResponseEntity.ok(outstandingChecks);
    }

    // Get deposits in transit for specific account
    @GetMapping("/deposits-in-transit/bank-account/{bankAccountId}")
    public ResponseEntity<List<Object>> getDepositsInTransit(@PathVariable UUID bankAccountId) {
        List<Object> depositsInTransit = reconciliationReportService.getDepositsInTransit(bankAccountId);
        return ResponseEntity.ok(depositsInTransit);
    }

    // Get reconciliation status overview (quick check)
    @GetMapping("/status/bank-account/{bankAccountId}")
    public ResponseEntity<Object> getReconciliationStatus(
            @PathVariable UUID bankAccountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {

        LocalDate dateToUse = asOfDate != null ? asOfDate : LocalDate.now();
        LocalDate monthStart = dateToUse.withDayOfMonth(1);

        ReconciliationSummaryDTO summary = reconciliationReportService.generateReconciliationSummary(
                bankAccountId, monthStart, dateToUse);

        // Return simplified status object
        return ResponseEntity.ok(new Object() {
            public final UUID bankAccountId = summary.getBankAccountId();
            public final String bankAccountName = summary.getBankAccountName();
            public final String reconciliationStatus = summary.getReconciliationStatus();
            public final Double reconciliationPercentage = summary.getReconciliationPercentage();
            public final Long unreconciledTransactions = summary.getUnmatchedInternalTransactions();
            public final Long openDiscrepancies = summary.getOpenDiscrepancies();
            public final Long highPriorityDiscrepancies = summary.getHighPriorityDiscrepancies();
            public final String statusColor = getStatusColor(summary.getReconciliationStatus());
            public final boolean needsAttention = (summary.getHighPriorityDiscrepancies() > 0 ||
                    summary.getReconciliationPercentage() < 95.0);
        });
    }

    // Helper method for status colors
    private String getStatusColor(String status) {
        return switch (status) {
            case "COMPLETE" -> "green";
            case "ISSUES" -> "red";
            case "IN_PROGRESS" -> "yellow";
            default -> "gray";
        };
    }

    // Export reconciliation report to CSV (simple implementation)
    @GetMapping("/export/csv/bank-account/{bankAccountId}")
    public ResponseEntity<String> exportReconciliationReportCsv(
            @PathVariable UUID bankAccountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        ReconciliationSummaryDTO summary = reconciliationReportService.generateReconciliationSummary(
                bankAccountId, startDate, endDate);

        // Generate CSV content
        StringBuilder csv = new StringBuilder();
        csv.append("Bank Reconciliation Report\n");
        csv.append("Account,").append(summary.getBankAccountName()).append("\n");
        csv.append("Period,").append(startDate).append(" to ").append(endDate).append("\n");
        csv.append("Generated,").append(LocalDate.now()).append("\n\n");

        csv.append("Summary\n");
        csv.append("Total Internal Transactions,").append(summary.getTotalInternalTransactions()).append("\n");
        csv.append("Total Bank Statement Entries,").append(summary.getTotalBankStatementEntries()).append("\n");
        csv.append("Reconciled Transactions,").append(summary.getReconciledTransactions()).append("\n");
        csv.append("Unmatched Internal Transactions,").append(summary.getUnmatchedInternalTransactions()).append("\n");
        csv.append("Unmatched Bank Entries,").append(summary.getUnmatchedBankEntries()).append("\n");
        csv.append("Reconciliation Percentage,").append(String.format("%.1f%%", summary.getReconciliationPercentage())).append("\n");
        csv.append("Total Discrepancies,").append(summary.getTotalDiscrepancies()).append("\n");
        csv.append("Open Discrepancies,").append(summary.getOpenDiscrepancies()).append("\n");
        csv.append("Status,").append(summary.getReconciliationStatus()).append("\n\n");

        csv.append("Balances\n");
        csv.append("Total Internal Amount,").append(summary.getTotalInternalAmount()).append("\n");
        csv.append("Total Bank Amount,").append(summary.getTotalBankAmount()).append("\n");
        csv.append("Reconciled Amount,").append(summary.getReconciledAmount()).append("\n");
        csv.append("Unreconciled Amount,").append(summary.getUnreconciledAmount()).append("\n");
        csv.append("Discrepancy Amount,").append(summary.getDiscrepancyAmount()).append("\n");
        csv.append("Final Difference,").append(summary.getFinalDifference()).append("\n");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDispositionFormData("attachment",
                "reconciliation_report_" + summary.getBankAccountName().replaceAll(" ", "_") + "_" +
                        startDate + "_to_" + endDate + ".csv");

        return ResponseEntity.ok()
                .headers(headers)
                .body(csv.toString());
    }

    // Get monthly reconciliation trend (last 6 months)
    @GetMapping("/trend/bank-account/{bankAccountId}")
    public ResponseEntity<List<Object>> getReconciliationTrend(@PathVariable UUID bankAccountId) {
        List<Object> trend = new java.util.ArrayList<>();

        for (int i = 5; i >= 0; i--) {
            LocalDate monthEndDate = LocalDate.now().minusMonths(i);
            LocalDate monthStartDate = monthEndDate.withDayOfMonth(1);
            monthEndDate = monthEndDate.withDayOfMonth(monthEndDate.lengthOfMonth());

            ReconciliationSummaryDTO summary = reconciliationReportService.generateReconciliationSummary(
                    bankAccountId, monthStartDate, monthEndDate);

            // Store in variables first to avoid field reference issues
            final String monthName = monthEndDate.getMonth().toString() + " " + monthEndDate.getYear();
            final LocalDate periodStart = monthStartDate;
            final LocalDate periodEnd = monthEndDate;
            final Double percentage = summary.getReconciliationPercentage();
            final Long totalTxns = summary.getTotalInternalTransactions();
            final Long reconciledTxns = summary.getReconciledTransactions();
            final Long totalDisc = summary.getTotalDiscrepancies();
            final String statusValue = summary.getReconciliationStatus();

            trend.add(new Object() {
                public final String month = monthName;
                public final LocalDate startDate = periodStart;
                public final LocalDate endDate = periodEnd;
                public final Double reconciliationPercentage = percentage;
                public final Long totalTransactions = totalTxns;
                public final Long reconciledTransactions = reconciledTxns;
                public final Long totalDiscrepancies = totalDisc;
                public final String status = statusValue;
            });
        }

        return ResponseEntity.ok(trend);
    }
}