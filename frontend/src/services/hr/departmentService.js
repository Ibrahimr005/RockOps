// src/services/departmentService.js
import apiClient from '../../utils/apiClient.js';
import { DEPARTMENT_ENDPOINTS } from '../../config/api.config.js';

export const departmentService = {
    // Get all departments
    getAll: () => {
        return apiClient.get(DEPARTMENT_ENDPOINTS.BASE);
    },

    // Get department by ID
    getById: (id) => {
        return apiClient.get(DEPARTMENT_ENDPOINTS.BY_ID(id));
    },

    // Create new department
    create: (departmentData) => {
        return apiClient.post(DEPARTMENT_ENDPOINTS.CREATE, departmentData);
    },

    // Update existing department
    update: (id, departmentData) => {
        return apiClient.put(DEPARTMENT_ENDPOINTS.UPDATE(id), departmentData);
    },

    // Delete department
    delete: (id) => {
        return apiClient.delete(DEPARTMENT_ENDPOINTS.DELETE(id));
    },

    // Test endpoint
    test: () => {
        return apiClient.get(DEPARTMENT_ENDPOINTS.TEST);
    }
}; 