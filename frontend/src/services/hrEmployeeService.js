// src/services/hrEmployeeService.js
import apiClient from '../utils/apiClient';
import { HR_ENDPOINTS } from '../config/api.config';

export const hrEmployeeService = {
    // Employee management
    employee: {
        // Get employee by ID
        getById: (id) => {
            return apiClient.get(HR_ENDPOINTS.EMPLOYEE.BY_ID(id));
        },

        // Create new employee with multipart form data
        create: (formData) => {
            return apiClient.post(HR_ENDPOINTS.EMPLOYEE.CREATE, formData);
        },

        // Update existing employee with multipart form data
        update: (id, formData) => {
            return apiClient.put(HR_ENDPOINTS.EMPLOYEE.UPDATE(id), formData);
        },

        // Delete employee
        delete: (id) => {
            return apiClient.delete(HR_ENDPOINTS.EMPLOYEE.DELETE(id));
        }
    },

    // Dashboard operations
    dashboard: {
        // Get salary statistics
        getSalaryStatistics: () => {
            return apiClient.get(HR_ENDPOINTS.DASHBOARD.SALARY_STATISTICS);
        },

        // Get employee distribution
        getEmployeeDistribution: () => {
            return apiClient.get(HR_ENDPOINTS.DASHBOARD.EMPLOYEE_DISTRIBUTION);
        }
    }
}; 