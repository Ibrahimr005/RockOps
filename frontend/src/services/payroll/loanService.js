// ========================================
// FILE: loanService.js
// Loan Management Service - Complete Backend Integration
// ========================================

import apiClient from '../../utils/apiClient.js';

// ========================================
// API ENDPOINTS
// ========================================

const LOAN_ENDPOINTS = {
    // Base CRUD
    BASE: '/api/v1/payroll/loans',
    BY_ID: (id) => `/api/v1/payroll/loans/${id}`,
    BY_NUMBER: (loanNumber) => `/api/v1/payroll/loans/number/${loanNumber}`,
    BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/loans/employee/${employeeId}`,
    ACTIVE: '/api/v1/payroll/loans/active',

    // HR Workflow
    HR_APPROVE: (id) => `/api/v1/payroll/loans/${id}/approve`,
    HR_REJECT: (id) => `/api/v1/payroll/loans/${id}/reject`,

    // Finance Integration
    SEND_TO_FINANCE: (id) => `/api/v1/payroll/loans/${id}/send-to-finance`,
    FINANCE_PENDING: '/api/v1/payroll/loans/finance/pending',
    FINANCE_ACTIVE: '/api/v1/payroll/loans/finance/active',
    FINANCE_REQUEST: (id) => `/api/v1/payroll/loans/finance/${id}`,
    FINANCE_APPROVE: '/api/v1/payroll/loans/finance/approve',
    FINANCE_REJECT: '/api/v1/payroll/loans/finance/reject',
    SET_DISBURSEMENT_SOURCE: '/api/v1/payroll/loans/finance/set-disbursement-source',
    DISBURSE: '/api/v1/payroll/loans/finance/disburse',
    FINANCE_DASHBOARD: '/api/v1/payroll/loans/finance/dashboard-summary',

    // Utility
    STATUSES: '/api/v1/payroll/loans/statuses',
    FINANCE_STATUSES: '/api/v1/payroll/loans/finance-statuses'
};

// ========================================
// STATUS CONSTANTS
// ========================================

export const LOAN_STATUS = {
    DRAFT: 'DRAFT',
    PENDING_HR_APPROVAL: 'PENDING_HR_APPROVAL',
    HR_APPROVED: 'HR_APPROVED',
    HR_REJECTED: 'HR_REJECTED',
    PENDING_FINANCE: 'PENDING_FINANCE',
    FINANCE_APPROVED: 'FINANCE_APPROVED',
    FINANCE_REJECTED: 'FINANCE_REJECTED',
    DISBURSED: 'DISBURSED',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    // Legacy statuses
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
};

export const LOAN_STATUS_CONFIG = {
    [LOAN_STATUS.DRAFT]: { label: 'Draft', color: '#6b7280', bgColor: '#f3f4f6' },
    [LOAN_STATUS.PENDING_HR_APPROVAL]: { label: 'Pending HR', color: '#d97706', bgColor: '#fef3c7' },
    [LOAN_STATUS.PENDING]: { label: 'Pending HR', color: '#d97706', bgColor: '#fef3c7' },
    [LOAN_STATUS.HR_APPROVED]: { label: 'HR Approved', color: '#059669', bgColor: '#d1fae5' },
    [LOAN_STATUS.HR_REJECTED]: { label: 'HR Rejected', color: '#dc2626', bgColor: '#fee2e2' },
    [LOAN_STATUS.PENDING_FINANCE]: { label: 'Pending Finance', color: '#2563eb', bgColor: '#dbeafe' },
    [LOAN_STATUS.FINANCE_APPROVED]: { label: 'Finance Approved', color: '#7c3aed', bgColor: '#ede9fe' },
    [LOAN_STATUS.FINANCE_REJECTED]: { label: 'Finance Rejected', color: '#dc2626', bgColor: '#fee2e2' },
    [LOAN_STATUS.DISBURSED]: { label: 'Disbursed', color: '#0891b2', bgColor: '#cffafe' },
    [LOAN_STATUS.ACTIVE]: { label: 'Active', color: '#16a34a', bgColor: '#dcfce7' },
    [LOAN_STATUS.COMPLETED]: { label: 'Completed', color: '#65a30d', bgColor: '#ecfccb' },
    [LOAN_STATUS.CANCELLED]: { label: 'Cancelled', color: '#6b7280', bgColor: '#e5e7eb' },
    [LOAN_STATUS.APPROVED]: { label: 'Approved', color: '#059669', bgColor: '#d1fae5' },
    [LOAN_STATUS.REJECTED]: { label: 'Rejected', color: '#dc2626', bgColor: '#fee2e2' }
};

// ========================================
// SERVICE METHODS
// ========================================

export const loanService = {
    // ========================================
    // LOAN CRUD OPERATIONS
    // ========================================

    /**
     * Get all loans with optional filters
     * @param {Object} filters - { employeeId, status }
     */
    getAllLoans: async (filters = {}) => {
        const params = {};
        if (filters.employeeId) params.employeeId = filters.employeeId;
        if (filters.status) params.status = filters.status;
        return apiClient.get(LOAN_ENDPOINTS.BASE, { params });
    },

    /**
     * Get loan by ID
     */
    getLoanById: (id) => {
        return apiClient.get(LOAN_ENDPOINTS.BY_ID(id));
    },

    /**
     * Get loan by loan number
     */
    getLoanByNumber: (loanNumber) => {
        return apiClient.get(LOAN_ENDPOINTS.BY_NUMBER(loanNumber));
    },

    /**
     * Get loans by employee
     */
    getLoansByEmployee: (employeeId) => {
        return apiClient.get(LOAN_ENDPOINTS.BY_EMPLOYEE(employeeId));
    },

    /**
     * Get loans by status
     */
    getLoansByStatus: (status) => {
        return apiClient.get(LOAN_ENDPOINTS.BASE, { params: { status } });
    },

    /**
     * Get active loans
     */
    getActiveLoans: () => {
        return apiClient.get(LOAN_ENDPOINTS.ACTIVE);
    },

    /**
     * Create a new loan
     */
    createLoan: (loanData, createdBy = null) => {
        const username = createdBy || localStorage.getItem('username') || 'SYSTEM';
        return apiClient.post(LOAN_ENDPOINTS.BASE, loanData, {
            params: { createdBy: username }
        });
    },

    /**
     * Update a loan
     */
    updateLoan: (id, loanData) => {
        return apiClient.put(LOAN_ENDPOINTS.BY_ID(id), loanData);
    },

    /**
     * Cancel a loan
     */
    cancelLoan: (id, reason = 'Cancelled by user') => {
        return apiClient.delete(LOAN_ENDPOINTS.BY_ID(id), {
            params: { reason }
        });
    },

    // ========================================
    // HR APPROVAL WORKFLOW
    // ========================================

    /**
     * HR approves a loan (auto-generates finance request)
     */
    approveLoan: (id, approvedBy = null) => {
        const username = approvedBy || localStorage.getItem('username') || 'SYSTEM';
        return apiClient.post(LOAN_ENDPOINTS.HR_APPROVE(id), null, {
            params: { approvedBy: username }
        });
    },

    /**
     * HR rejects a loan
     */
    rejectLoan: (id, rejectedBy = null, reason = '') => {
        const username = rejectedBy || localStorage.getItem('username') || 'SYSTEM';
        return apiClient.post(LOAN_ENDPOINTS.HR_REJECT(id), null, {
            params: { rejectedBy: username, reason }
        });
    },

    // ========================================
    // FINANCE INTEGRATION
    // ========================================

    /**
     * Send loan to Finance for approval (manual trigger)
     */
    sendToFinance: (id) => {
        return apiClient.post(LOAN_ENDPOINTS.SEND_TO_FINANCE(id));
    },

    /**
     * Get pending finance requests
     */
    getPendingFinanceRequests: () => {
        return apiClient.get(LOAN_ENDPOINTS.FINANCE_PENDING);
    },

    /**
     * Get all active finance requests
     */
    getActiveFinanceRequests: () => {
        return apiClient.get(LOAN_ENDPOINTS.FINANCE_ACTIVE);
    },

    /**
     * Get finance request by ID
     */
    getFinanceRequestById: (id) => {
        return apiClient.get(LOAN_ENDPOINTS.FINANCE_REQUEST(id));
    },

    /**
     * Finance approves a loan with deduction plan
     */
    financeApproveLoan: (requestId, installments, monthlyAmount, firstDeductionDate, notes = '') => {
        return apiClient.post(LOAN_ENDPOINTS.FINANCE_APPROVE, {
            requestId,
            installments,
            monthlyAmount,
            firstDeductionDate,
            notes
        });
    },

    /**
     * Finance rejects a loan
     */
    financeRejectLoan: (requestId, reason) => {
        return apiClient.post(LOAN_ENDPOINTS.FINANCE_REJECT, {
            requestId,
            reason
        });
    },

    /**
     * Set disbursement source
     */
    setDisbursementSource: (requestId, paymentSourceType, paymentSourceId, paymentSourceName = '') => {
        return apiClient.post(LOAN_ENDPOINTS.SET_DISBURSEMENT_SOURCE, {
            requestId,
            paymentSourceType,
            paymentSourceId,
            paymentSourceName
        });
    },

    /**
     * Disburse loan to employee
     */
    disburseLoan: (requestId, disbursementReference = '', notes = '') => {
        return apiClient.post(LOAN_ENDPOINTS.DISBURSE, {
            requestId,
            disbursementReference,
            notes
        });
    },

    /**
     * Get Finance dashboard summary
     */
    getFinanceDashboardSummary: () => {
        return apiClient.get(LOAN_ENDPOINTS.FINANCE_DASHBOARD);
    },

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Get loan statuses
     */
    getLoanStatuses: () => {
        return apiClient.get(LOAN_ENDPOINTS.STATUSES);
    },

    /**
     * Get finance statuses
     */
    getFinanceStatuses: () => {
        return apiClient.get(LOAN_ENDPOINTS.FINANCE_STATUSES);
    },

    /**
     * Get status display configuration
     */
    getStatusConfig: (status) => {
        return LOAN_STATUS_CONFIG[status] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
    },

    /**
     * Check if loan can be edited
     */
    canEditLoan: (loan) => {
        return [LOAN_STATUS.DRAFT, LOAN_STATUS.PENDING_HR_APPROVAL, LOAN_STATUS.PENDING].includes(loan?.status);
    },

    /**
     * Check if loan is pending HR approval
     */
    isPendingHRApproval: (loan) => {
        return [LOAN_STATUS.DRAFT, LOAN_STATUS.PENDING_HR_APPROVAL, LOAN_STATUS.PENDING].includes(loan?.status);
    },

    /**
     * Check if loan is pending finance action
     */
    isPendingFinance: (loan) => {
        return [LOAN_STATUS.HR_APPROVED, LOAN_STATUS.PENDING_FINANCE, LOAN_STATUS.FINANCE_APPROVED].includes(loan?.status);
    },

    /**
     * Check if loan is active (being repaid)
     */
    isActiveLoan: (loan) => {
        return [LOAN_STATUS.ACTIVE, LOAN_STATUS.DISBURSED].includes(loan?.status);
    },

    /**
     * Format currency
     */
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    },

    /**
     * Calculate loan statistics from array of loans
     */
    calculateStatistics: (loans = []) => {
        const stats = {
            total: loans.length,
            pendingHR: 0,
            pendingFinance: 0,
            active: 0,
            completed: 0,
            cancelled: 0,
            totalAmount: 0,
            totalOutstanding: 0
        };

        loans.forEach(loan => {
            const status = loan?.status;
            if (loanService.isPendingHRApproval(loan)) stats.pendingHR++;
            else if (loanService.isPendingFinance(loan)) stats.pendingFinance++;
            else if (loanService.isActiveLoan(loan)) {
                stats.active++;
                stats.totalOutstanding += parseFloat(loan.remainingBalance || 0);
            }
            else if (status === LOAN_STATUS.COMPLETED) stats.completed++;
            else if (status === LOAN_STATUS.CANCELLED) stats.cancelled++;

            stats.totalAmount += parseFloat(loan.loanAmount || 0);
        });

        return stats;
    }
};

export default loanService;
