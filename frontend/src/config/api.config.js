// src/config/api.config.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';


// Direct Purchase Ticket module endpoints
export const DIRECT_PURCHASE_ENDPOINTS = {
    BASE: '/api/direct-purchase-tickets',
    BY_ID: (id) => `/api/direct-purchase-tickets/${id}`,
    CREATE: '/api/direct-purchase-tickets',
    UPDATE: (id) => `/api/direct-purchase-tickets/${id}`,
    DELETE: (id) => `/api/direct-purchase-tickets/${id}`,

    // Query-based endpoints
    BY_STATUS: (status) => `/api/direct-purchase-tickets?status=${status}`,
    BY_EQUIPMENT: (equipmentId) => `/api/direct-purchase-tickets?equipmentId=${equipmentId}`,
    BY_MERCHANT: (merchantId) => `/api/direct-purchase-tickets?merchantId=${merchantId}`,

    // Step endpoints
    STEPS: {
        BY_TICKET: (ticketId) => `/api/direct-purchase-tickets/${ticketId}/steps`,
        BY_ID: (ticketId, stepId) => `/api/direct-purchase-tickets/${ticketId}/steps/${stepId}`,
        UPDATE: (ticketId, stepId) => `/api/direct-purchase-tickets/${ticketId}/steps/${stepId}`,
        COMPLETE: (ticketId, stepId) => `/api/direct-purchase-tickets/${ticketId}/steps/${stepId}/complete`,
        DELETE: (ticketId, stepId) => `/api/direct-purchase-tickets/${ticketId}/steps/${stepId}`
    }
};
// Dashboard endpoints
export const DASHBOARD_ENDPOINTS = {
    BASE: '/api/dashboard',
    ADMIN: '/api/dashboard/admin',
    SITE_ADMIN: '/api/dashboard/site-admin',
    EQUIPMENT_MANAGER: '/api/dashboard/equipment-manager',
    WAREHOUSE_MANAGER: '/api/dashboard/warehouse-manager',
    HR_MANAGER: '/api/dashboard/hr-manager',
    HR_EMPLOYEE: '/api/dashboard/hr-employee',
    FINANCE_MANAGER: '/api/dashboard/finance-manager',
    FINANCE_EMPLOYEE: '/api/dashboard/finance-employee',
    MAINTENANCE_MANAGER: '/api/dashboard/maintenance-manager',
    MAINTENANCE_EMPLOYEE: '/api/dashboard/maintenance-employee',
    PROCUREMENT: '/api/dashboard/procurement',
    SECRETARY: '/api/dashboard/secretary',
    USER: '/api/dashboard/user',
};

// Equipment module endpoints
export const EQUIPMENT_ENDPOINTS = {
    BASE: '/api/equipment',
    BY_ID: (id) => `/api/equipment/${id}`,
    TYPES: '/api/equipment-types',
    TYPE_BY_ID: (id) => `/api/equipment-types/${id}`,
    TYPE_BY_NAME: (name) => `/api/equipment-types/name/${name}`,
    TYPE_SUPPORTED_WORK_TYPES: (typeId) => `/api/equipment-types/${typeId}/supported-work-types`,
    STATUS_OPTIONS: '/api/equipment/status-options',
    STATUS: (id) => `/api/equipment/status/${id}`,
    STATUS_DTO: (id) => `/api/equipment/status/dto/${id}`,
    BY_TYPE: (typeId) => `/api/equipment/type/${typeId}`,
    CONSUMABLES: (equipmentId) => `/api/equipment/${equipmentId}/consumables`,
    CONSUMABLES_BY_CATEGORY: (equipmentId, category) => `/api/equipment/${equipmentId}/consumables/by-category/${category}`,
    CONSUMABLES_ANALYTICS: (equipmentId) => `/api/equipment/${equipmentId}/consumables/analytics`,
    MAINTENANCE: (equipmentId) => `/api/equipment/${equipmentId}/maintenance`,
    MAINTENANCE_TECHNICIANS: (equipmentId) => `/api/equipment/${equipmentId}/maintenance/technicians`,
    MAINTENANCE_BY_ID: (equipmentId, maintenanceId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}`,
    MAINTENANCE_TRANSACTIONS: (equipmentId, maintenanceId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}/transactions`,
    MAINTENANCE_CHECK_TRANSACTION: (equipmentId, batchNumber) => `/api/equipment/${equipmentId}/maintenance/check-transaction/${batchNumber}`,
    CREATE_DTO: '/api/equipment/dto',
    UPDATE_DTO: (id) => `/api/equipment/dto/${id}`,
    ELIGIBLE_DRIVERS: (typeId) => `/api/equipment/type/${typeId}/eligible-drivers`,
    SARKY_DRIVERS: (typeId) => `/api/equipment/type/${typeId}/sarky-drivers`,
    SUPPORTED_WORK_TYPES: (typeId) => `/api/equipment/type/${typeId}/supported-work-types`,
    CHECK_DRIVER_COMPATIBILITY: (equipmentId, employeeId) =>
        `/api/equipment/${equipmentId}/check-driver-compatibility/${employeeId}`,
    BRANDS: '/api/equipment/brands',
    BRAND_BY_ID: (id) => `/api/equipment/brands/${id}`,
    SARKY_ANALYTICS: (equipmentId) => `/api/equipment/${equipmentId}/sarky-analytics`,
    // Transaction endpoints
    TRANSACTIONS: (equipmentId) => `/api/equipment/${equipmentId}/transactions`,
    TRANSACTIONS_INITIATED: (equipmentId) => `/api/equipment/${equipmentId}/transactions/initiated`,
    SEND_TRANSACTION: (equipmentId) => `/api/equipment/${equipmentId}/send-transaction`,
    RECEIVE_TRANSACTION: (equipmentId) => `/api/equipment/${equipmentId}/receive-transaction`,
    ACCEPT_TRANSACTION: (equipmentId, transactionId) => `/api/equipment/${equipmentId}/transactions/${transactionId}/accept`,
    REJECT_TRANSACTION: (equipmentId, transactionId) => `/api/equipment/${equipmentId}/transactions/${transactionId}/reject`,
    UPDATE_TRANSACTION: (equipmentId, transactionId) => `/api/equipment/${equipmentId}/transactions/${transactionId}`,
    // Maintenance integration endpoints
    MAINTENANCE_SEARCH: (equipmentId) => `/api/equipment/${equipmentId}/maintenance/search`,
    MAINTENANCE_FOR_LINKING: (equipmentId) => `/api/equipment/${equipmentId}/maintenance/for-linking`,
    ACCEPT_TRANSACTION_WITH_MAINTENANCE: (equipmentId, transactionId) => `/api/equipment/${equipmentId}/transactions/${transactionId}/accept-with-maintenance`,
    ITEMS: (equipmentId) => `/api/equipment/${equipmentId}/items`,
    CHECK_BATCH_EXISTS: (equipmentId, batchNumber) => `/api/equipment/${equipmentId}/maintenance/check-transaction/${batchNumber}`,
    DRIVERS: (equipmentId) => `/api/equipment/${equipmentId}/drivers`,
    ASSIGN_DRIVER: (equipmentId, driverId) => `/api/equipment/${equipmentId}/driver/${driverId}`,
    UNASSIGN_DRIVER: (equipmentId, driverId) => `/api/equipment/${equipmentId}/driver/${driverId}`,

};

// Batch Validation endpoints
export const BATCH_VALIDATION_ENDPOINTS = {
    BASE: '/api/v1/batch-validation',
    VALIDATE_FOR_EQUIPMENT: (equipmentId, batchNumber) => `/api/v1/batch-validation/equipment/${equipmentId}/batch/${batchNumber}`,
    VALIDATE_FOR_MAINTENANCE: (equipmentId, maintenanceId, batchNumber) => `/api/v1/batch-validation/equipment/${equipmentId}/maintenance/${maintenanceId}/batch/${batchNumber}`,
    CHECK_AVAILABILITY: (batchNumber) => `/api/v1/batch-validation/batch/${batchNumber}/available`,
    VALIDATE_UNIQUENESS: (batchNumber) => `/api/v1/batch-validation/batch/${batchNumber}/validate-uniqueness`
};

// Consumable Resolution endpoints
export const CONSUMABLE_ENDPOINTS = {
    RESOLVE_DISCREPANCY: '/api/v1/consumables/resolve-discrepancy',
    RESOLUTION_HISTORY: (equipmentId) => `/api/v1/consumables/resolution-history/equipment/${equipmentId}`,
    DISCREPANCIES: (equipmentId) => `/api/v1/consumables/equipment/${equipmentId}/discrepancies`,
    RESOLVED: (equipmentId) => `/api/v1/consumables/equipment/${equipmentId}/resolved`,
    HISTORY_BY_CONSUMABLE: (consumableId) => `/api/v1/equipment/consumables/${consumableId}/history`
};

// Equipment Types module endpoints
export const EQUIPMENT_TYPE_ENDPOINTS = {
    BASE: '/api/equipment-types',
    BY_ID: (id) => `/api/equipment-types/${id}`,
    CREATE: '/api/equipment-types',
    UPDATE: (id) => `/api/equipment-types/${id}`,
    DELETE: (id) => `/api/equipment-types/${id}`,
    SEARCH: '/api/equipment-types/search',
    SUPPORTED_WORK_TYPES: (id) => `/api/equipment-types/${id}/supported-work-types`,
    SET_SUPPORTED_WORK_TYPES: (id) => `/api/equipment-types/${id}/supported-work-types`,
};

