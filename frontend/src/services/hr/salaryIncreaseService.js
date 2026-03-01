// ========================================
// FILE: salaryIncreaseService.js
// Salary Increase Request Service
// ========================================

import apiClient from '../../utils/apiClient.js';
import { SALARY_INCREASE_ENDPOINTS } from '../../config/api.config.js';

export const SALARY_INCREASE_STATUS = {
    PENDING_HR: 'PENDING_HR',
    PENDING_FINANCE: 'PENDING_FINANCE',
    APPROVED: 'APPROVED',
    APPLIED: 'APPLIED',
    REJECTED: 'REJECTED'
};

export const SALARY_INCREASE_STATUS_CONFIG = {
    [SALARY_INCREASE_STATUS.PENDING_HR]: { label: 'Pending HR', color: '#d97706', bgColor: '#fef3c7' },
    [SALARY_INCREASE_STATUS.PENDING_FINANCE]: { label: 'Pending Finance', color: '#2563eb', bgColor: '#dbeafe' },
    [SALARY_INCREASE_STATUS.APPROVED]: { label: 'Approved', color: '#16a34a', bgColor: '#dcfce7' },
    [SALARY_INCREASE_STATUS.APPLIED]: { label: 'Applied', color: '#059669', bgColor: '#d1fae5' },
    [SALARY_INCREASE_STATUS.REJECTED]: { label: 'Rejected', color: '#dc2626', bgColor: '#fee2e2' }
};

export const REQUEST_TYPE_CONFIG = {
    EMPLOYEE_LEVEL: { label: 'Employee Level', color: '#7c3aed', bgColor: '#ede9fe' },
    POSITION_LEVEL: { label: 'Position Level', color: '#0891b2', bgColor: '#cffafe' }
};

export const salaryIncreaseService = {
    /**
     * Create a salary increase request
     */
    createRequest: (data) => {
        return apiClient.post(SALARY_INCREASE_ENDPOINTS.BASE, data);
    },

    /**
     * Get all requests with optional filters
     */
    getAll: (params = {}) => {
        return apiClient.get(SALARY_INCREASE_ENDPOINTS.BASE, { params });
    },

    /**
     * Get a single request by ID
     */
    getById: (id) => {
        return apiClient.get(SALARY_INCREASE_ENDPOINTS.BY_ID(id));
    },

    /**
     * Get statistics
     */
    getStatistics: () => {
        return apiClient.get(SALARY_INCREASE_ENDPOINTS.STATISTICS);
    },

    /**
     * HR approve/reject a request
     */
    hrDecision: (id, approved, comments = '', rejectionReason = '') => {
        return apiClient.put(SALARY_INCREASE_ENDPOINTS.HR_DECISION(id), { approved, comments, rejectionReason });
    },

    /**
     * Finance approve/reject a request
     */
    financeDecision: (id, approved, comments = '', rejectionReason = '') => {
        return apiClient.put(SALARY_INCREASE_ENDPOINTS.FINANCE_DECISION(id), { approved, comments, rejectionReason });
    },

    /**
     * Get salary history for an employee
     */
    getEmployeeHistory: (employeeId) => {
        return apiClient.get(SALARY_INCREASE_ENDPOINTS.EMPLOYEE_HISTORY(employeeId));
    },

    /**
     * Get status display config
     */
    getStatusConfig: (status) => {
        return SALARY_INCREASE_STATUS_CONFIG[status] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
    },

    /**
     * Get request type display config
     */
    getRequestTypeConfig: (type) => {
        return REQUEST_TYPE_CONFIG[type] || { label: type || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
    }
};

export default salaryIncreaseService;
