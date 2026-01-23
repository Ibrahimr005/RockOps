// frontend/src/services/payroll/deductionTypeService.js
import apiClient from '../../utils/apiClient.js';

// Deduction Type API endpoints
const DEDUCTION_TYPE_ENDPOINTS = {
    BASE: '/api/v1/payroll/deduction-types',
    BY_ID: (id) => `/api/v1/payroll/deduction-types/${id}`,
    BY_SITE: (siteId) => `/api/v1/payroll/deduction-types/site/${siteId}`,
    BY_CATEGORY: (category) => `/api/v1/payroll/deduction-types/category/${category}`,
    CATEGORIES: '/api/v1/payroll/deduction-types/categories',
    REACTIVATE: (id) => `/api/v1/payroll/deduction-types/${id}/reactivate`,
    INITIALIZE: '/api/v1/payroll/deduction-types/initialize-system-types'
};

export const deductionTypeService = {
    // Get all active deduction types
    getAllDeductionTypes: () => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BASE);
    },

    // Get deduction types for a specific site
    getDeductionTypesForSite: (siteId) => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BY_SITE(siteId));
    },

    // Get deduction type by ID
    getDeductionTypeById: (id) => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BY_ID(id));
    },

    // Get deduction types by category
    getDeductionTypesByCategory: (category) => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.BY_CATEGORY(category));
    },

    // Get available categories
    getCategories: () => {
        return apiClient.get(DEDUCTION_TYPE_ENDPOINTS.CATEGORIES);
    },

    // Create a new deduction type
    createDeductionType: (deductionTypeData) => {
        return apiClient.post(DEDUCTION_TYPE_ENDPOINTS.BASE, deductionTypeData);
    },

    // Update a deduction type
    updateDeductionType: (id, deductionTypeData) => {
        return apiClient.put(DEDUCTION_TYPE_ENDPOINTS.BY_ID(id), deductionTypeData);
    },

    // Deactivate a deduction type
    deactivateDeductionType: (id) => {
        return apiClient.delete(DEDUCTION_TYPE_ENDPOINTS.BY_ID(id));
    },

    // Reactivate a deduction type
    reactivateDeductionType: (id) => {
        return apiClient.post(DEDUCTION_TYPE_ENDPOINTS.REACTIVATE(id));
    },

    // Initialize system deduction types (admin only)
    initializeSystemTypes: () => {
        return apiClient.post(DEDUCTION_TYPE_ENDPOINTS.INITIALIZE);
    }
};

export default deductionTypeService;
