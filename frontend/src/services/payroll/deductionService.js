// ========================================
// FILE: deductionService.js
// Deduction Management Service - Complete Backend Integration
// ========================================

import apiClient from '../../utils/apiClient.js';

// ========================================
// API ENDPOINTS
// ========================================

const DEDUCTION_TYPE_ENDPOINTS = {
    BASE: '/api/v1/payroll/deduction-types',
    BY_ID: (id) => `/api/v1/payroll/deduction-types/${id}`,
    BY_SITE: (siteId) => `/api/v1/payroll/deduction-types/site/${siteId}`,
    BY_CATEGORY: (category) => `/api/v1/payroll/deduction-types/category/${category}`,
    CATEGORIES: '/api/v1/payroll/deduction-types/categories',
    REACTIVATE: (id) => `/api/v1/payroll/deduction-types/${id}/reactivate`,
    INIT_SYSTEM_TYPES: '/api/v1/payroll/deduction-types/initialize-system-types'
};

const EMPLOYEE_DEDUCTION_ENDPOINTS = {
    BASE: '/api/v1/payroll/employee-deductions',
    BY_ID: (id) => `/api/v1/payroll/employee-deductions/${id}`,
    BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/employee-deductions/employee/${employeeId}`,
    ACTIVE_BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/employee-deductions/employee/${employeeId}/active`,
    BY_PERIOD: (employeeId) => `/api/v1/payroll/employee-deductions/employee/${employeeId}/period`,
    REACTIVATE: (id) => `/api/v1/payroll/employee-deductions/${id}/reactivate`,
    PERMANENT_DELETE: (id) => `/api/v1/payroll/employee-deductions/${id}/permanent`,
    CALCULATION_METHODS: '/api/v1/payroll/employee-deductions/calculation-methods',
    FREQUENCIES: '/api/v1/payroll/employee-deductions/frequencies',
    CALCULATE_PREVIEW: '/api/v1/payroll/employee-deductions/calculate-preview'
};

// ========================================
// DEDUCTION CATEGORIES
// ========================================

export const DEDUCTION_CATEGORY = {
    LOAN: 'LOAN',
    TAX: 'TAX',
    INSURANCE: 'INSURANCE',
    ABSENCE: 'ABSENCE',
    LATE: 'LATE',
    LEAVE: 'LEAVE',
    ADVANCE: 'ADVANCE',
    FINE: 'FINE',
    OTHER: 'OTHER'
};

export const DEDUCTION_CATEGORY_CONFIG = {
    [DEDUCTION_CATEGORY.LOAN]: { label: 'Loan', color: '#3b82f6', icon: 'money-bill' },
    [DEDUCTION_CATEGORY.TAX]: { label: 'Tax', color: '#ef4444', icon: 'file-invoice' },
    [DEDUCTION_CATEGORY.INSURANCE]: { label: 'Insurance', color: '#10b981', icon: 'shield' },
    [DEDUCTION_CATEGORY.ABSENCE]: { label: 'Absence', color: '#f59e0b', icon: 'user-times' },
    [DEDUCTION_CATEGORY.LATE]: { label: 'Late', color: '#8b5cf6', icon: 'clock' },
    [DEDUCTION_CATEGORY.LEAVE]: { label: 'Leave', color: '#06b6d4', icon: 'calendar' },
    [DEDUCTION_CATEGORY.ADVANCE]: { label: 'Advance', color: '#ec4899', icon: 'dollar-sign' },
    [DEDUCTION_CATEGORY.FINE]: { label: 'Fine', color: '#dc2626', icon: 'exclamation' },
    [DEDUCTION_CATEGORY.OTHER]: { label: 'Other', color: '#6b7280', icon: 'question' }
};

// ========================================
// SERVICE METHODS
// ========================================

