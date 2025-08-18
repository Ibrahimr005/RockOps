// frontend/src/services/payroll/deductionService.js
import apiClient from '../../utils/apiClient.js';

const DEDUCTION_ENDPOINTS = {
    BASE: '/api/v1/payroll/deductions',
    MANUAL: '/api/v1/payroll/deductions/manual',
    MANUAL_BY_ID: (deductionId) => `/api/v1/payroll/deductions/manual/${deductionId}`,
    MANUAL_DEACTIVATE: (deductionId) => `/api/v1/payroll/deductions/manual/${deductionId}/deactivate`,
    EMPLOYEE: (employeeId) => `/api/v1/payroll/deductions/employee/${employeeId}`,
    EMPLOYEE_ACTIVE: (employeeId) => `/api/v1/payroll/deductions/employee/${employeeId}/active`,
    EMPLOYEE_SUMMARY: (employeeId) => `/api/v1/payroll/deductions/employee/${employeeId}/summary`,
    TYPES: '/api/v1/payroll/deductions/types',
    TYPES_ACTIVE: '/api/v1/payroll/deductions/types/active',
    TYPES_BY_CATEGORY: (category) => `/api/v1/payroll/deductions/types/category/${category}`,
    TYPES_BY_ID: (typeId) => `/api/v1/payroll/deductions/types/${typeId}`,
    TYPES_DEACTIVATE: (typeId) => `/api/v1/payroll/deductions/types/${typeId}/deactivate`,
    BULK_CREATE: '/api/v1/payroll/deductions/manual/bulk',
    BULK_DEACTIVATE: '/api/v1/payroll/deductions/manual/bulk/deactivate',
    STATISTICS: '/api/v1/payroll/deductions/statistics',
    EXPORT: '/api/v1/payroll/deductions/export'
};