// Sarky module endpoints
export const SARKY_ENDPOINTS = {
    BY_EQUIPMENT: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky`,
    BY_EQUIPMENT_AND_DATE: (equipmentId, date) => `/api/v1/equipment/${equipmentId}/sarky/date/${date}`,
    BY_EQUIPMENT_DATE_RANGE: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky/date-range`,
    DAILY_SUMMARY: (equipmentId, date) => `/api/v1/equipment/${equipmentId}/sarky/daily-summary/${date}`,
    EXISTING_DATES: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky/existing-dates`,
    VALIDATION_INFO: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky/validation-info`,
    LATEST_DATE: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky/latest-date`,
    BY_ID: (id) => `/api/v1/sarky/${id}`,
    CREATE: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky`,
    UPDATE: (id) => `/api/v1/sarky/${id}`,
    DELETE: (id) => `/api/v1/sarky/${id}`,
    RANGE_BY_EQUIPMENT: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky/range`,
    RANGE_BY_ID: (id) => `/api/v1/sarky/range/${id}`,
    CREATE_RANGE: (equipmentId) => `/api/v1/equipment/${equipmentId}/sarky/range`,
    UPDATE_RANGE: (id) => `/api/v1/sarky/range/${id}`,
    DELETE_RANGE: (id) => `/api/v1/sarky/range/${id}`,
};

// Replace your existing FINANCE_ENDPOINTS in api.config.js with this:
export const FINANCE_ENDPOINTS = {
    // Journal Entry endpoints
    JOURNAL_ENTRIES: {
        BASE: '/api/v1/journal-entries',
        BY_ID: (id) => `/api/v1/journal-entries/${id}`,
        APPROVE: (id) => `/api/v1/journal-entries/${id}/approve`,
        REJECT: (id) => `/api/v1/journal-entries/${id}/reject`,
        PENDING: '/api/v1/journal-entries/pending'
    },

    // Audit Log endpoints
    AUDIT_LOGS: {
        BASE: '/api/v1/audit-logs',
        BY_ENTITY: (entityType, entityId) => `/api/v1/audit-logs/entity/${entityType}/${entityId}`,
        BY_USER: (userId) => `/api/v1/audit-logs/user/${userId}`,
        BY_DATE_RANGE: '/api/v1/audit-logs/date-range',
        BY_ENTITY_TYPE: (entityType) => `/api/v1/audit-logs/entity-type/${entityType}`,
        EXPORT: '/api/v1/audit-logs/export'
    },

    // Invoice endpoints (Payables)
    INVOICES: {
        BASE: '/api/v1/invoices',
        BY_ID: (id) => `/api/v1/invoices/${id}`,
        BY_NUMBER: (invoiceNumber) => `/api/v1/invoices/number/${invoiceNumber}`,
        UNPAID: '/api/v1/invoices/unpaid',
        OVERDUE: '/api/v1/invoices/overdue',
        DUE_SOON: '/api/v1/invoices/due-soon',
        BY_VENDOR: '/api/v1/invoices/vendor',
        BY_STATUS: '/api/v1/invoices/status',
        BY_DATE_RANGE: '/api/v1/invoices/date-range',
        SEARCH: '/api/v1/invoices/search',
        OUTSTANDING_TOTAL: '/api/v1/invoices/outstanding-total',
        PERIOD_TOTAL: '/api/v1/invoices/period-total',
        TOP_VENDORS: '/api/v1/invoices/top-vendors',
        VENDOR_STATS: '/api/v1/invoices/vendor-stats',

        // Aging report endpoints
        AGING: {
            AGED_0_30: '/api/v1/invoices/aging/0-30',
            AGED_31_60: '/api/v1/invoices/aging/31-60',
            AGED_61_90: '/api/v1/invoices/aging/61-90',
            AGED_OVER_90: '/api/v1/invoices/aging/over-90',
            SUMMARY: '/api/v1/invoices/aging/summary',
            EXPORT_PDF: '/api/v1/invoices/aging/export/pdf'
        }
    },

    // Payment endpoints
    PAYMENTS: {
        BASE: '/api/v1/payments',
        BY_ID: (id) => `/api/v1/payments/${id}`,
        BY_INVOICE: (invoiceId) => `/api/v1/payments/invoice/${invoiceId}`,
        UPDATE_STATUS: (id) => `/api/v1/payments/${id}/status`,
        BY_DATE_RANGE: '/api/v1/payments/date-range',
        BY_VENDOR: '/api/v1/payments/vendor',
        BY_STATUS: '/api/v1/payments/status',
        SEARCH_BY_REFERENCE: '/api/v1/payments/search/reference',
        SEARCH: '/api/v1/payments/search',
        RECENT: '/api/v1/payments/recent',
        LARGEST: '/api/v1/payments/largest',
        TOTALS: '/api/v1/payments/totals',
        VENDOR_REPORT: '/api/v1/payments/vendor-report',
        VALIDATE: '/api/v1/payments/validate'
    },

    // Fixed Assets endpoints
    FIXED_ASSETS: {
        BASE: '/api/v1/fixed-assets',
        BY_ID: (id) => `/api/v1/fixed-assets/${id}`,
        BY_STATUS: (status) => `/api/v1/fixed-assets/status/${status}`,
        BY_SITE: (siteId) => `/api/v1/fixed-assets/site/${siteId}`,
        SEARCH: '/api/v1/fixed-assets/search',

        // Depreciation endpoints
        MONTHLY_DEPRECIATION: (id) => `/api/v1/fixed-assets/${id}/depreciation/monthly`,
        ACCUMULATED_DEPRECIATION: (id) => `/api/v1/fixed-assets/${id}/depreciation/accumulated`,
        BOOK_VALUE: (id) => `/api/v1/fixed-assets/${id}/book-value`,

        // Disposal endpoints
        DISPOSE: (id) => `/api/v1/fixed-assets/${id}/dispose`,
        DISPOSAL_BY_ASSET: (id) => `/api/v1/fixed-assets/${id}/disposal`,
        ALL_DISPOSALS: '/api/v1/fixed-assets/disposals',
        DISPOSALS_BY_METHOD: (method) => `/api/v1/fixed-assets/disposals/method/${method}`,
        DISPOSALS_BY_DATE_RANGE: '/api/v1/fixed-assets/disposals/date-range',
        PROFITABLE_DISPOSALS: '/api/v1/fixed-assets/disposals/profitable',
        LOSS_DISPOSALS: '/api/v1/fixed-assets/disposals/losses',
        RECENT_DISPOSALS: '/api/v1/fixed-assets/disposals/recent',
        DISPOSAL_SUMMARY: '/api/v1/fixed-assets/disposals/summary',
        TOTAL_GAIN_LOSS: '/api/v1/fixed-assets/disposals/total-gain-loss'
    },

    // Accounting Period endpoints
    ACCOUNTING_PERIODS: {
        BASE: '/api/v1/accounting-periods',
        BY_ID: (id) => `/api/v1/accounting-periods/${id}`,
        CLOSE: (id) => `/api/v1/accounting-periods/${id}/close`
    },

    // Add this to your existing FINANCE_ENDPOINTS in src/config/api.config.js

    // Bank Reconciliation submodule endpoints
    BANK_RECONCILIATION: {
        // Bank Account endpoints
        BANK_ACCOUNTS: {
            BASE: '/api/v1/bank-accounts',
            BY_ID: (id) => `/api/v1/bank-accounts/${id}`,
            UPDATE_BALANCE: (id) => `/api/v1/bank-accounts/${id}/balance`,
            SEARCH: '/api/v1/bank-accounts/search',
            BALANCE_ABOVE: '/api/v1/bank-accounts/balance-above'
        },

        // Bank Statement Entry endpoints
        BANK_STATEMENT_ENTRIES: {
            BASE: '/api/v1/bank-statement-entries',
            BY_ID: (id) => `/api/v1/bank-statement-entries/${id}`,
            IMPORT: '/api/v1/bank-statement-entries/import',
            BY_BANK_ACCOUNT: (bankAccountId) => `/api/v1/bank-statement-entries/bank-account/${bankAccountId}`,
            UNMATCHED: '/api/v1/bank-statement-entries/unmatched',
            UNMATCHED_BY_ACCOUNT: (bankAccountId) => `/api/v1/bank-statement-entries/unmatched/bank-account/${bankAccountId}`,
            BY_DATE_RANGE: '/api/v1/bank-statement-entries/date-range',
            BY_CATEGORY: (category) => `/api/v1/bank-statement-entries/category/${category}`,
            MARK_MATCHED: (id) => `/api/v1/bank-statement-entries/${id}/match`,
            POTENTIAL_MATCHES: '/api/v1/bank-statement-entries/potential-matches',
            SEARCH: '/api/v1/bank-statement-entries/search'
        },

        // Internal Transaction endpoints
        INTERNAL_TRANSACTIONS: {
            BASE: '/api/v1/internal-transactions',
            BY_ID: (id) => `/api/v1/internal-transactions/${id}`,
            BY_BANK_ACCOUNT: (bankAccountId) => `/api/v1/internal-transactions/bank-account/${bankAccountId}`,
            UNRECONCILED: '/api/v1/internal-transactions/unreconciled',
            UNRECONCILED_BY_ACCOUNT: (bankAccountId) => `/api/v1/internal-transactions/unreconciled/bank-account/${bankAccountId}`,
            BY_DATE_RANGE: '/api/v1/internal-transactions/date-range',
            BY_TYPE: (transactionType) => `/api/v1/internal-transactions/type/${transactionType}`,
            MARK_RECONCILED: (id) => `/api/v1/internal-transactions/${id}/reconcile`,
            POTENTIAL_MATCHES: '/api/v1/internal-transactions/potential-matches'
        },

        // Transaction Match endpoints
        TRANSACTION_MATCHES: {
            BASE: '/api/v1/transaction-matches',
            BY_ID: (id) => `/api/v1/transaction-matches/${id}`,
            UNCONFIRMED: '/api/v1/transaction-matches/unconfirmed',
            BY_BANK_ACCOUNT: (bankAccountId) => `/api/v1/transaction-matches/bank-account/${bankAccountId}`,
            NEEDS_REVIEW: '/api/v1/transaction-matches/needs-review',
            CONFIRM: (id) => `/api/v1/transaction-matches/${id}/confirm`,
            AUTO_MATCH: (bankAccountId) => `/api/v1/transaction-matches/auto-match/bank-account/${bankAccountId}`,
            POTENTIAL_MATCHES: (bankStatementEntryId) => `/api/v1/transaction-matches/potential-matches/bank-statement-entry/${bankStatementEntryId}`
        },

        // Discrepancy endpoints
        DISCREPANCIES: {
            BASE: '/api/v1/discrepancies',
            BY_ID: (id) => `/api/v1/discrepancies/${id}`,
            BY_STATUS: (status) => `/api/v1/discrepancies/status/${status}`,
            OPEN: '/api/v1/discrepancies/open',
            HIGH_PRIORITY: '/api/v1/discrepancies/high-priority',
            ASSIGNED_TO: (assignee) => `/api/v1/discrepancies/assigned-to/${assignee}`,
            UNASSIGNED: '/api/v1/discrepancies/unassigned',
            OVERDUE: '/api/v1/discrepancies/overdue',
            ASSIGN: (id) => `/api/v1/discrepancies/${id}/assign`,
            UPDATE_NOTES: (id) => `/api/v1/discrepancies/${id}/investigation-notes`,
            RESOLVE: (id) => `/api/v1/discrepancies/${id}/resolve`,
            CLOSE: (id) => `/api/v1/discrepancies/${id}/close`,
            UPDATE_PRIORITY: (id) => `/api/v1/discrepancies/${id}/priority`
        },

        // Reconciliation Report endpoints
        RECONCILIATION_REPORTS: {
            SUMMARY_BY_ACCOUNT: (bankAccountId) => `/api/v1/reconciliation-reports/summary/bank-account/${bankAccountId}`,
            SUMMARY_ALL_ACCOUNTS: '/api/v1/reconciliation-reports/summary/all-accounts',
            OUTSTANDING_CHECKS: (bankAccountId) => `/api/v1/reconciliation-reports/outstanding-checks/bank-account/${bankAccountId}`,
            DEPOSITS_IN_TRANSIT: (bankAccountId) => `/api/v1/reconciliation-reports/deposits-in-transit/bank-account/${bankAccountId}`,
            STATUS: (bankAccountId) => `/api/v1/reconciliation-reports/status/bank-account/${bankAccountId}`,
            EXPORT_CSV: (bankAccountId) => `/api/v1/reconciliation-reports/export/csv/bank-account/${bankAccountId}`,
            TREND: (bankAccountId) => `/api/v1/reconciliation-reports/trend/bank-account/${bankAccountId}`
        }
    },
    // Balances submodule endpoints (inside FINANCE_ENDPOINTS)
    BALANCES: {
        // Bank Account endpoints
        BANK_ACCOUNTS: {
            BASE: '/api/v1/finance/balances/bank-accounts',
            BY_ID: (id) => `/api/v1/finance/balances/bank-accounts/${id}`,
            ACTIVE: '/api/v1/finance/balances/bank-accounts/active',
            ACTIVATE: (id) => `/api/v1/finance/balances/bank-accounts/${id}/activate`,
            DEACTIVATE: (id) => `/api/v1/finance/balances/bank-accounts/${id}/deactivate`
        },

        // Cash Safe endpoints
        CASH_SAFES: {
            BASE: '/api/v1/finance/balances/cash-safes',
            BY_ID: (id) => `/api/v1/finance/balances/cash-safes/${id}`,
            ACTIVE: '/api/v1/finance/balances/cash-safes/active',
            ACTIVATE: (id) => `/api/v1/finance/balances/cash-safes/${id}/activate`,
            DEACTIVATE: (id) => `/api/v1/finance/balances/cash-safes/${id}/deactivate`
        },

        // Cash With Person endpoints
        CASH_WITH_PERSONS: {
            BASE: '/api/v1/finance/balances/cash-with-persons',
            BY_ID: (id) => `/api/v1/finance/balances/cash-with-persons/${id}`,
            ACTIVE: '/api/v1/finance/balances/cash-with-persons/active',
            ACTIVATE: (id) => `/api/v1/finance/balances/cash-with-persons/${id}/activate`,
            DEACTIVATE: (id) => `/api/v1/finance/balances/cash-with-persons/${id}/deactivate`
        },

        // Balance Transaction endpoints
        TRANSACTIONS: {
            BASE: '/api/v1/finance/balances/transactions',
            BY_ID: (id) => `/api/v1/finance/balances/transactions/${id}`,
            APPROVE: (id) => `/api/v1/finance/balances/transactions/${id}/approve`,
            REJECT: (id) => `/api/v1/finance/balances/transactions/${id}/reject`,
            PENDING: '/api/v1/finance/balances/transactions/pending',
            PENDING_COUNT: '/api/v1/finance/balances/transactions/pending/count',
            BY_ACCOUNT: (accountType, accountId) => `/api/v1/finance/balances/transactions/account/${accountType}/${accountId}`,
            DATE_RANGE: '/api/v1/finance/balances/transactions/date-range'
        }
    },

    // Inside FINANCE_ENDPOINTS object, add:

    // Accounts Payable endpoints
    ACCOUNTS_PAYABLE: {
        // Offer Financial Reviews
        OFFER_REVIEWS: {
            BASE: '/api/v1/finance/offer-reviews',
            BY_ID: (id) => `/api/v1/finance/offer-reviews/${id}`,
            PENDING: '/api/v1/finance/offer-reviews/pending',
            BY_STATUS: (status) => `/api/v1/finance/offer-reviews/status/${status}`,
            BY_OFFER: (offerId) => `/api/v1/finance/offer-reviews/offer/${offerId}`,
            REVIEW: '/api/v1/finance/offer-reviews/review',
            REVIEW_ITEMS: '/api/v1/finance/offer-reviews/review-items'
        },

        // Payment Requests
        PAYMENT_REQUESTS: {
            BASE: '/api/v1/finance/payment-requests',
            BY_ID: (id) => `/api/v1/finance/payment-requests/${id}`,
            PENDING: '/api/v1/finance/payment-requests/pending',
            READY_TO_PAY: '/api/v1/finance/payment-requests/ready-to-pay',
            BY_MERCHANT: (merchantId) => `/api/v1/finance/payment-requests/merchant/${merchantId}`,
            APPROVE_REJECT: '/api/v1/finance/payment-requests/approve-reject',
            // ✅ ADD THIS:
            CREATE_FROM_PO: (purchaseOrderId, offerId) =>
                `/api/v1/finance/payment-requests/create-from-po/${purchaseOrderId}/${offerId}`,
            // CREATE_FROM_PO: (poId) => `/api/v1/finance/payment-requests/create-from-po/${poId}`
        },

        // Payments
        PAYMENTS: {
            BASE: '/api/v1/finance/payments',
            BY_ID: (id) => `/api/v1/finance/payments/${id}`,
            PROCESS: '/api/v1/finance/payments/process',
            BY_PAYMENT_REQUEST: (prId) => `/api/v1/finance/payments/payment-request/${prId}`,
            TODAY: '/api/v1/finance/payments/today',
            BY_MERCHANT: (merchantId) => `/api/v1/finance/payments/merchant/${merchantId}`,
            HISTORY: '/api/v1/finance/payments/history'
        },

        // Refund Tracking
        REFUNDS: {
            BASE: '/api/finance/refunds',
            BY_ID: (id) => `/api/finance/refunds/${id}`,
            BY_STATUS: (status) => `/api/finance/refunds/status/${status}`,
            CONFIRM: (id) => `/api/finance/refunds/${id}/confirm`
        },

        // Dashboard
        DASHBOARD: {
            SUMMARY: '/api/v1/finance/dashboard/summary',
            BALANCES: '/api/v1/finance/dashboard/balances',
            MERCHANTS: '/api/v1/finance/dashboard/merchants'
        }
    },

    // Company Loans submodule endpoints
    COMPANY_LOANS: {
        // Financial Institutions
        INSTITUTIONS: {
            BASE: '/api/v1/finance/loans/institutions',
            BY_ID: (id) => `/api/v1/finance/loans/institutions/${id}`,
            ACTIVE: '/api/v1/finance/loans/institutions/active',
            BY_TYPE: (type) => `/api/v1/finance/loans/institutions/type/${type}`,
            SEARCH: '/api/v1/finance/loans/institutions/search',
            DEACTIVATE: (id) => `/api/v1/finance/loans/institutions/${id}/deactivate`
        },

        // Company Loans
        LOANS: {
            BASE: '/api/v1/finance/loans/company-loans',
            BY_ID: (id) => `/api/v1/finance/loans/company-loans/${id}`,
            BY_NUMBER: (loanNumber) => `/api/v1/finance/loans/company-loans/number/${loanNumber}`,
            ACTIVE: '/api/v1/finance/loans/company-loans/active',
            BY_STATUS: (status) => `/api/v1/finance/loans/company-loans/status/${status}`,
            BY_INSTITUTION: (institutionId) => `/api/v1/finance/loans/company-loans/institution/${institutionId}`,
            INSTALLMENTS: (id) => `/api/v1/finance/loans/company-loans/${id}/installments`,
            UPDATE_STATUS: (id) => `/api/v1/finance/loans/company-loans/${id}/status`,
            UPCOMING_INSTALLMENTS: '/api/v1/finance/loans/company-loans/installments/upcoming',
            OVERDUE_INSTALLMENTS: '/api/v1/finance/loans/company-loans/installments/overdue',
            MERCHANTS: '/api/v1/finance/loans/company-loans/merchants'
        },

        // Dashboard
        DASHBOARD: {
            SUMMARY: '/api/v1/finance/loans/dashboard/summary',
            MATURING_SOON: '/api/v1/finance/loans/dashboard/maturing-soon',
            MONTHLY_INSTALLMENTS: '/api/v1/finance/loans/dashboard/monthly-installments'
        }
    },
};

// Employee module endpoints
export const EMPLOYEE_ENDPOINTS = {
    BASE: '/api/v1/employees',
    BY_ID: (id) => `/api/v1/employees/${id}`,
    UNASSIGNED: '/api/v1/site/unassigned-employees',  // Updated to match backend endpoint
    DRIVERS: '/api/v1/employees/drivers',
    WAREHOUSE_WORKERS: '/api/v1/employees/warehouse-workers',
    WAREHOUSE_MANAGERS: '/api/v1/employees/warehouse-managers',
    TECHNICIANS: '/api/v1/employees/technicians',
    ATTENDANCE: {
        BY_EMPLOYEE: (employeeId) => `/api/v1/employees/${employeeId}/attendance`,
        MONTHLY: (employeeId) => `/api/v1/employees/${employeeId}/attendance/monthly`,
        GENERATE_MONTHLY: '/api/v1/employees/attendance/generate-monthly'
    }
};

// HR module endpoints
export const HR_ENDPOINTS = {
    // HR Employee Management
    EMPLOYEE: {
        BASE: '/api/v1/hr/employee',
        BY_ID: (id) => `/api/v1/hr/employee/${id}`,
        CREATE: '/api/v1/hr/employee',
        UPDATE: (id) => `/api/v1/hr/employee/${id}`,
        DELETE: (id) => `/api/v1/hr/employee/${id}`
    },

    // HR Dashboard
    DASHBOARD: {
        SALARY_STATISTICS: '/api/v1/hr/dashboard/salary-statistics',
        EMPLOYEE_DISTRIBUTION: '/api/v1/hr/dashboard/employee-distribution'
    }
};

// Site module endpoints
export const SITE_ENDPOINTS = {
    BASE: '/api/v1/site',
    BY_ID: (id) => `/api/v1/site/${id}`,
    PARTNERS: (siteId) => `/api/v1/site/${siteId}/partners`,
    UNASSIGNED_PARTNERS: (siteId) => `/api/v1/site/${siteId}/unassigned-partners`,
    EMPLOYEES: (siteId) => `/api/v1/site/${siteId}/employees`,
    EQUIPMENT: (siteId) => `/api/v1/site/${siteId}/equipment`,
    EQUIPMENT_DTO: (siteId) => `/api/v1/site/${siteId}/equipments-dto`,
    UNASSIGNED_EQUIPMENT: `/api/v1/site/unassigned-equipment`,
    WAREHOUSES: (siteId) => `/api/v1/site/${siteId}/warehouses`,
    MERCHANTS: (siteId) => `/api/v1/site/${siteId}/merchants`,
    FIXED_ASSETS: (siteId) => `/api/v1/site/${siteId}/fixedassets`,
    UNASSIGNED_FIXED_ASSETS: '/api/v1/site/unassigned-fixedassets',

    // Site Admin endpoints
    ADMIN: {
        ADD_SITE: '/siteadmin/addsite',
        DELETE_SITE: (id) => `siteadmin/${id}`,
        UPDATE_SITE: (id) => `/siteadmin/updatesite/${id}`,
        ADD_WAREHOUSE: (siteId) => `/siteadmin/${siteId}/add-warehouse`,
        ASSIGN_EQUIPMENT: (siteId, equipmentId) => `/siteadmin/${siteId}/assign-equipment/${equipmentId}`,
        REMOVE_EQUIPMENT: (siteId, equipmentId) => `/siteadmin/${siteId}/remove-equipment/${equipmentId}`,
        ASSIGN_EMPLOYEE: (siteId, employeeId) => `/siteadmin/${siteId}/assign-employee/${employeeId}`,
        REMOVE_EMPLOYEE: (siteId, employeeId) => `/siteadmin/${siteId}/remove-employee/${employeeId}`,
        ASSIGN_WAREHOUSE: (siteId, warehouseId) => `/siteadmin/${siteId}/assign-warehouse/${warehouseId}`,
        ASSIGN_FIXED_ASSET: (siteId, fixedAssetId) => `/siteadmin/${siteId}/assign-fixedAsset/${fixedAssetId}`,
        ASSIGN_PARTNER: (siteId, partnerId) => `/siteadmin/${siteId}/assign-partner/${partnerId}`,
        UPDATE_PARTNER_PERCENTAGE: (siteId, partnerId) => `/siteadmin/${siteId}/update-partner-percentage/${partnerId}`,
        REMOVE_PARTNER: (siteId, partnerId) => `/siteadmin/${siteId}/remove-partner/${partnerId}`,
        getAvailableWarehouseManagers: 'siteadmin/warehouse-managers/available',
        getAvailableWarehouseManagersForSite: (siteId) => `siteadmin/sites/${siteId}/warehouse-managers/available`,
        getAvailableWarehouseWorkers: '/siteadmin/warehouse-workers/available',
        getAvailableWarehouseWorkersForSite: (siteId) => `/siteadmin/${siteId}/warehouse-workers/available`,
        getWarehouseEmployees: (warehouseId) => `/siteadmin/warehouses/${warehouseId}/employees`,
        unassignEmployeeFromWarehouse: (warehouseId, employeeId) => `/siteadmin/warehouses/${warehouseId}/unassign-employee/${employeeId}`

    }
};

// Merchant module endpoints
// Fix this in your api.config.js
export const MERCHANT_ENDPOINTS = {
    BASE: '/api/v1/merchants',
    BY_ID: (id) => `/api/v1/merchants/${id}`,
    TRANSACTIONS: (id) => `/api/v1/merchants/${id}/transactions`,
    PERFORMANCE: (id) => `/api/v1/merchants/${id}/performance`// ADD THIS
};

// Work Type module endpoints
export const WORK_TYPE_ENDPOINTS = {
    BASE: '/api/v1/worktypes',
    MANAGEMENT: '/api/v1/worktypes/management',
    BY_ID: (id) => `/api/v1/worktypes/${id}`,
    CREATE: '/api/v1/worktypes',
    UPDATE: (id) => `/api/v1/worktypes/${id}`,
    DELETE: (id) => `/api/v1/worktypes/${id}`
};

// Contact Type module endpoints
export const CONTACT_TYPE_ENDPOINTS = {
    BASE: '/api/v1/contacttypes',
    MANAGEMENT: '/api/v1/contacttypes/management',
    ACTIVE: '/api/v1/contacttypes/active',
    BY_ID: (id) => `/api/v1/contacttypes/${id}`,
};

// Job Position module endpoints
export const JOB_POSITION_ENDPOINTS = {
    // Basic CRUD endpoints
    BASE: '/api/v1/job-positions',
    CREATE: '/api/v1/job-positions',
    CREATE_DTO: '/api/v1/job-positions/dto',
    BY_ID: (id) => `/api/v1/job-positions/${id}`,
    DTO_BY_ID: (id) => `/api/v1/job-positions/dto/${id}`,
    UPDATE: (id) => `/api/v1/job-positions/${id}`,
    UPDATE_DTO: (id) => `/api/v1/job-positions/dto/${id}`,
    DELETE: (id) => `/api/v1/job-positions/${id}`,

    // Employee-related endpoints
    EMPLOYEES: (id) => `/api/v1/job-positions/${id}/employees`,

    // Enhanced endpoints for details view
    DETAILS: (id) => `/api/v1/job-positions/${id}/details`,
    PROMOTION_STATISTICS: (id) => `/api/v1/job-positions/${id}/promotion-statistics`,
    PROMOTIONS_FROM: (id) => `/api/v1/job-positions/${id}/promotions/from`,
    PROMOTIONS_TO: (id) => `/api/v1/job-positions/${id}/promotions/to`,
    PROMOTIONS_FROM_PENDING: (id) => `/api/v1/job-positions/${id}/promotions/from/pending`,
    PROMOTIONS_TO_PENDING: (id) => `/api/v1/job-positions/${id}/promotions/to/pending`,
    CAREER_PATH_SUGGESTIONS: (id) => `/api/v1/job-positions/${id}/career-path-suggestions`,
    EMPLOYEES_ELIGIBLE_FOR_PROMOTION: (id) => `/api/v1/job-positions/${id}/employees/eligible-for-promotion`,
    SALARY_STATISTICS: (id) => `/api/v1/job-positions/${id}/salary-statistics`,
    VALIDATION: (id) => `/api/v1/job-positions/${id}/validation`,
    ANALYTICS: (id) => `/api/v1/job-positions/${id}/analytics`,
    CAN_DELETE: (id) => `/api/v1/job-positions/${id}/can-delete`,
    PROMOTION_DESTINATIONS: (id) => `/api/v1/job-positions/${id}/promotion-destinations`,
    PROMOTION_SOURCES: (id) => `/api/v1/job-positions/${id}/promotion-sources`,
    EMPLOYEE_ANALYTICS: (id) => `/api/v1/job-positions/${id}/employee-analytics`,

    // NEW: Hierarchy and Organization Structure endpoints
    HIERARCHY: '/api/v1/job-positions/hierarchy',
    CHILDREN: (id) => `/api/v1/job-positions/${id}/children`,
    PROMOTION_TARGETS: (id) => `/api/v1/job-positions/${id}/promotion-targets`,
    VALIDATE_PROMOTION_TARGET: (currentId, targetId) => `/api/v1/job-positions/${currentId}/validate-promotion/${targetId}`,
    HIERARCHY_PATH: (id) => `/api/v1/job-positions/${id}/hierarchy-path`,
    BY_HIERARCHY_LEVEL: (level) => `/api/v1/job-positions/hierarchy/level/${level}`,
    ORGANIZATION_STRUCTURE: '/api/v1/job-positions/organization-structure',

    // NEW: Promotion eligibility endpoints
    ELIGIBLE_FOR_PROMOTION_FROM: '/api/v1/job-positions/eligible-for-promotion/from',
    ELIGIBLE_FOR_PROMOTION_TO: '/api/v1/job-positions/eligible-for-promotion/to',

    // NEW: Department and validation endpoints
    DEPARTMENT_HIERARCHY: '/api/v1/job-positions/department-hierarchy',
    VALIDATE_HIERARCHY: '/api/v1/job-positions/validate-hierarchy',

    // NEW: Promotion path and navigation endpoints
    PROMOTION_PATH: (fromId, toId) => `/api/v1/job-positions/promotion-path/${fromId}/${toId}`,
    NEXT_PROMOTION_STEPS: (id) => `/api/v1/job-positions/${id}/next-promotion-steps`,
    POSITIONS_AT_RISK: '/api/v1/job-positions/at-risk',

    // NEW: Simplified promotion endpoints
    PROMOTION_STATS_SIMPLE: (id) => `/api/v1/job-positions/${id}/promotion-stats-simple`,
    PROMOTIONS_FROM_SIMPLE: (id) => `/api/v1/job-positions/${id}/promotions-from-simple`,
    PROMOTIONS_TO_SIMPLE: (id) => `/api/v1/job-positions/${id}/promotions-to-simple`
};

// Document module endpoints
export const DOCUMENT_ENDPOINTS = {
    BY_ID: (id) => `/api/v1/documents/${id}`,
    BY_ENTITY: (entityType, entityId) => `/api/v1/${entityType}/${entityId}/documents`,
    CREATE: (entityType, entityId) => `/api/v1/${entityType}/${entityId}/documents`,
    UPDATE: (id) => `/api/v1/documents/${id}`,
    DELETE: (id) => `/api/v1/documents/${id}`,

    // Sarky-specific document endpoints
    BY_SARKY_MONTH: (entityType, entityId, month, year) => `/api/v1/${entityType}/${entityId}/documents/sarky?month=${month}&year=${year}`,
    CREATE_SARKY: (entityType, entityId) => `/api/v1/${entityType}/${entityId}/documents/sarky`,
    ALL_SARKY: (entityType, entityId) => `/api/v1/${entityType}/${entityId}/documents/sarky/all`,
    ASSIGN_SARKY: (id) => `/api/v1/documents/${id}/assign-sarky`,
    REMOVE_SARKY: (id) => `/api/v1/documents/${id}/remove-sarky`,
    SARKY_TYPES: '/api/v1/documents/sarky/types'
};

// Partner module endpoints
export const PARTNER_ENDPOINTS = {
    BASE: '/api/v1/partner',
    GET_ALL: '/api/v1/partner/getallpartners',
    ADD: '/api/v1/partner/add',
    UPDATE: (id) => `/api/v1/partner/update/${id}`,
    DELETE: (id) => `/api/v1/partner/delete/${id}`
};

// Authentication module endpoints
export const AUTH_ENDPOINTS = {
    BASE: '/api/v1/auth',
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    AUTHENTICATE: '/api/v1/auth/authenticate',
    PROFILE: '/api/v1/auth/profile'
};

// Admin module endpoints
export const ADMIN_ENDPOINTS = {
    BASE: '/api/v1/admin',
    USERS: '/api/v1/admin/users',
    USER_BY_ID: (id) => `/api/v1/admin/users/${id}`,
    UPDATE_USER_ROLE: (id) => `/api/v1/admin/users/${id}/role`,
    CREATE_USER: '/api/v1/admin/users',
    DELETE_USER: (id) => `/api/v1/admin/users/${id}`
};

// Item Category module endpoints
export const ITEM_CATEGORY_ENDPOINTS = {
    BASE: '/api/v1/itemCategories',
    CREATE: '/api/v1/itemCategories',
    PARENTS: '/api/v1/itemCategories/parents',
    CHILDREN: '/api/v1/itemCategories/children',
    PARENT_CATEGORIES: '/api/v1/item-categories/parent'
};

// Request Order module endpoints
export const REQUEST_ORDER_ENDPOINTS = {
    BASE: '/api/v1/requestOrders',
    BY_ID: (id) => `/api/v1/requestOrders/${id}`,
    CREATE: '/api/v1/requestOrders',
    VALIDATE_RESTOCK: '/api/v1/requestOrders/validate-restock'
};
// Offer module endpoints
// Add these to your OFFER_ENDPOINTS in api.config.js
export const OFFER_ENDPOINTS = {
    BASE: '/api/v1/offers',
    BY_ID: (id) => `/api/v1/offers/${id}`,
    CREATE: '/api/v1/offers',
    UPDATE: (id) => `/api/v1/offers/${id}`,
    DELETE: (id) => `/api/v1/offers/${id}`,

    // Status operations
    BY_STATUS: (status) => `/api/v1/offers?status=${status}`,
    UPDATE_STATUS: (id) => `/api/v1/offers/${id}/status`,

    // Request Order operations
    REQUEST_ORDER: (offerId) => `/api/v1/offers/${offerId}/request-order`,

    // Items operations
    ADD_ITEMS: (offerId) => `/api/v1/offers/${offerId}/items`,
    GET_ITEMS: (offerId) => `/api/v1/offers/${offerId}/items`,
    UPDATE_ITEM: (itemId) => `/api/v1/offers/items/${itemId}`,
    DELETE_ITEM: (itemId) => `/api/v1/offers/items/${itemId}`,

    // Finance operations
    UPDATE_FINANCE_STATUS: (offerId) => `/api/v1/offers/${offerId}/finance-status`,
    UPDATE_ITEM_FINANCE_STATUS: (itemId) => `/api/v1/offers/offer-items/${itemId}/financeStatus`,
    BY_FINANCE_STATUS: (status) => `/api/v1/offers/finance-status/${status}`,
    COMPLETED_FINANCE: '/api/v1/offers/completed-offers',
    COMPLETE_FINANCE_REVIEW: (offerId) => `/api/v1/offers/${offerId}/complete-review`,

    // Retry operation
    RETRY: (offerId) => `/api/v1/offers/${offerId}/retry`,

    // NEW: Timeline operations
    TIMELINE: (offerId) => `/api/v1/offers/${offerId}/timeline`,
    TIMELINE_RETRYABLE: (offerId) => `/api/v1/offers/${offerId}/timeline/retryable`,
    TIMELINE_ATTEMPT: (offerId, attemptNumber) => `/api/v1/offers/${offerId}/timeline/attempt/${attemptNumber}`,
    TIMELINE_STATS: (offerId) => `/api/v1/offers/${offerId}/timeline/stats`,
    // NEW: Continue and Return endpoint
    CONTINUE_AND_RETURN: (offerId) => `/api/v1/offers/${offerId}/continue-and-return`,

    UPDATE_FINANCE_VALIDATION_STATUS: (id) => `/api/v1/offers/${id}/finance-validation-status`,
    // Request Items Modification endpoints
    REQUEST_ITEMS: (offerId) => `/api/procurement/offers/${offerId}/request-items`,
    REQUEST_ITEMS_INITIALIZE: (offerId) => `/api/procurement/offers/${offerId}/request-items/initialize`,
    REQUEST_ITEM_BY_ID: (offerId, itemId) => `/api/procurement/offers/${offerId}/request-items/${itemId}`,
    REQUEST_ITEMS_HISTORY: (offerId) => `/api/procurement/offers/${offerId}/request-items/history`,


};

export const RFQ_ENDPOINTS = {
    BASE: '/api/procurement/rfq',
    EXPORT: '/api/procurement/rfq/export',
    IMPORT_PREVIEW: (offerId) => `/api/procurement/rfq/${offerId}/import/preview`,
    IMPORT_CONFIRM: (offerId) => `/api/procurement/rfq/${offerId}/import/confirm`,
};

// Updated Candidate module endpoints
export const CANDIDATE_ENDPOINTS = {
    BASE: '/api/v1/candidates',
    BY_ID: (id) => `/api/v1/candidates/${id}`,
    BY_VACANCY: (vacancyId) => `/api/v1/candidates/vacancy/${vacancyId}`,
    CREATE: '/api/v1/candidates',
    UPDATE: (id) => `/api/v1/candidates/${id}`,
    UPDATE_STATUS: (id) => `/api/v1/candidates/${id}/status`,  // New endpoint for status updates
    DELETE: (id) => `/api/v1/candidates/${id}`,
    TO_EMPLOYEE: (id) => `/api/v1/candidates/${id}/to-employee`
};

// Vacancy module endpoints
export const VACANCY_ENDPOINTS = {
    BASE: '/api/v1/vacancies',

    // Basic CRUD operations
    CREATE: '/api/v1/vacancies',                              // POST - Create new vacancy
    GET_ALL: '/api/v1/vacancies',                            // GET - Get all vacancies
    BY_ID: (id) => `/api/v1/vacancies/${id}`,                // GET - Get vacancy by ID
    UPDATE: (id) => `/api/v1/vacancies/${id}`,               // PUT - Update vacancy
    DELETE: (id) => `/api/v1/vacancies/${id}`,               // DELETE - Delete vacancy

    // Statistics and reporting
    STATISTICS: (id) => `/api/v1/vacancies/${id}/statistics`, // GET - Get vacancy statistics

    // Candidate management
    HIRE_CANDIDATE: (candidateId) => `/api/v1/vacancies/hire-candidate/${candidateId}`, // POST - Hire a candidate

    // Potential candidates management
    MOVE_TO_POTENTIAL: (id) => `/api/v1/vacancies/${id}/move-to-potential`, // POST - Move candidates to potential list
    GET_POTENTIAL_CANDIDATES: '/api/v1/vacancies/potential-candidates'       // GET - Get all potential candidates
};

// Department module endpoints
export const DEPARTMENT_ENDPOINTS = {
    BASE: '/api/v1/departments',
    BY_ID: (id) => `/api/v1/departments/${id}`,
    CREATE: '/api/v1/departments',
    UPDATE: (id) => `/api/v1/departments/${id}`,
    DELETE: (id) => `/api/v1/departments/${id}`,
    TEST: '/api/v1/departments/test'
};

// Attendance module endpoints
export const ATTENDANCE_ENDPOINTS = {
    BASE: '/api/v1/attendance',
    BY_EMPLOYEE: (employeeId) => `/api/v1/attendance/employee/${employeeId}`,
    MONTHLY: (employeeId) => `/api/v1/attendance/employee/${employeeId}/monthly`,
    GENERATE_MONTHLY: '/api/v1/attendance/generate-monthly',
    HOURLY: '/api/v1/attendance/hourly',
    DAILY: '/api/v1/attendance/daily',
    UPDATE_STATUS: (attendanceId) => `/api/v1/attendance/${attendanceId}/status`,
    MARK_PRESENT: '/api/v1/attendance/mark-present',
    DAILY_SUMMARY: '/api/v1/attendance/daily-summary'
};

// Transaction module endpoints
export const TRANSACTION_ENDPOINTS = {
    BASE: '/api/v1/transactions',
    CREATE: '/api/v1/transactions/create',
    BY_ID: (transactionId) => `/api/v1/transactions/${transactionId}`,
    BY_BATCH: (batchNumber) => `/api/v1/transactions/batch/${batchNumber}`,
    ACCEPT: (transactionId) => `/api/v1/transactions/${transactionId}/accept`,
    REJECT: (transactionId) => `/api/v1/transactions/${transactionId}/reject`,
    UPDATE: (transactionId) => `/api/v1/transactions/${transactionId}`,
    BY_WAREHOUSE: (warehouseId) => `/api/v1/transactions/warehouse/${warehouseId}`,
    BY_EQUIPMENT: (equipmentId) => `/api/v1/transactions/equipment/${equipmentId}`
};

// Item Type module endpoints
export const ITEM_TYPE_ENDPOINTS = {
    BASE: '/api/v1/itemTypes',
    BY_ID: (id) => `/api/v1/itemTypes/${id}`,
    CREATE: '/api/v1/itemTypes',
    UPDATE: (id) => `/api/v1/itemTypes/${id}`,
    DELETE: (id) => `/api/v1/itemTypes/${id}`,
    DETAILS: (id) => `/api/v1/itemTypes/${id}/details`,  // ADD THIS
    ALL_TYPES: '/api/v1/item-types'
};

export const MEASURING_UNIT_ENDPOINTS = {
    BASE: '/api/v1/measuring-units',
    BY_ID: (id) => `/api/v1/measuring-units/${id}`,
    CREATE: '/api/v1/measuring-units',
    UPDATE: (id) => `/api/v1/measuring-units/${id}`,
    DELETE: (id) => `/api/v1/measuring-units/${id}`,
    ACTIVE: '/api/v1/measuring-units/active'
};

// Warehouse module endpoints
export const WAREHOUSE_ENDPOINTS = {
    BASE: '/api/v1/warehouses',
    BY_ID: (id) => `/api/v1/warehouses/${id}`,
    BY_SITE: (siteId) => `/api/v1/site/${siteId}/warehouses`,
    ITEMS: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}`,
    CREATE: '/api/v1/warehouses',
    UPDATE: (id) => `/api/v1/warehouses/${id}`,
    DELETE: (id) => `/api/v1/warehouses/${id}`,
    BY_EMPLOYEES: (warehouseId) => `/api/v1/warehouses/${warehouseId}/employees`

};

