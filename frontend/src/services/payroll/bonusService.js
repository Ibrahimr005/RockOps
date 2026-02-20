// ========================================
// FILE: bonusService.js
// Bonus Management Service - Complete Backend Integration
// ========================================

import apiClient from '../../utils/apiClient.js';

// ========================================
// API ENDPOINTS
// ========================================

const BONUS_ENDPOINTS = {
    BASE: '/api/v1/payroll/bonuses',
    BY_ID: (id) => `/api/v1/payroll/bonuses/${id}`,
    BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/bonuses/employee/${employeeId}`,
    BULK_CREATE: '/api/v1/payroll/bonuses/bulk',
    APPROVE: (id) => `/api/v1/payroll/bonuses/${id}/approve`,
    REJECT: (id) => `/api/v1/payroll/bonuses/${id}/reject`,
    CANCEL: (id) => `/api/v1/payroll/bonuses/${id}/cancel`,
    STATISTICS: '/api/v1/payroll/bonuses/statistics'
};

const BONUS_TYPE_ENDPOINTS = {
    BASE: '/api/v1/payroll/bonus-types',
    BY_ID: (id) => `/api/v1/payroll/bonus-types/${id}`,
    ACTIVE: '/api/v1/payroll/bonus-types/active',
    DELETE: (id) => `/api/v1/payroll/bonus-types/${id}`
};

// ========================================
// STATUS CONSTANTS
// ========================================

export const BONUS_STATUS = {
    DRAFT: 'DRAFT',
    PENDING_HR_APPROVAL: 'PENDING_HR_APPROVAL',
    HR_APPROVED: 'HR_APPROVED',
    HR_REJECTED: 'HR_REJECTED',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED'
};

export const BONUS_STATUS_CONFIG = {
    [BONUS_STATUS.DRAFT]: { label: 'Draft', color: '#6b7280', bgColor: '#f3f4f6' },
    [BONUS_STATUS.PENDING_HR_APPROVAL]: { label: 'Pending HR', color: '#d97706', bgColor: '#fef3c7' },
    [BONUS_STATUS.HR_APPROVED]: { label: 'HR Approved', color: '#059669', bgColor: '#d1fae5' },
    [BONUS_STATUS.HR_REJECTED]: { label: 'HR Rejected', color: '#dc2626', bgColor: '#fee2e2' },
    [BONUS_STATUS.PENDING_PAYMENT]: { label: 'Pending Payment', color: '#2563eb', bgColor: '#dbeafe' },
    [BONUS_STATUS.PAID]: { label: 'Paid', color: '#16a34a', bgColor: '#dcfce7' },
    [BONUS_STATUS.CANCELLED]: { label: 'Cancelled', color: '#6b7280', bgColor: '#e5e7eb' }
};

// ========================================
// HELPER: Get siteId from user context
// ========================================

const getSiteId = () => {
    try {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            return user?.site?.id || user?.siteId || '';
        }
    } catch (e) {
        // ignore parse errors
    }
    return localStorage.getItem('selectedSiteId') || localStorage.getItem('siteId') || '';
};

// ========================================
// SERVICE METHODS
// ========================================

export const bonusService = {
    // ========================================
    // BONUS CRUD OPERATIONS
    // ========================================

    /**
     * Get all bonuses with optional filters
     * @param {Object} filters - { employeeId, month, year }
     */
    getAllBonuses: async (filters = {}) => {
        const params = { siteId: getSiteId() };
        if (filters.employeeId) params.employeeId = filters.employeeId;
        if (filters.month) params.month = filters.month;
        if (filters.year) params.year = filters.year;
        return apiClient.get(BONUS_ENDPOINTS.BASE, { params });
    },

    /**
     * Get bonus by ID
     */
    getBonusById: (id) => {
        return apiClient.get(BONUS_ENDPOINTS.BY_ID(id));
    },

    /**
     * Get bonuses by employee
     */
    getBonusesByEmployee: (employeeId) => {
        return apiClient.get(BONUS_ENDPOINTS.BY_EMPLOYEE(employeeId));
    },

    /**
     * Create a single bonus
     */
    createBonus: (bonusData) => {
        return apiClient.post(BONUS_ENDPOINTS.BASE, bonusData, { params: { siteId: getSiteId() } });
    },

    /**
     * Create bonuses in bulk for multiple employees
     */
    createBulkBonus: (bulkData) => {
        return apiClient.post(BONUS_ENDPOINTS.BULK_CREATE, bulkData, { params: { siteId: getSiteId() } });
    },

    // ========================================
    // HR APPROVAL WORKFLOW
    // ========================================

    /**
     * HR approves a bonus
     */
    approveBonus: (id) => {
        return apiClient.post(BONUS_ENDPOINTS.APPROVE(id));
    },

    /**
     * HR rejects a bonus
     */
    rejectBonus: (id, reason = '') => {
        return apiClient.post(BONUS_ENDPOINTS.REJECT(id), { reason });
    },

    /**
     * Cancel a bonus
     */
    cancelBonus: (id) => {
        return apiClient.post(BONUS_ENDPOINTS.CANCEL(id));
    },

    // ========================================
    // STATISTICS
    // ========================================

    /**
     * Get bonus statistics for a site
     */
    getStatistics: () => {
        return apiClient.get(BONUS_ENDPOINTS.STATISTICS, { params: { siteId: getSiteId() } });
    },

    // ========================================
    // BONUS TYPE OPERATIONS
    // ========================================

    /**
     * Get all bonus types
     */
    getAllBonusTypes: () => {
        return apiClient.get(BONUS_TYPE_ENDPOINTS.BASE);
    },

    /**
     * Get active bonus types
     */
    getActiveBonusTypes: () => {
        return apiClient.get(BONUS_TYPE_ENDPOINTS.ACTIVE);
    },

    /**
     * Get bonus type by ID
     */
    getBonusTypeById: (id) => {
        return apiClient.get(BONUS_TYPE_ENDPOINTS.BY_ID(id));
    },

    /**
     * Create a bonus type
     */
    createBonusType: (typeData) => {
        return apiClient.post(BONUS_TYPE_ENDPOINTS.BASE, typeData);
    },

    /**
     * Update a bonus type
     */
    updateBonusType: (id, typeData) => {
        return apiClient.put(BONUS_TYPE_ENDPOINTS.BY_ID(id), typeData);
    },

    /**
     * Deactivate a bonus type (soft delete)
     */
    deactivateBonusType: (id) => {
        return apiClient.delete(BONUS_TYPE_ENDPOINTS.DELETE(id));
    },

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Get status display configuration
     */
    getStatusConfig: (status) => {
        return BONUS_STATUS_CONFIG[status] || { label: status || 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
    },

    /**
     * Check if bonus can be edited
     */
    canEditBonus: (bonus) => {
        return [BONUS_STATUS.DRAFT, BONUS_STATUS.PENDING_HR_APPROVAL].includes(bonus?.status);
    },

    /**
     * Check if bonus is pending HR approval
     */
    isPendingHRApproval: (bonus) => {
        return [BONUS_STATUS.DRAFT, BONUS_STATUS.PENDING_HR_APPROVAL].includes(bonus?.status);
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
     * Calculate bonus statistics from array of bonuses
     */
    calculateStatistics: (bonuses = []) => {
        const stats = {
            total: bonuses.length,
            pendingHR: 0,
            approved: 0,
            rejected: 0,
            paid: 0,
            cancelled: 0,
            totalAmount: 0,
            paidAmount: 0
        };

        bonuses.forEach(bonus => {
            const status = bonus?.status;
            if (bonusService.isPendingHRApproval(bonus)) stats.pendingHR++;
            else if (status === BONUS_STATUS.HR_APPROVED) stats.approved++;
            else if (status === BONUS_STATUS.HR_REJECTED) stats.rejected++;
            else if (status === BONUS_STATUS.PAID || status === BONUS_STATUS.PENDING_PAYMENT) stats.paid++;
            else if (status === BONUS_STATUS.CANCELLED) stats.cancelled++;

            stats.totalAmount += parseFloat(bonus.amount || 0);
            if (status === BONUS_STATUS.PAID) {
                stats.paidAmount += parseFloat(bonus.amount || 0);
            }
        });

        return stats;
    }
};

export default bonusService;
