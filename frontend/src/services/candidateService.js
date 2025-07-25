import apiClient from '../utils/apiClient.js';
import { CANDIDATE_ENDPOINTS } from '../config/api.config.js';

export const candidateService = {
    /**
     * Get all candidates
     * @returns {Promise} API response with candidates
     */
    getAll: async () => {
        try {
            return await apiClient.get(CANDIDATE_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching candidates:', error);
            throw error;
        }
    },

    /**
     * Get candidate by ID
     * @param {string} id - Candidate ID
     * @returns {Promise} API response with candidate
     */
    getById: async (id) => {
        try {
            return await apiClient.get(CANDIDATE_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching candidate ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get candidates by vacancy
     * @param {string} vacancyId - Vacancy ID
     * @returns {Promise} API response with candidates
     */
    getByVacancy: async (vacancyId) => {
        try {
            return await apiClient.get(CANDIDATE_ENDPOINTS.BY_VACANCY(vacancyId));
        } catch (error) {
            console.error(`Error fetching candidates for vacancy ${vacancyId}:`, error);
            throw error;
        }
    },

    /**
     * Create new candidate
     * @param {Object} candidateData - Candidate data
     * @returns {Promise} API response with created candidate
     */
    create: async (candidateData) => {
        try {
            return await apiClient.post(CANDIDATE_ENDPOINTS.CREATE, candidateData);
        } catch (error) {
            console.error('Error creating candidate:', error);
            throw error;
        }
    },

    /**
     * Update candidate
     * @param {string} id - Candidate ID
     * @param {Object} candidateData - Updated candidate data
     * @returns {Promise} API response with updated candidate
     */
    update: async (id, candidateData) => {
        try {
            return await apiClient.put(CANDIDATE_ENDPOINTS.UPDATE(id), candidateData);
        } catch (error) {
            console.error(`Error updating candidate ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete candidate
     * @param {string} id - Candidate ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(CANDIDATE_ENDPOINTS.DELETE(id));
        } catch (error) {
            console.error(`Error deleting candidate ${id}:`, error);
            throw error;
        }
    },

    /**
     * Convert candidate to employee
     * @param {string} id - Candidate ID
     * @returns {Promise} API response with converted employee
     */
    convertToEmployee: async (id) => {
        try {
            return await apiClient.post(CANDIDATE_ENDPOINTS.TO_EMPLOYEE(id));
        } catch (error) {
            console.error(`Error converting candidate ${id} to employee:`, error);
            throw error;
        }
    },

    /**
     * Update candidate status
     * @param {string} id - Candidate ID
     * @param {string} status - New status
     * @returns {Promise} API response
     */
    updateStatus: async (id, status) => {
        try {
            return await apiClient.put(CANDIDATE_ENDPOINTS.BY_ID(id) + '/status', null, {
                params: { status }
            });
        } catch (error) {
            console.error(`Error updating candidate ${id} status:`, error);
            throw error;
        }
    },

    /**
     * Hire candidate
     * @param {string} candidateId - Candidate ID
     * @returns {Promise} API response
     */
    hireCandidate: async (candidateId) => {
        try {
            return await apiClient.post(`/api/v1/vacancies/hire-candidate/${candidateId}`);
        } catch (error) {
            console.error(`Error hiring candidate ${candidateId}:`, error);
            throw error;
        }
    }
}; 