// Maintenance Type module endpoints
export const MAINTENANCE_TYPE_ENDPOINTS = {
    BASE: '/api/v1/maintenancetypes',
    MANAGEMENT: '/api/v1/maintenancetypes/management',
    BY_ID: (id) => `/api/v1/maintenancetypes/${id}`,
    CREATE: '/api/v1/maintenancetypes',
    UPDATE: (id) => `/api/v1/maintenancetypes/${id}`,
    DELETE: (id) => `/api/v1/maintenancetypes/${id}`
};

// InSite Maintenance module endpoints
export const INSITE_MAINTENANCE_ENDPOINTS = {
    BASE: (equipmentId) => `/api/equipment/${equipmentId}/maintenance`,
    BY_ID: (equipmentId, maintenanceId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}`,
    CREATE: (equipmentId) => `/api/equipment/${equipmentId}/maintenance`,
    UPDATE: (equipmentId, maintenanceId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}`,
    DELETE: (equipmentId, maintenanceId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}`,
    TECHNICIANS: (equipmentId) => `/api/equipment/${equipmentId}/maintenance/technicians`,
    LINK_TRANSACTION: (equipmentId, maintenanceId, transactionId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}/link-transaction/${transactionId}`,
    CREATE_TRANSACTION: (equipmentId, maintenanceId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}/transactions`,
    CHECK_TRANSACTION: (equipmentId, batchNumber) => `/api/equipment/${equipmentId}/maintenance/check-transaction/${batchNumber}`,
    VALIDATE_TRANSACTION: (equipmentId, maintenanceId, transactionId) => `/api/equipment/${equipmentId}/maintenance/${maintenanceId}/validate-transaction/${transactionId}`,
    ANALYTICS: (equipmentId) => `/api/equipment/${equipmentId}/maintenance/analytics`
};

// Item module endpoints
export const ITEM_ENDPOINTS = {
    BASE: '/api/v1/items',
    BY_ID: (itemId) => `/api/v1/items/${itemId}`,
    CREATE: '/api/v1/items',
    DELETE: (itemId) => `/api/v1/items/${itemId}`,

    // Warehouse-related endpoints
    BY_WAREHOUSE: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}`,
    WAREHOUSE_DISCREPANCIES: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}/discrepancies`,
    WAREHOUSE_RESOLVED: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}/resolved`,
    WAREHOUSE_STOLEN: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}/stolen`,
    WAREHOUSE_OVERRECEIVED: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}/overreceived`,
    WAREHOUSE_COUNTS: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}/counts`,
    WAREHOUSE_ACTIVE: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}/active`,
    WAREHOUSE_SUMMARY: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}/summary`,

    // Resolution endpoints
    RESOLVE_DISCREPANCY: '/api/v1/items/resolve-discrepancy',
    ITEM_RESOLUTIONS: (itemId) => `/api/v1/items/${itemId}/resolutions`,
    RESOLUTIONS_BY_USER: (username) => `/api/v1/items/resolutions/user/${username}`,
    RESOLUTION_HISTORY_BY_WAREHOUSE: (warehouseId) => `/api/v1/items/resolution-history/warehouse/${warehouseId}`,

    // Item capabilities
    CAN_RESOLVE: (itemId) => `/api/v1/items/${itemId}/can-resolve`,

    // Transaction details
    TRANSACTION_DETAILS: (warehouseId, itemTypeId) => `/api/v1/items/transaction-details/${warehouseId}/${itemTypeId}`
};

export const WAREHOUSE_EMPLOYEE_ENDPOINTS = {
    BASE: '/api/v1/warehouseEmployees',
    WAREHOUSE_EMPLOYEES: '/api/v1/warehouseEmployees/warehouse-employees',
    ASSIGN_WAREHOUSE: (employeeId) => `/api/v1/warehouseEmployees/${employeeId}/assign-warehouse`,
    UNASSIGN_WAREHOUSE: (employeeId) => `/api/v1/warehouseEmployees/${employeeId}/unassign-warehouse`,
    BY_USERNAME_ASSIGNMENTS: (username) => `/api/v1/warehouseEmployees/by-username/${username}/assignments`,
    WAREHOUSE_ASSIGNED_USERS: (warehouseId) => `/api/v1/warehouses/${warehouseId}/assigned-users-dto`,
    EMPLOYEE_WAREHOUSES: (employeeId) => `/api/v1/warehouseEmployees/${employeeId}/warehouses`,
    ASSIGNMENT_DETAILS: (employeeId, warehouseId) => `/api/v1/warehouseEmployees/${employeeId}/warehouses/${warehouseId}/assignment`,
    EMPLOYEE_ASSIGNMENTS: (employeeId) => `/api/v1/warehouseEmployees/${employeeId}/assignments`,
    CHECK_WAREHOUSE_ACCESS: (employeeId, warehouseId) => `/api/v1/warehouseEmployees/${employeeId}/warehouses/${warehouseId}/access`
};

export const NOTIFICATION_ENDPOINTS = {
    BASE: '/api/notifications',
    UNREAD: '/api/notifications/unread',
    UNREAD_COUNT: '/api/notifications/unread/count',
    READ_ALL: '/api/notifications/read-all',
    SEND: '/api/notifications/send',
    BROADCAST: '/api/notifications/broadcast',
    MARK_AS_READ: (id) => `/api/notifications/${id}/read`,
    DELETE: (id) => `/api/notifications/${id}`,
    WEBSOCKET: '/ws-native'
};

export const PROCUREMENT_ENDPOINTS = {
    BASE: '/api/v1/procurement',
    BY_ID: (id) => `/api/v1/procurement/${id}`,
    CREATE: '/api/v1/procurement',
    UPDATE: (id) => `/api/v1/procurement/${id}`,
    DELETE: (id) => `/api/v1/procurement/${id}`,
    BY_SITE: (siteId) => `/api/v1/procurement/site/${siteId}`,
    BY_TYPE: (type) => `/api/v1/procurement/type/${type}`,
    SEARCH: '/api/v1/procurement/search'
};

// Add this to your existing api.config.js file
// In your api.config.js or wherever PURCHASE_ORDER_ENDPOINTS is defined
// API Config
export const PURCHASE_ORDER_ENDPOINTS = {
    BASE: '/api/v1/purchaseOrders',
    BY_ID: (id) => `/api/v1/purchaseOrders/${id}`,
    WITH_DELIVERIES: (id) => `/api/v1/purchaseOrders/${id}/with-deliveries`,
    PENDING_OFFERS: '/api/v1/purchaseOrders/pending-offers',
    BY_OFFER: (offerId) => `/api/v1/purchaseOrders/offers/${offerId}/purchase-order`,
    UPDATE_STATUS: (id) => `/api/v1/purchaseOrders/${id}/status`,
    FINALIZE_OFFER: (offerId) => `/api/v1/purchaseOrders/offers/${offerId}/finalize`,
    PROCESS_DELIVERY: (id) => `/api/v1/purchaseOrders/${id}/process-delivery`,
    RESOLVE_ISSUES: () => `/api/procurement/issues/resolve`,
    GET_ISSUES: (id) => `/api/v1/purchaseOrders/${id}/issues`,
    GET_ACTIVE_ISSUES: (id) => `/api/v1/purchaseOrders/${id}/issues/active`
};


export const MAINTENANCE_ENDPOINTS = {
    // Dashboard
    DASHBOARD: '/api/maintenance/dashboard',

    // Maintenance Records
    RECORDS: {
        BASE: '/api/maintenance/records',
        BY_ID: (id) => `/api/maintenance/records/${id}`,
        CREATE: '/api/maintenance/records',
        UPDATE: (id) => `/api/maintenance/records/${id}`,
        DELETE: (id) => `/api/maintenance/records/${id}`,
        ACTIVE: '/api/maintenance/records/active',
        OVERDUE: '/api/maintenance/records/overdue',
        BY_EQUIPMENT: (equipmentId) => `/api/maintenance/records/equipment/${equipmentId}`,
        // Approval Workflow
        SUBMIT_APPROVAL: (id) => `/api/maintenance/records/${id}/submit-approval`,
        APPROVE_MANAGER: (id) => `/api/maintenance/records/${id}/approve-manager`,
        REJECT: (id) => `/api/maintenance/records/${id}/reject`
    },

    // Maintenance Steps
    STEPS: {
        BY_RECORD: (recordId) => `/api/maintenance/records/${recordId}/steps`,
        BY_ID: (stepId) => `/api/maintenance/steps/${stepId}`,
        CREATE: (recordId) => `/api/maintenance/records/${recordId}/steps`,
        UPDATE: (stepId) => `/api/maintenance/steps/${stepId}`,
        DELETE: (stepId) => `/api/maintenance/steps/${stepId}`,
        COMPLETE: (stepId) => `/api/maintenance/steps/${stepId}/complete`,
        HANDOFF: (stepId) => `/api/maintenance/steps/${stepId}/handoff`,
        ASSIGN_CONTACT: (stepId, contactId) => `/api/maintenance/steps/${stepId}/assign-contact/${contactId}`,
        MARK_AS_FINAL: (stepId) => `/api/maintenance/steps/${stepId}/mark-as-final`
    },

    // Contact Logs
    CONTACTS: {
        BY_RECORD: (recordId) => `/api/maintenance/records/${recordId}/contacts`,
        CREATE: (stepId) => `/api/maintenance/steps/${stepId}/contacts`
    },

    // Available Contacts
    AVAILABLE_CONTACTS: '/api/maintenance/available-contacts',

    // Merchants
    MERCHANTS: '/api/maintenance/merchants',

    // Users
    USERS: {
        MAINTENANCE_TEAM: '/api/maintenance/users/maintenance-team'
    }
};

// Contact Management module endpoints
export const CONTACT_ENDPOINTS = {
    BASE: '/api/contacts',
    BY_ID: (id) => `/api/contacts/${id}`,
    CREATE: '/api/contacts',
    UPDATE: (id) => `/api/contacts/${id}`,
    DELETE: (id) => `/api/contacts/${id}`,
    FILTER: '/api/contacts/filter',
    ACTIVE: '/api/contacts/active',
    BY_TYPE: (contactType) => `/api/contacts/type/${contactType}`,
    AVAILABLE: '/api/contacts/available',
    AVAILABLE_BY_SPECIALIZATION: (specialization) => `/api/contacts/available/specialization/${specialization}`,
    AVAILABLE_BY_TYPE: (contactType) => `/api/contacts/available/type/${contactType}`,
    EMERGENCY: '/api/contacts/emergency',
    SEARCH: '/api/contacts/search',
    DEACTIVATE: (id) => `/api/contacts/${id}/deactivate`,
    ACTIVATE: (id) => `/api/contacts/${id}/activate`,
    OVERDUE_ASSIGNMENTS: '/api/contacts/overdue-assignments',
    NEEDING_FOLLOWUP: '/api/contacts/needing-followup',
    STATISTICS: '/api/contacts/statistics',
    BY_MERCHANT: (merchantId) => `/api/contacts/merchant/${merchantId}`,
    WITHOUT_MERCHANT: '/api/contacts/without-merchant',
    WITH_MERCHANT: '/api/contacts/with-merchant'
};


export const LOAN_ENDPOINTS = {
    BASE: '/api/v1/payroll/loans',
    BY_ID: (id) => `/api/v1/payroll/loans/${id}`,
    BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/loans/employee/${employeeId}`,
    CREATE: '/api/v1/payroll/loans',
    UPDATE: (id) => `/api/v1/payroll/loans/${id}`,
    DELETE: (id) => `/api/v1/payroll/loans/${id}`,
    CANCEL: (id) => `/api/v1/payroll/loans/${id}/cancel`,
    REPAYMENT_SCHEDULE: (id) => `/api/v1/payroll/loans/${id}/repayment-schedule`,
    VALIDATE_LOAN_ELIGIBILITY: (employeeId) => `/api/v1/payroll/loans/validate-eligibility/${employeeId}`,
    ACTIVE_LOANS: '/api/v1/payroll/loans/active',
    PENDING_LOANS: '/api/v1/payroll/loans/pending',
    STATISTICS: '/api/v1/payroll/loans/statistics'
};

