// src/services/hrEmployeeService.js
import apiClient from '../utils/apiClient.js';
import { HR_ENDPOINTS } from '../config/api.config.js';

export const hrEmployeeService = {
    /**
     * Get HR employee by ID
     * @param {string} id - Employee ID
     * @returns {Promise} API response with employee
     */
    getById: async (id) => {
        try {
            return await apiClient.get(HR_ENDPOINTS.EMPLOYEE.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching HR employee ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new HR employee
     * @param {Object} employeeData - Employee data
     * @returns {Promise} API response with created employee
     */
    create: async (employeeData) => {
        try {
            return await apiClient.post(HR_ENDPOINTS.EMPLOYEE.CREATE, employeeData);
        } catch (error) {
            console.error('Error creating HR employee:', error);
            throw error;
        }
    },

    /**
     * Update HR employee
     * @param {string} id - Employee ID
     * @param {Object} employeeData - Updated employee data
     * @returns {Promise} API response with updated employee
     */
    update: async (id, employeeData) => {
        try {
            return await apiClient.put(HR_ENDPOINTS.EMPLOYEE.UPDATE(id), employeeData);
        } catch (error) {
            console.error(`Error updating HR employee ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete HR employee
     * @param {string} id - Employee ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(HR_ENDPOINTS.EMPLOYEE.DELETE(id));
        } catch (error) {
            console.error(`Error deleting HR employee ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get salary statistics
     * @returns {Promise} API response with salary statistics
     */
    getSalaryStatistics: async () => {
        try {
            return await apiClient.get(HR_ENDPOINTS.DASHBOARD.SALARY_STATISTICS);
        } catch (error) {
            console.error('Error fetching salary statistics:', error);
            throw error;
        }
    },

    /**
     * Get employee distribution
     * @returns {Promise} API response with employee distribution
     */
    getEmployeeDistribution: async () => {
        try {
            return await apiClient.get(HR_ENDPOINTS.DASHBOARD.EMPLOYEE_DISTRIBUTION);
        } catch (error) {
            console.error('Error fetching employee distribution:', error);
            throw error;
        }
    }
};