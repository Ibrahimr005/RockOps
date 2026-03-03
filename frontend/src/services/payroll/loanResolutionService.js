// ========================================
// FILE: loanResolutionService.js
// Loan Resolution Request Service
// ========================================

import apiClient from '../../utils/apiClient.js';
import { LOAN_RESOLUTION_ENDPOINTS } from '../../config/api.config.js';

export const RESOLUTION_STATUS = {
    PENDING_HR: 'PENDING_HR',
    PENDING_FINANCE: 'PENDING_FINANCE',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
};

export const RESOLUTION_STATUS_CONFIG = {
    [RESOLUTION_STATUS.PENDING_HR]: { label: 'Pending HR', color: '#d97706', bgColor: '#fef3c7' },
    [RESOLUTION_STATUS.PENDING_FINANCE]: { label: 'Pending Finance', color: '#2563eb', bgColor: '#dbeafe' },
    [RESOLUTION_STATUS.APPROVED]: { label: 'Approved', color: '#16a34a', bgColor: '#dcfce7' },
    [RESOLUTION_STATUS.REJECTED]: { label: 'Rejected', color: '#dc2626', bgColor: '#fee2e2' }
};

export const loanResolutionService = {
    /**
     * Create a loan resolution request
     */
    createRequest: (loanId, reason) => {
        return apiClient.post(LOAN_RESOLUTION_ENDPOINTS.BASE, { loanId, reason });
    },

    /**
     * Get resolution requests filtered by status or loanId
     */
    getRequests: (params = {}) => {
        return apiClient.get(LOAN_RESOLUTION_ENDPOINTS.BASE, { params });
    },

    /**
     * Get a single resolution request by ID
     */
    getById: (id) => {
        return apiClient.get(LOAN_RESOLUTION_ENDPOINTS.BY_ID(id));
    },

    /**
     * Get resolution requests pending HR approval
     */
    getPendingHR: () => {
        return apiClient.get(LOAN_RESOLUTION_ENDPOINTS.BASE, { params: { status: 'PENDING_HR' } });
    },

    /**
     * Get resolution requests pending Finance approval
     */
    getPendingFinance: () => {
        return apiClient.get(LOAN_RESOLUTION_ENDPOINTS.BASE, { params: { status: 'PENDING_FINANCE' } });
    },

    /**
     * Get resolution history for a specific loan
     */
    getByLoanId: (loanId) => {
        return apiClient.get(LOAN_RESOLUTION_ENDPOINTS.BASE, { params: { loanId } });
    },

    /**
     * HR approves or rejects a resolution request
     */
    hrDecision: (id, approved, reason = '') => {
        return apiClient.put(LOAN_RESOLUTION_ENDPOINTS.HR_DECISION(id), { approved, reason });
    },

    /**
     * Finance approves or rejects a resolution request
     */
    financeDecision: (id, approved, reason = '') => {
        return apiClient.put(LOAN_RESOLUTION_ENDPOINTS.FINANCE_DECISION(id), { approved, reason });
    },

    /**
     * Get status display config
     */
    getStatusConfig: (status) => {
        return RESOLUTION_STATUS_CONFIG[status] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
    }
};

export default loanResolutionService;
