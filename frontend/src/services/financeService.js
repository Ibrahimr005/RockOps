// src/services/financeService.js
import apiClient from '../utils/apiClient';
import { FINANCE_ENDPOINTS } from '../config/api.config';

export const financeService = {
    // Journal Entry operations
    journalEntries: {
        getAll: (params = {}) => {
            return apiClient.get(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.BASE, { params });
        },

        getById: (id) => {
            return apiClient.get(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.BY_ID(id));
        },

        create: (formData) => {
            return apiClient.post(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.BASE, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },

        update: (id, requestJson) => {
            return apiClient.put(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.BY_ID(id), requestJson, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        },

        delete: (id) => {
            return apiClient.delete(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.BY_ID(id));
        },

        approve: (id, approvalData) => {
            return apiClient.put(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.APPROVE(id), approvalData);
        },

        reject: (id, rejectionData) => {
            return apiClient.put(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.REJECT(id), rejectionData);
        },

        getPending: () => {
            return apiClient.get(FINANCE_ENDPOINTS.JOURNAL_ENTRIES.PENDING);
        }
    },

    // Audit Log operations
    auditLogs: {
        getAll: (page = 0, size = 10) => {
            return apiClient.get(FINANCE_ENDPOINTS.AUDIT_LOGS.BASE, {
                params: { page, size }
            });
        },

        getByEntity: (entityType, entityId) => {
            return apiClient.get(FINANCE_ENDPOINTS.AUDIT_LOGS.BY_ENTITY(entityType, entityId));
        },

        getByUser: (userId) => {
            return apiClient.get(FINANCE_ENDPOINTS.AUDIT_LOGS.BY_USER(userId));
        },

        getByDateRange: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.AUDIT_LOGS.BY_DATE_RANGE, {
                params: { startDate, endDate }
            });
        },

        getByEntityType: (entityType) => {
            return apiClient.get(FINANCE_ENDPOINTS.AUDIT_LOGS.BY_ENTITY_TYPE(entityType));
        },

        export: (params = {}) => {
            return apiClient.get(FINANCE_ENDPOINTS.AUDIT_LOGS.EXPORT, {
                params,
                responseType: 'blob'
            });
        }
    },

    // Invoice operations (Payables)
    invoices: {
        getAll: (page = 0, size = 20) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.BASE, {
                params: { page, size }
            });
        },

        getById: (id) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.BY_ID(id));
        },

        getByNumber: (invoiceNumber) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.BY_NUMBER(invoiceNumber));
        },

        create: (invoiceData) => {
            return apiClient.post(FINANCE_ENDPOINTS.INVOICES.BASE, invoiceData);
        },

        update: (id, invoiceData) => {
            return apiClient.put(FINANCE_ENDPOINTS.INVOICES.BY_ID(id), invoiceData);
        },

        delete: (id) => {
            return apiClient.delete(FINANCE_ENDPOINTS.INVOICES.BY_ID(id));
        },

        getUnpaid: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.UNPAID);
        },

        getOverdue: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.OVERDUE);
        },

        getDueSoon: (days = 7) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.DUE_SOON, {
                params: { days }
            });
        },

        getByVendor: (vendorName) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.BY_VENDOR, {
                params: { vendorName }
            });
        },

        getByStatus: (status) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.BY_STATUS, {
                params: { status }
            });
        },

        getByDateRange: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.BY_DATE_RANGE, {
                params: { startDate, endDate }
            });
        },

        search: (searchRequest) => {
            return apiClient.post(FINANCE_ENDPOINTS.INVOICES.SEARCH, searchRequest);
        },

        getOutstandingTotal: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.OUTSTANDING_TOTAL);
        },

        getPeriodTotal: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.PERIOD_TOTAL, {
                params: { startDate, endDate }
            });
        },

        getTopVendors: (startDate, endDate, limit = 10) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.TOP_VENDORS, {
                params: { startDate, endDate, limit }
            });
        },

        getVendorStats: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.VENDOR_STATS, {
                params: { startDate, endDate }
            });
        },

        // Aging report methods
        getAged0To30: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.AGING.AGED_0_30);
        },

        getAged31To60: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.AGING.AGED_31_60);
        },

        getAged61To90: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.AGING.AGED_61_90);
        },

        getAgedOver90: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.AGING.AGED_OVER_90);
        },

        getAgingSummary: (format = 'json') => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.AGING.SUMMARY, {
                params: { format },
                responseType: format === 'pdf' ? 'blob' : 'json'
            });
        },

        exportAgingToPDF: () => {
            return apiClient.get(FINANCE_ENDPOINTS.INVOICES.AGING.EXPORT_PDF, {
                responseType: 'blob'
            });
        }
    },

    // Payment operations
    payments: {
        getAll: (page = 0, size = 20) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.BASE, {
                params: { page, size }
            });
        },

        getById: (id) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.BY_ID(id));
        },

        getByInvoice: (invoiceId) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.BY_INVOICE(invoiceId));
        },

        create: (paymentData) => {
            return apiClient.post(FINANCE_ENDPOINTS.PAYMENTS.BASE, paymentData);
        },

        updateStatus: (id, status) => {
            return apiClient.put(FINANCE_ENDPOINTS.PAYMENTS.UPDATE_STATUS(id), null, {
                params: { status }
            });
        },

        getByDateRange: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.BY_DATE_RANGE, {
                params: { startDate, endDate }
            });
        },

        getByVendor: (vendorName) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.BY_VENDOR, {
                params: { vendorName }
            });
        },

        getByStatus: (status) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.BY_STATUS, {
                params: { status }
            });
        },

        searchByReference: (referenceNumber) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.SEARCH_BY_REFERENCE, {
                params: { referenceNumber }
            });
        },

        search: (searchRequest) => {
            return apiClient.post(FINANCE_ENDPOINTS.PAYMENTS.SEARCH, searchRequest);
        },

        getRecent: (days = 30) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.RECENT, {
                params: { days }
            });
        },

        getLargest: (startDate, endDate, limit = 10) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.LARGEST, {
                params: { startDate, endDate, limit }
            });
        },

        getTotals: (startDate, endDate, status = 'PROCESSED') => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.TOTALS, {
                params: { startDate, endDate, status }
            });
        },

        getVendorReport: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.VENDOR_REPORT, {
                params: { startDate, endDate }
            });
        },

        validate: (invoiceId, amount) => {
            return apiClient.get(FINANCE_ENDPOINTS.PAYMENTS.VALIDATE, {
                params: { invoiceId, amount }
            });
        }
    },

    // Fixed Assets operations
    fixedAssets: {
        getAll: () => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.BASE);
        },

        getById: (id) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.BY_ID(id));
        },

        create: (assetData) => {
            return apiClient.post(FINANCE_ENDPOINTS.FIXED_ASSETS.BASE, assetData);
        },

        update: (id, assetData) => {
            return apiClient.put(FINANCE_ENDPOINTS.FIXED_ASSETS.BY_ID(id), assetData);
        },

        delete: (id) => {
            return apiClient.delete(FINANCE_ENDPOINTS.FIXED_ASSETS.BY_ID(id));
        },

        getByStatus: (status) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.BY_STATUS(status));
        },

        getBySite: (siteId) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.BY_SITE(siteId));
        },

        search: (name) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.SEARCH, {
                params: { name }
            });
        },

        // Depreciation calculations
        getMonthlyDepreciation: (id) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.MONTHLY_DEPRECIATION(id));
        },

        getAccumulatedDepreciation: (id, asOfDate) => {
            const params = asOfDate ? { asOfDate } : {};
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.ACCUMULATED_DEPRECIATION(id), { params });
        },

        getBookValue: (id, asOfDate) => {
            const params = asOfDate ? { asOfDate } : {};
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.BOOK_VALUE(id), { params });
        },

        // Asset disposal operations
        dispose: (id, formData) => {
            return apiClient.post(FINANCE_ENDPOINTS.FIXED_ASSETS.DISPOSE(id), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },

        getDisposal: (id) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.DISPOSAL_BY_ASSET(id));
        },

        getAllDisposals: () => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.ALL_DISPOSALS);
        },

        getDisposalsByMethod: (method) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.DISPOSALS_BY_METHOD(method));
        },

        getDisposalsByDateRange: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.DISPOSALS_BY_DATE_RANGE, {
                params: { startDate, endDate }
            });
        },

        getProfitableDisposals: () => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.PROFITABLE_DISPOSALS);
        },

        getLossDisposals: () => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.LOSS_DISPOSALS);
        },

        getRecentDisposals: () => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.RECENT_DISPOSALS);
        },

        getDisposalSummary: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.DISPOSAL_SUMMARY, {
                params: { startDate, endDate }
            });
        },

        getTotalGainLoss: (startDate, endDate) => {
            return apiClient.get(FINANCE_ENDPOINTS.FIXED_ASSETS.TOTAL_GAIN_LOSS, {
                params: { startDate, endDate }
            });
        }
    },

    // Accounting Periods operations
    accountingPeriods: {
        getAll: () => {
            return apiClient.get(FINANCE_ENDPOINTS.ACCOUNTING_PERIODS.BASE);
        },

        getById: (id) => {
            return apiClient.get(FINANCE_ENDPOINTS.ACCOUNTING_PERIODS.BY_ID(id));
        },

        create: (periodData) => {
            return apiClient.post(FINANCE_ENDPOINTS.ACCOUNTING_PERIODS.BASE, periodData);
        },

        close: (id, closeData) => {
            return apiClient.put(FINANCE_ENDPOINTS.ACCOUNTING_PERIODS.CLOSE(id), closeData);
        }
    },

    // Add this to your existing financeService object in src/services/financeService.js

