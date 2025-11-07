package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Finance Dashboard DTO
 * Provides financial metrics and accounting insights
 * Used for both FINANCE_MANAGER and FINANCE_EMPLOYEE roles
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinanceDashboardDTO {
    // Financial Overview
    private Double totalAssets;
    private Double totalLiabilities;
    private Double totalEquity;
    private Double currentRatio;
    
    // Cash Flow
    private Double currentCashBalance;
    private Double cashInflow;
    private Double cashOutflow;
    private Map<String, Object> cashFlowTrends;
    
    // Accounts Payable
    private Long totalInvoices;
    private Long pendingInvoices;
    private Long overdueInvoices;
    private Double totalPayables;
    private Double overduePayables;
    private List<Map<String, Object>> upcomingPayments;
    
    // Fixed Assets
    private Long totalFixedAssets;
    private Double totalAssetValue;
    private Double depreciationThisMonth;
    private Map<String, Object> assetsByCategory;
    
    // General Ledger
    private Long totalJournalEntries;
    private Long pendingJournalEntries;
    private Long reconciledEntriesThisMonth;
    private String currentAccountingPeriod;
    
    // Bank Reconciliation
    private Long totalBankAccounts;
    private Long reconciledAccounts;
    private Long pendingReconciliations;
    private Double totalDiscrepancies;
    private List<Map<String, Object>> reconciliationStatus;
    
    // Payroll Financials
    private Double totalPayrollThisMonth;
    private Long employeesOnPayroll;
    private Double totalDeductions;
    private Double netPayroll;
    
    // Budget Tracking
    private Double budgetAllocated;
    private Double budgetSpent;
    private Double budgetRemaining;
    private Double budgetUtilizationRate;
    
    // Alerts
    private Long overduePayments;
    private Long pendingApprovals;
    private List<String> financialAlerts;
    
    // Recent Transactions
    private List<Map<String, Object>> recentTransactions;
    private List<Map<String, Object>> recentPayments;
}