// Bonus module endpoints
export const BONUS_ENDPOINTS = {
    BASE: '/api/v1/payroll/bonuses',
    BY_ID: (id) => `/api/v1/payroll/bonuses/${id}`,
    BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/bonuses/employee/${employeeId}`,
    CREATE: '/api/v1/payroll/bonuses',
    BULK_CREATE: '/api/v1/payroll/bonuses/bulk',
    APPROVE: (id) => `/api/v1/payroll/bonuses/${id}/approve`,
    REJECT: (id) => `/api/v1/payroll/bonuses/${id}/reject`,
    CANCEL: (id) => `/api/v1/payroll/bonuses/${id}/cancel`,
    STATISTICS: '/api/v1/payroll/bonuses/statistics'
};

// Bonus Type module endpoints
export const BONUS_TYPE_ENDPOINTS = {
    BASE: '/api/v1/payroll/bonus-types',
    BY_ID: (id) => `/api/v1/payroll/bonus-types/${id}`,
    ACTIVE: '/api/v1/payroll/bonus-types/active',
    CREATE: '/api/v1/payroll/bonus-types',
    UPDATE: (id) => `/api/v1/payroll/bonus-types/${id}`,
    DEACTIVATE: (id) => `/api/v1/payroll/bonus-types/${id}`
};

// Payroll module endpoints
export const PAYROLL_ENDPOINTS = {
    BASE: '/api/v1/payroll',
    BY_ID: (id) => `/api/v1/payroll/${id}`,
    LATEST: '/api/v1/payroll/latest',
    PERIOD: '/api/v1/payroll/period',
    CREATE: '/api/v1/payroll',
    DELETE: (id) => `/api/v1/payroll/${id}`,

    // Workflow endpoints
    IMPORT_ATTENDANCE: (id) => `/api/v1/payroll/${id}/import-attendance`,
    FINALIZE_ATTENDANCE: (id) => `/api/v1/payroll/${id}/finalize-attendance`,
    ATTENDANCE_STATUS: (id) => `/api/v1/payroll/${id}/attendance-status`,
    NOTIFY_HR: (id) => `/api/v1/payroll/${id}/notify-hr`,
    RESET_ATTENDANCE: (id) => `/api/v1/payroll/${id}/reset-attendance`,
    RECALCULATE_TOTALS: (id) => `/api/v1/payroll/${id}/recalculate-totals`,

    // Leave review
    PROCESS_LEAVE_REVIEW: (id) => `/api/v1/payroll/${id}/process-leave-review`,
    FINALIZE_LEAVE: (id) => `/api/v1/payroll/${id}/finalize-leave`,
    LEAVE_STATUS: (id) => `/api/v1/payroll/${id}/leave-status`,
    LEAVE_REQUESTS: (id) => `/api/v1/payroll/${id}/leave-requests`,

    // Overtime review
    PROCESS_OVERTIME_REVIEW: (id) => `/api/v1/payroll/${id}/process-overtime-review`,
    FINALIZE_OVERTIME: (id) => `/api/v1/payroll/${id}/finalize-overtime`,
    OVERTIME_STATUS: (id) => `/api/v1/payroll/${id}/overtime-status`,
    OVERTIME_RECORDS: (id) => `/api/v1/payroll/${id}/overtime-records`,

    // Deduction review
    PROCESS_DEDUCTION_REVIEW: (id) => `/api/v1/payroll/${id}/process-deduction-review`,
    FINALIZE_DEDUCTION: (id) => `/api/v1/payroll/${id}/finalize-deduction`,
    DEDUCTION_STATUS: (id) => `/api/v1/payroll/${id}/deduction-status`,
    DEDUCTION_SUMMARIES: (id) => `/api/v1/payroll/${id}/deduction-summaries`,

    // Bonus review
    PROCESS_BONUS_REVIEW: (id) => `/api/v1/payroll/${id}/process-bonus-review`,
    FINALIZE_BONUS: (id) => `/api/v1/payroll/${id}/finalize-bonus`,
    BONUS_STATUS: (id) => `/api/v1/payroll/${id}/bonus-status`,
    BONUS_SUMMARIES: (id) => `/api/v1/payroll/${id}/bonus-summaries`,

    // Confirm and lock
    CONFIRM_LOCK: (id) => `/api/v1/payroll/${id}/confirm-lock`,

    // Send to finance (old way - kept for backward compatibility)
    SEND_TO_FINANCE: (id) => `/api/v1/payroll/${id}/send-to-finance`,

    // Batch workflow (new way)
    CREATE_BATCHES: (id) => `/api/v1/payroll/${id}/create-batches`,
    GET_BATCHES: (id) => `/api/v1/payroll/${id}/batches`,
    SEND_BATCHES_TO_FINANCE: (id) => `/api/v1/payroll/${id}/send-batches-to-finance`,
    EMPLOYEES_WITHOUT_PAYMENT_TYPE: (id) => `/api/v1/payroll/${id}/employees-without-payment-type`,

    // Employee payrolls
    EMPLOYEES: (id) => `/api/v1/payroll/${id}/employees`,
    EMPLOYEE_PAYROLL: (payrollId, employeeId) => `/api/v1/payroll/${payrollId}/employee/${employeeId}`,

    // Public holidays
    PUBLIC_HOLIDAYS: (id) => `/api/v1/payroll/${id}/public-holidays`,
    ADD_PUBLIC_HOLIDAYS: (id) => `/api/v1/payroll/${id}/add-public-holidays`
};

// Payment Type module endpoints
export const PAYMENT_TYPE_ENDPOINTS = {
    BASE: '/api/v1/payment-types',
    ALL: '/api/v1/payment-types/all',
    BY_ID: (id) => `/api/v1/payment-types/${id}`,
    BY_CODE: (code) => `/api/v1/payment-types/code/${code}`,
    CREATE: '/api/v1/payment-types',
    UPDATE: (id) => `/api/v1/payment-types/${id}`,
    DEACTIVATE: (id) => `/api/v1/payment-types/${id}/deactivate`,
    ACTIVATE: (id) => `/api/v1/payment-types/${id}/activate`
};

// Finance - Inventory Valuation Endpoints (Asset Values only)
export const INVENTORY_VALUATION_ENDPOINTS = {
    BASE: '/api/finance/inventory-valuation',

    // Warehouse Balances
    WAREHOUSE_BALANCE: (warehouseId) => `/api/finance/inventory-valuation/warehouse/${warehouseId}/balance`,

    // Site Balances (Backward Compatible)
    SITE_BALANCE: (siteId) => `/api/finance/inventory-valuation/site/${siteId}/balance`,
    ALL_SITE_BALANCES: '/api/finance/inventory-valuation/sites/balances',

    // Site Valuations (With Expenses)
    SITE_VALUATION: (siteId) => `/api/finance/inventory-valuation/site/${siteId}/valuation`,
    ALL_SITE_VALUATIONS: '/api/finance/inventory-valuation/sites/valuations',

    // Equipment Financials
    EQUIPMENT_FINANCIALS: (equipmentId) => `/api/finance/inventory-valuation/equipment/${equipmentId}/financials`,
    EQUIPMENT_CONSUMABLES_BREAKDOWN: (equipmentId) => `/api/finance/inventory-valuation/equipment/${equipmentId}/consumables-breakdown`,

    // Warehouse Details
    WAREHOUSE_ITEMS_BREAKDOWN: (warehouseId) => `/api/finance/inventory-valuation/warehouse/${warehouseId}/items-breakdown`,
    WAREHOUSE_ITEM_HISTORY: (warehouseId) => `/api/finance/inventory-valuation/warehouse/${warehouseId}/item-history`,
};

// Procurement - Price Approvals Endpoints
export const PRICE_APPROVALS_ENDPOINTS = {
    BASE: '/api/procurement/price-approvals',

    // Pending Approvals
    PENDING_APPROVALS: '/api/procurement/price-approvals/pending',
    PENDING_APPROVALS_BY_WAREHOUSE: (warehouseId) => `/api/procurement/price-approvals/pending/warehouse/${warehouseId}`,

    // Approval Actions
    APPROVE_ITEM: (itemId) => `/api/procurement/price-approvals/approve/${itemId}`,
    APPROVE_BULK: '/api/procurement/price-approvals/approve/bulk',

    // History
    APPROVAL_HISTORY: '/api/procurement/price-approvals/history'
};

// Finance - Equipment Finance Endpoints
export const EQUIPMENT_FINANCE_ENDPOINTS = {
    BASE: '/api/v1/finance/equipment',

    // Equipment Financials
    EQUIPMENT_FINANCIALS: (equipmentId) => `/api/v1/finance/equipment/${equipmentId}/financials`,
    UPDATE_EQUIPMENT_FINANCIALS: (equipmentId) => `/api/v1/finance/equipment/${equipmentId}/update-financials`,
};

export const LOGISTICS_ENDPOINTS = {
    BASE: '/api/procurement/logistics',
    GET_ALL: '/api/procurement/logistics',
    GET_BY_ID: (id) => `/api/procurement/logistics/${id}`,
    PENDING_APPROVAL: '/api/procurement/logistics/pending-approval',
    PENDING_PAYMENT: '/api/procurement/logistics/pending-payment',  // ✅ ADD THIS
    COMPLETED: '/api/procurement/logistics/completed',  // ✅ ADD THIS
    BY_PURCHASE_ORDER: (purchaseOrderId) => `/api/procurement/logistics/purchase-order/${purchaseOrderId}`,
    TOTAL_COST: (purchaseOrderId) => `/api/procurement/logistics/purchase-order/${purchaseOrderId}/total-cost`,
    CREATE: '/api/procurement/logistics',
    UPDATE: (id) => `/api/procurement/logistics/${id}`,
    DELETE: (id) => `/api/procurement/logistics/${id}`,
};