export const deductionService = {
    // ========================================
    // DEDUCTION TYPE MANAGEMENT
    // ========================================

    /**
     * Get all active deduction types
     */
    getAllDeductionTypes: () => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BASE);
    },

    /**
     * Get deduction type by ID
     */
    getDeductionTypeById: (id) => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BY_ID(id));
    },

    /**
     * Get deduction types for a site
     */
    getDeductionTypesForSite: (siteId) => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BY_SITE(siteId));
    },

    /**
     * Get deduction types by category
     */
    getDeductionTypesByCategory: (category) => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BY_CATEGORY(category));
    },

    /**
     * Get all deduction categories
     */
    getDeductionCategories: () => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.CATEGORIES);
    },

    /**
     * Create a new deduction type
     */
    createDeductionType: (deductionTypeData) => {
        return apiClient.post(DEDUCTION_TYPE_ENDPOINTS.BASE, deductionTypeData);
    },

    /**
     * Update a deduction type
     */
    updateDeductionType: (id, deductionTypeData) => {
        return apiClient.put(DEDUCTION_TYPE_ENDPOINTS.BY_ID(id), deductionTypeData);
    },

    /**
     * Deactivate a deduction type
     */
    deactivateDeductionType: (id) => {
        return apiClient.delete(DEDUCTION_TYPE_ENDPOINTS.BY_ID(id));
    },

    /**
     * Reactivate a deduction type
     */
    reactivateDeductionType: (id) => {
        return apiClient.post(DEDUCTION_TYPE_ENDPOINTS.REACTIVATE(id));
    },

    /**
     * Initialize system deduction types (admin only)
     */
    initializeSystemTypes: () => {
        return apiClient.post(DEDUCTION_TYPE_ENDPOINTS.INIT_SYSTEM_TYPES);
    },

    // ========================================
    // EMPLOYEE DEDUCTION MANAGEMENT
    // ========================================

    /**
     * Get all deductions for an employee
     */
    getDeductionsByEmployee: (employeeId) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_EMPLOYEE(employeeId));
    },

    /**
     * Get active deductions for an employee
     */
    getActiveDeductionsByEmployee: (employeeId) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.ACTIVE_BY_EMPLOYEE(employeeId));
    },

    /**
     * Get deduction by ID
     */
    getDeductionById: (id) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_ID(id));
    },

    /**
     * Get deductions for a payroll period
     */
    getDeductionsForPayrollPeriod: (employeeId, startDate, endDate) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_PERIOD(employeeId), {
            params: { startDate, endDate }
        });
    },

    /**
     * Create a new employee deduction
     */
    createDeduction: (deductionData) => {
        return apiClient.post(EMPLOYEE_DEDUCTION_ENDPOINTS.BASE, deductionData);
    },

    /**
     * Update an employee deduction
     */
    updateDeduction: (id, deductionData) => {
        return apiClient.put(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_ID(id), deductionData);
    },

    /**
     * Deactivate a deduction
     */
    deactivateDeduction: (id) => {
        return apiClient.delete(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_ID(id));
    },

    /**
     * Reactivate a deduction
     */
    reactivateDeduction: (id) => {
        return apiClient.post(EMPLOYEE_DEDUCTION_ENDPOINTS.REACTIVATE(id));
    },

    /**
     * Permanently delete a deduction (admin only)
     */
    permanentlyDeleteDeduction: (id) => {
        return apiClient.delete(EMPLOYEE_DEDUCTION_ENDPOINTS.PERMANENT_DELETE(id));
    },

    // ========================================
    // UTILITY & REFERENCE DATA
    // ========================================

    /**
     * Get calculation methods
     */
    getCalculationMethods: () => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.CALCULATION_METHODS);
    },

    /**
     * Get deduction frequencies
     */
    getFrequencies: () => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.FREQUENCIES);
    },

    /**
     * Calculate deductions preview (without applying)
     */
    calculateDeductionsPreview: (employeeId, periodStart, periodEnd, grossSalary, basicSalary) => {
        return apiClient.post(EMPLOYEE_DEDUCTION_ENDPOINTS.CALCULATE_PREVIEW, {
            employeeId,
            periodStart,
            periodEnd,
            grossSalary,
            basicSalary
        });
    },

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Get category display configuration
     */
    getCategoryConfig: (category) => {
        return DEDUCTION_CATEGORY_CONFIG[category] || {
            label: category || 'Unknown',
            color: '#6b7280',
            icon: 'question'
        };
    },

    /**
     * Format currency amount
     */
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    },

    /**
     * Format percentage
     */
    formatPercentage: (value) => {
        return `${(value || 0).toFixed(2)}%`;
    },

    /**
     * Calculate statistics from deductions array
     */
    calculateStatistics: (deductions = []) => {
        const stats = {
            total: deductions.length,
            active: 0,
            inactive: 0,
            totalAmount: 0,
            byCategory: {}
        };

        deductions.forEach(deduction => {
            if (deduction.isActive !== false) {
                stats.active++;
            } else {
                stats.inactive++;
            }

            stats.totalAmount += parseFloat(deduction.amount || 0);

            const category = deduction.category || 'OTHER';
            if (!stats.byCategory[category]) {
                stats.byCategory[category] = { count: 0, amount: 0 };
            }
            stats.byCategory[category].count++;
            stats.byCategory[category].amount += parseFloat(deduction.amount || 0);
        });

        return stats;
    },

    /**
     * Validate deduction data before creation/update
     */
    validateDeduction: (deductionData) => {
        const errors = {};

        if (!deductionData.employeeId) {
            errors.employeeId = 'Employee is required';
        }

        if (!deductionData.deductionTypeId) {
            errors.deductionTypeId = 'Deduction type is required';
        }

        if (!deductionData.amount && !deductionData.percentage) {
            errors.amount = 'Either amount or percentage is required';
        }

        if (deductionData.amount && deductionData.amount < 0) {
            errors.amount = 'Amount cannot be negative';
        }

        if (deductionData.percentage && (deductionData.percentage < 0 || deductionData.percentage > 100)) {
            errors.percentage = 'Percentage must be between 0 and 100';
        }

        if (!deductionData.effectiveDate) {
            errors.effectiveDate = 'Effective date is required';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

export default deductionService;
