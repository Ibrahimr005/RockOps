import apiClient from '../utils/apiClient.js';
import { HR_ENDPOINTS } from '../config/api.config.js';

export const hrDashboardService = {
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