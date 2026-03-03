// ========================================
// FILE: demotionService.js
// Demotion Request Service
// ========================================

import apiClient from '../../utils/apiClient.js';
import { DEMOTION_ENDPOINTS } from '../../config/api.config.js';

export const DEMOTION_STATUS = {
    PENDING: 'PENDING',
    DEPT_HEAD_APPROVED: 'DEPT_HEAD_APPROVED',
    HR_APPROVED: 'HR_APPROVED',
    REJECTED: 'REJECTED',
    APPLIED: 'APPLIED'
};

export const DEMOTION_STATUS_CONFIG = {
    [DEMOTION_STATUS.PENDING]: { label: 'Pending', color: '#d97706', bgColor: '#fef3c7' },
    [DEMOTION_STATUS.DEPT_HEAD_APPROVED]: { label: 'Dept Head Approved', color: '#2563eb', bgColor: '#dbeafe' },
    [DEMOTION_STATUS.HR_APPROVED]: { label: 'HR Approved', color: '#16a34a', bgColor: '#dcfce7' },
    [DEMOTION_STATUS.APPLIED]: { label: 'Applied', color: '#059669', bgColor: '#d1fae5' },
    [DEMOTION_STATUS.REJECTED]: { label: 'Rejected', color: '#dc2626', bgColor: '#fee2e2' }
};

export const demotionService = {
    createRequest: (data) => {
        return apiClient.post(DEMOTION_ENDPOINTS.BASE, data);
    },

    getAll: (params = {}) => {
        return apiClient.get(DEMOTION_ENDPOINTS.BASE, { params });
    },

    getById: (id) => {
        return apiClient.get(DEMOTION_ENDPOINTS.BY_ID(id));
    },

    getStatistics: () => {
        return apiClient.get(DEMOTION_ENDPOINTS.STATISTICS);
    },

    deptHeadDecision: (id, approved, comments = '', rejectionReason = '') => {
        return apiClient.put(DEMOTION_ENDPOINTS.DEPT_HEAD_DECISION(id), { approved, comments, rejectionReason });
    },

    hrDecision: (id, approved, comments = '', rejectionReason = '') => {
        return apiClient.put(DEMOTION_ENDPOINTS.HR_DECISION(id), { approved, comments, rejectionReason });
    },

    getStatusConfig: (status) => {
        return DEMOTION_STATUS_CONFIG[status] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
    }
};

export default demotionService;
