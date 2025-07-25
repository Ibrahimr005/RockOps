import apiClient from '../utils/apiClient.js';
import { VACANCY_ENDPOINTS } from '../config/api.config.js';

export const vacancyService = {
    /**
     * Get all vacancies
     * @returns {Promise} API response with vacancies
     */
    getAll: async () => {
        try {
            return await apiClient.get(VACANCY_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching vacancies:', error);
            throw error;
        }
    },

    /**
     * Get vacancy by ID
     * @param {string} id - Vacancy ID
     * @returns {Promise} API response with vacancy
     */
    getById: async (id) => {
        try {
            return await apiClient.get(VACANCY_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching vacancy ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new vacancy
     * @param {Object} vacancyData - Vacancy data
     * @returns {Promise} API response with created vacancy
     */
    create: async (vacancyData) => {
        try {
            return await apiClient.post(VACANCY_ENDPOINTS.CREATE, vacancyData);
        } catch (error) {
            console.error('Error creating vacancy:', error);
            throw error;
        }
    },

    /**
     * Update vacancy
     * @param {string} id - Vacancy ID
     * @param {Object} vacancyData - Updated vacancy data
     * @returns {Promise} API response with updated vacancy
     */
    update: async (id, vacancyData) => {
        try {
            return await apiClient.put(VACANCY_ENDPOINTS.UPDATE(id), vacancyData);
        } catch (error) {
            console.error(`Error updating vacancy ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete vacancy
     * @param {string} id - Vacancy ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(VACANCY_ENDPOINTS.DELETE(id));
        } catch (error) {
            console.error(`Error deleting vacancy ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get vacancy statistics
     * @param {string} vacancyId - Vacancy ID
     * @returns {Promise} API response with vacancy statistics
     */
    getStatistics: async (vacancyId) => {
        try {
            return await apiClient.get(`${VACANCY_ENDPOINTS.BY_ID(vacancyId)}/statistics`);
        } catch (error) {
            console.error(`Error fetching vacancy statistics for ${vacancyId}:`, error);
            throw error;
        }
    }
}; 