// Bank Reconciliation operations
    bankReconciliation: {
        // Bank Account operations
        bankAccounts: {
            getAll: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.BASE);
            },

            getById: (id) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.BY_ID(id));
            },

            create: (accountData) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.BASE, accountData);
            },

            update: (id, accountData) => {
                return apiClient.put(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.BY_ID(id), accountData);
            },

            delete: (id) => {
                return apiClient.delete(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.BY_ID(id));
            },

            updateBalance: (id, balance) => {
                return apiClient.put(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.UPDATE_BALANCE(id), null, {
                    params: { balance }
                });
            },

            search: (searchTerm) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.SEARCH, {
                    params: { searchTerm }
                });
            },

            getWithBalanceAbove: (minBalance) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_ACCOUNTS.BALANCE_ABOVE, {
                    params: { minBalance }
                });
            }
        },

        // Bank Statement Entry operations
        bankStatementEntries: {
            getAll: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BASE);
            },

            getById: (id) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BY_ID(id));
            },

            create: (entryData) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BASE, entryData);
            },

            import: (entriesData) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.IMPORT, entriesData);
            },

            update: (id, entryData) => {
                return apiClient.put(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BY_ID(id), entryData);
            },

            delete: (id) => {
                return apiClient.delete(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BY_ID(id));
            },

            getByBankAccount: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BY_BANK_ACCOUNT(bankAccountId));
            },

            getUnmatched: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.UNMATCHED);
            },

            getUnmatchedByAccount: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.UNMATCHED_BY_ACCOUNT(bankAccountId));
            },

            getByDateRange: (startDate, endDate) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BY_DATE_RANGE, {
                    params: { startDate, endDate }
                });
            },

            getByCategory: (category) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.BY_CATEGORY(category));
            },

            markAsMatched: (id, matchedBy) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.MARK_MATCHED(id), null, {
                    params: { matchedBy }
                });
            },

            findPotentialMatches: (bankAccountId, amount, date) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.POTENTIAL_MATCHES, {
                    params: { bankAccountId, amount, date }
                });
            },

            searchByDescription: (bankAccountId, keyword) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.BANK_STATEMENT_ENTRIES.SEARCH, {
                    params: { bankAccountId, keyword }
                });
            }
        },

        // Internal Transaction operations
        internalTransactions: {
            getAll: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BASE);
            },

            getById: (id) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BY_ID(id));
            },

            create: (transactionData) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BASE, transactionData);
            },

            update: (id, transactionData) => {
                return apiClient.put(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BY_ID(id), transactionData);
            },

            delete: (id) => {
                return apiClient.delete(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BY_ID(id));
            },

            getByBankAccount: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BY_BANK_ACCOUNT(bankAccountId));
            },

            getUnreconciled: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.UNRECONCILED);
            },

            getUnreconciledByAccount: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.UNRECONCILED_BY_ACCOUNT(bankAccountId));
            },

            getByDateRange: (startDate, endDate) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BY_DATE_RANGE, {
                    params: { startDate, endDate }
                });
            },

            getByType: (transactionType) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.BY_TYPE(transactionType));
            },

            markAsReconciled: (id, reconciledBy) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.MARK_RECONCILED(id), null, {
                    params: { reconciledBy }
                });
            },

            findPotentialMatches: (bankAccountId, amount, date) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.INTERNAL_TRANSACTIONS.POTENTIAL_MATCHES, {
                    params: { bankAccountId, amount, date }
                });
            }
        },

        // Transaction Match operations
        transactionMatches: {
            getAll: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.BASE);
            },

            getById: (id) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.BY_ID(id));
            },

            create: (matchData) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.BASE, matchData);
            },

            delete: (id) => {
                return apiClient.delete(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.BY_ID(id));
            },

            getUnconfirmed: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.UNCONFIRMED);
            },

            getByBankAccount: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.BY_BANK_ACCOUNT(bankAccountId));
            },

            getNeedingReview: (confidenceThreshold = 0.5) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.NEEDS_REVIEW, {
                    params: { confidenceThreshold }
                });
            },

            confirm: (id, confirmedBy) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.CONFIRM(id), null, {
                    params: { confirmedBy }
                });
            },

            performAutoMatching: (bankAccountId) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.AUTO_MATCH(bankAccountId));
            },

            findPotentialMatches: (bankStatementEntryId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.TRANSACTION_MATCHES.POTENTIAL_MATCHES(bankStatementEntryId));
            }
        },

        // Discrepancy operations
        discrepancies: {
            getAll: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.BASE);
            },

            getById: (id) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.BY_ID(id));
            },

            create: (discrepancyData) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.BASE, discrepancyData);
            },

            getByStatus: (status) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.BY_STATUS(status));
            },

            getOpen: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.OPEN);
            },

            getHighPriority: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.HIGH_PRIORITY);
            },

            getAssignedTo: (assignee) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.ASSIGNED_TO(assignee));
            },

            getUnassigned: () => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.UNASSIGNED);
            },

            getOverdue: (daysOld = 7) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.OVERDUE, {
                    params: { daysOld }
                });
            },

            assign: (id, assignee) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.ASSIGN(id), null, {
                    params: { assignee }
                });
            },

            updateInvestigationNotes: (id, notes) => {
                return apiClient.put(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.UPDATE_NOTES(id), notes, {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                });
            },

            resolve: (id, resolution, resolvedBy) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.RESOLVE(id), null, {
                    params: { resolution, resolvedBy }
                });
            },

            close: (id) => {
                return apiClient.post(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.CLOSE(id));
            },

            updatePriority: (id, priority) => {
                return apiClient.put(FINANCE_ENDPOINTS.BANK_RECONCILIATION.DISCREPANCIES.UPDATE_PRIORITY(id), null, {
                    params: { priority }
                });
            }
        },

        // Reconciliation Report operations
        reconciliationReports: {
            getSummaryByAccount: (bankAccountId, startDate, endDate) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.RECONCILIATION_REPORTS.SUMMARY_BY_ACCOUNT(bankAccountId), {
                    params: { startDate, endDate }
                });
            },

            getAllAccountsSummary: (startDate, endDate) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.RECONCILIATION_REPORTS.SUMMARY_ALL_ACCOUNTS, {
                    params: { startDate, endDate }
                });
            },

            getOutstandingChecks: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.RECONCILIATION_REPORTS.OUTSTANDING_CHECKS(bankAccountId));
            },

            getDepositsInTransit: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.RECONCILIATION_REPORTS.DEPOSITS_IN_TRANSIT(bankAccountId));
            },

            getReconciliationStatus: (bankAccountId, asOfDate = null) => {
                const params = asOfDate ? { asOfDate } : {};
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.RECONCILIATION_REPORTS.STATUS(bankAccountId), { params });
            },

            exportToCsv: (bankAccountId, startDate, endDate) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.RECONCILIATION_REPORTS.EXPORT_CSV(bankAccountId), {
                    params: { startDate, endDate },
                    responseType: 'blob'
                });
            },

            getReconciliationTrend: (bankAccountId) => {
                return apiClient.get(FINANCE_ENDPOINTS.BANK_RECONCILIATION.RECONCILIATION_REPORTS.TREND(bankAccountId));
            }
        }
    }
};