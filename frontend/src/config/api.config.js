// src/config/api.config.js
export const API_BASE_URL = 'http://localhost:8080';  // Removed /api

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
    ACCEPT_TRANSACTION_WITH_MAINTENANCE: (equipmentId, transactionId) => `/api/equipment/${equipmentId}/transactions/${transactionId}/accept-with-maintenance`
};

// Consumable Resolution endpoints
export const CONSUMABLE_ENDPOINTS = {
    RESOLVE_DISCREPANCY: '/api/v1/consumables/resolve-discrepancy',
    RESOLUTION_HISTORY: (equipmentId) => `/api/v1/consumables/resolution-history/equipment/${equipmentId}`,
    DISCREPANCIES: (equipmentId) => `/api/v1/consumables/equipment/${equipmentId}/discrepancies`,
    RESOLVED: (equipmentId) => `/api/v1/consumables/equipment/${equipmentId}/resolved`
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
    }
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
    WAREHOUSES: (siteId) => `/api/v1/site/${siteId}/warehouses`,
    MERCHANTS: (siteId) => `/api/v1/site/${siteId}/merchants`,
    FIXED_ASSETS: (siteId) => `/api/v1/site/${siteId}/fixedassets`,
    
    // Site Admin endpoints
    ADMIN: {
        ADD_SITE: '/siteadmin/addsite',
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
        REMOVE_PARTNER: (siteId, partnerId) => `/siteadmin/${siteId}/remove-partner/${partnerId}`
    }
};

// Merchant module endpoints
export const MERCHANT_ENDPOINTS = {
    BASE: '/api/v1/merchants',
    BY_ID: (id) => `/api/merchants/${id}`
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

// Job Position module endpoints
export const JOB_POSITION_ENDPOINTS = {
    BASE: '/api/v1/job-positions',
    CREATE_DTO: '/api/v1/job-positions/dto',
    BY_ID: (id) => `/api/v1/job-positions/${id}`,
    DTO_BY_ID: (id) => `/api/v1/job-positions/dto/${id}`,
    UPDATE_DTO: (id) => `/api/v1/job-positions/dto/${id}`,
    DELETE: (id) => `/api/v1/job-positions/${id}`,
    EMPLOYEES: (id) => `/api/v1/job-positions/${id}/employees`,
    CREATE: '/api/v1/job-positions',
    UPDATE: (id) => `/api/v1/job-positions/${id}`
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
    ADD: '/api/v1/partner/add'
};

// Authentication module endpoints
export const AUTH_ENDPOINTS = {
    BASE: '/api/v1/auth',
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login'
};

// Item Category module endpoints
export const ITEM_CATEGORY_ENDPOINTS = {
    BASE: '/api/v1/itemCategories',
    CREATE: '/api/v1/itemCategories',
    PARENTS: '/api/v1/itemCategories/parents',
    CHILDREN: '/api/v1/itemCategories/children'
};

// Request Order module endpoints
export const REQUEST_ORDER_ENDPOINTS = {
    BASE: '/api/v1/requestOrders',
    BY_ID: (id) => `/api/v1/requestOrders/${id}`,
    CREATE: '/api/v1/requestOrders'
};

// Offer module endpoints
export const OFFER_ENDPOINTS = {
    BASE: '/api/v1/offers',
    BY_ID: (id) => `/api/v1/offers/${id}`,
    CREATE: '/api/v1/offers',
    UPDATE: (id) => `/api/v1/offers/${id}`,
    DELETE: (id) => `/api/v1/offers/${id}`
};

// Candidate module endpoints
export const CANDIDATE_ENDPOINTS = {
    BASE: '/api/v1/candidates',
    BY_ID: (id) => `/api/v1/candidates/${id}`,
    BY_VACANCY: (vacancyId) => `/api/v1/candidates/vacancy/${vacancyId}`,
    CREATE: '/api/v1/candidates',
    UPDATE: (id) => `/api/v1/candidates/${id}`,
    DELETE: (id) => `/api/v1/candidates/${id}`,
    TO_EMPLOYEE: (id) => `/api/v1/candidates/${id}/to-employee`
};

// Vacancy module endpoints
export const VACANCY_ENDPOINTS = {
    BASE: '/api/v1/vacancies',
    BY_ID: (id) => `/api/v1/vacancies/${id}`,
    CREATE: '/api/v1/vacancies',
    UPDATE: (id) => `/api/v1/vacancies/${id}`,
    DELETE: (id) => `/api/v1/vacancies/${id}`
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
    DELETE: (id) => `/api/v1/itemTypes/${id}`
};

// Warehouse module endpoints
export const WAREHOUSE_ENDPOINTS = {
    BASE: '/api/v1/warehouses',
    BY_ID: (id) => `/api/v1/warehouses/${id}`,
    BY_SITE: (siteId) => `/api/v1/site/${siteId}/warehouses`,
    ITEMS: (warehouseId) => `/api/v1/items/warehouse/${warehouseId}`,
    CREATE: '/api/v1/warehouses',
    UPDATE: (id) => `/api/v1/warehouses/${id}`,
    DELETE: (id) => `/api/v1/warehouses/${id}`
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