export const deductionService = {
    // ===== MANUAL DEDUCTION MANAGEMENT =====

    /**
     * Create new manual deduction for an employee
     * @param {Object} request - CreateManualDeductionRequest object
     * @param {string} createdBy - User who created the deduction
     * @returns {Promise} API response
     */
    createManualDeduction: (request, createdBy = 'SYSTEM') => {
        return apiClient.post(DEDUCTION_ENDPOINTS.MANUAL, request, {
            params: { createdBy }
        });
    },

    /**
     * Get manual deduction by ID
     * @param {string} deductionId - Deduction ID
     * @returns {Promise} API response
     */
    getManualDeductionById: (deductionId) => {
        return apiClient.get(DEDUCTION_ENDPOINTS.MANUAL_BY_ID(deductionId));
    },

    /**
     * Update manual deduction
     * @param {string} deductionId - Deduction ID
     * @param {Object} request - UpdateManualDeductionRequest object
     * @returns {Promise} API response
     */
    updateManualDeduction: (deductionId, request) => {
        return apiClient.put(DEDUCTION_ENDPOINTS.MANUAL_BY_ID(deductionId), request);
    },

    /**
     * Deactivate manual deduction
     * @param {string} deductionId - Deduction ID
     * @returns {Promise} API response
     */
    deactivateManualDeduction: (deductionId) => {
        return apiClient.put(DEDUCTION_ENDPOINTS.MANUAL_DEACTIVATE(deductionId));
    },

    /**
     * Delete manual deduction
     * @param {string} deductionId - Deduction ID
     * @returns {Promise} API response
     */
    deleteManualDeduction: (deductionId) => {
        return apiClient.delete(DEDUCTION_ENDPOINTS.MANUAL_BY_ID(deductionId));
    },

    // ===== EMPLOYEE DEDUCTION QUERIES =====

    /**
     * Get all manual deductions for an employee
     * @param {string} employeeId - Employee ID
     * @returns {Promise} API response
     */
    getEmployeeManualDeductions: (employeeId) => {
        return apiClient.get(DEDUCTION_ENDPOINTS.EMPLOYEE(employeeId));
    },

    /**
     * Get active manual deductions for an employee on a specific date
     * @param {string} employeeId - Employee ID
     * @param {string} asOfDate - Date in YYYY-MM-DD format (optional)
     * @returns {Promise} API response
     */
    getActiveEmployeeDeductions: (employeeId, asOfDate = null) => {
        const params = asOfDate ? { asOfDate } : {};
        return apiClient.get(DEDUCTION_ENDPOINTS.EMPLOYEE_ACTIVE(employeeId), { params });
    },

    /**
     * Get deduction summary for an employee in a period
     * @param {string} employeeId - Employee ID
     * @param {string} periodStart - Start date in YYYY-MM-DD format
     * @param {string} periodEnd - End date in YYYY-MM-DD format
     * @returns {Promise} API response
     */
    getEmployeeDeductionSummary: (employeeId, periodStart, periodEnd) => {
        return apiClient.get(DEDUCTION_ENDPOINTS.EMPLOYEE_SUMMARY(employeeId), {
            params: { periodStart, periodEnd }
        });
    },

    // ===== ADMIN QUERIES =====

    /**
     * Get all manual deductions with pagination
     * @param {number} page - Page number (0-based)
     * @param {number} size - Page size
     * @returns {Promise} API response
     */
    getAllManualDeductions: (page = 0, size = 20) => {
        return apiClient.get(DEDUCTION_ENDPOINTS.MANUAL, {
            params: { page, size }
        });
    },

    // ===== DEDUCTION TYPE MANAGEMENT =====

    /**
     * Get all deduction types
     * @returns {Promise} API response
     */
    getAllDeductionTypes: () => {
        return apiClient.get(DEDUCTION_ENDPOINTS.TYPES);
    },

    /**
     * Get active deduction types
     * @returns {Promise} API response
     */
    getActiveDeductionTypes: () => {
        return apiClient.get(DEDUCTION_ENDPOINTS.TYPES_ACTIVE);
    },

    /**
     * Get deduction types by category
     * @param {string} category - Category name
     * @returns {Promise} API response
     */
    getDeductionTypesByCategory: (category) => {
        return apiClient.get(DEDUCTION_ENDPOINTS.TYPES_BY_CATEGORY(category));
    },

    /**
     * Create new deduction type
     * @param {Object} deductionTypeDTO - DeductionTypeDTO object
     * @param {string} createdBy - User who created the type
     * @returns {Promise} API response
     */
    createDeductionType: (deductionTypeDTO, createdBy = 'SYSTEM') => {
        return apiClient.post(DEDUCTION_ENDPOINTS.TYPES, deductionTypeDTO, {
            params: { createdBy }
        });
    },

    /**
     * Update deduction type
     * @param {string} typeId - Type ID
     * @param {Object} deductionTypeDTO - DeductionTypeDTO object
     * @returns {Promise} API response
     */
    updateDeductionType: (typeId, deductionTypeDTO) => {
        return apiClient.put(DEDUCTION_ENDPOINTS.TYPES_BY_ID(typeId), deductionTypeDTO);
    },

    /**
     * Deactivate deduction type
     * @param {string} typeId - Type ID
     * @returns {Promise} API response
     */
    deactivateDeductionType: (typeId) => {
        return apiClient.put(DEDUCTION_ENDPOINTS.TYPES_DEACTIVATE(typeId));
    },

    // ===== BULK OPERATIONS =====

    /**
     * Bulk create manual deductions for multiple employees
     * @param {Array} requests - Array of CreateManualDeductionRequest objects
     * @param {string} createdBy - User who created the deductions
     * @returns {Promise} API response
     */
    bulkCreateManualDeductions: (requests, createdBy = 'SYSTEM') => {
        return apiClient.post(DEDUCTION_ENDPOINTS.BULK_CREATE, requests, {
            params: { createdBy }
        });
    },

    /**
     * Bulk deactivate manual deductions
     * @param {Array} deductionIds - Array of deduction IDs
     * @returns {Promise} API response
     */
    bulkDeactivateManualDeductions: (deductionIds) => {
        return apiClient.put(DEDUCTION_ENDPOINTS.BULK_DEACTIVATE, deductionIds);
    },

    // ===== REPORTING ENDPOINTS =====

    /**
     * Get deduction statistics
     * @param {string} fromDate - Start date in YYYY-MM-DD format (optional)
     * @param {string} toDate - End date in YYYY-MM-DD format (optional)
     * @returns {Promise} API response
     */
    getDeductionStatistics: (fromDate = null, toDate = null) => {
        const params = {};
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        return apiClient.get(DEDUCTION_ENDPOINTS.STATISTICS, { params });
    },

    /**
     * Export employee deductions for a period
     * @param {string} periodStart - Start date in YYYY-MM-DD format
     * @param {string} periodEnd - End date in YYYY-MM-DD format
     * @param {Array} employeeIds - Array of employee IDs (optional)
     * @returns {Promise} API response
     */
    exportEmployeeDeductions: (periodStart, periodEnd, employeeIds = null) => {
        const params = { periodStart, periodEnd };
        if (employeeIds && employeeIds.length > 0) {
            params.employeeIds = employeeIds;
        }
        return apiClient.get(DEDUCTION_ENDPOINTS.EXPORT, {
            params,
            responseType: 'blob'
        });
    },

    // ===== CONVENIENCE METHODS =====

    /**
     * Get deduction by ID (alias for getManualDeductionById)
     * @param {string} deductionId - Deduction ID
     * @returns {Promise} API response
     */
    getDeductionById: (deductionId) => {
        return deductionService.getManualDeductionById(deductionId);
    },

    /**
     * Search deductions with filters
     * @param {Object} searchCriteria - Search criteria object
     * @returns {Promise} API response
     */
    searchDeductions: (searchCriteria = {}) => {
        const { page = 0, size = 20, ...filters } = searchCriteria;
        return apiClient.get(DEDUCTION_ENDPOINTS.MANUAL, {
            params: { page, size, ...filters }
        });
    },

    /**
     * Get current month deductions
     * @returns {Promise} API response
     */
    getCurrentMonthDeductions: () => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        return deductionService.getDeductionStatistics(startDate, endDate);
    },

    /**
     * Get deduction types with enhanced data
     * @returns {Promise} Enhanced deduction types with statistics
     */
    getDeductionTypesWithStats: async () => {
        try {
            const [typesResponse, statsResponse] = await Promise.allSettled([
                deductionService.getAllDeductionTypes(),
                deductionService.getDeductionStatistics()
            ]);

            const types = typesResponse.status === 'fulfilled' ? typesResponse.value.data : [];
            const stats = statsResponse.status === 'fulfilled' ? statsResponse.value.data : {};

            // Enhance types with usage statistics if available
            return {
                data: types.map(type => ({
                    ...type,
                    usageCount: stats.typeUsage?.[type.id] || 0
                }))
            };
        } catch (error) {
            console.error('Error getting deduction types with stats:', error);
            throw error;
        }
    },

    /**
     * Validate deduction type before creation/update
     * @param {Object} deductionTypeData - Deduction type data to validate
     * @returns {Object} Validation result
     */
    validateDeductionType: (deductionTypeData) => {
        const errors = {};

        // Required fields
        if (!deductionTypeData.typeName?.trim()) {
            errors.typeName = 'Type name is required';
        }

        if (!deductionTypeData.category) {
            errors.category = 'Category is required';
        }

        if (!deductionTypeData.description?.trim()) {
            errors.description = 'Description is required';
        }

        // Amount configuration validation
        if (!deductionTypeData.allowCustomAmount && !deductionTypeData.allowCustomPercentage) {
            errors.amountConfiguration = 'At least one amount type must be allowed';
        }

        // Percentage validation
        if (deductionTypeData.defaultPercentage &&
            (deductionTypeData.defaultPercentage < 0 || deductionTypeData.defaultPercentage > 100)) {
            errors.defaultPercentage = 'Default percentage must be between 0 and 100';
        }

        if (deductionTypeData.maxPercentage &&
            (deductionTypeData.maxPercentage < 0 || deductionTypeData.maxPercentage > 100)) {
            errors.maxPercentage = 'Maximum percentage must be between 0 and 100';
        }

        // Amount validation
        if (deductionTypeData.defaultAmount && deductionTypeData.defaultAmount < 0) {
            errors.defaultAmount = 'Default amount cannot be negative';
        }

        if (deductionTypeData.maxAmount && deductionTypeData.maxAmount < 0) {
            errors.maxAmount = 'Maximum amount cannot be negative';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};