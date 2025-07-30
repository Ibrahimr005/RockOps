// src/services/candidateService.js
import apiClient from '../../utils/apiClient.js';
import { CANDIDATE_ENDPOINTS } from '../../config/api.config.js';

export const candidateService = {
    // Get all candidates
    getAll: () => {
        return apiClient.get(CANDIDATE_ENDPOINTS.BASE);
    },

    // Get candidate by ID
    getById: (id) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.BY_ID(id));
    },

    // Get candidates by vacancy ID
    getByVacancy: (vacancyId) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.BY_VACANCY(vacancyId));
    },

    // Create new candidate with multipart form data
    create: (formData) => {
        return apiClient.post(CANDIDATE_ENDPOINTS.CREATE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Update existing candidate with multipart form data
    update: (id, formData) => {
        return apiClient.put(CANDIDATE_ENDPOINTS.UPDATE(id), formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Delete candidate
    delete: (id) => {
        return apiClient.delete(CANDIDATE_ENDPOINTS.DELETE(id));
    },

    // Convert candidate to employee data
    convertToEmployee: (id) => {
        return apiClient.get(CANDIDATE_ENDPOINTS.TO_EMPLOYEE(id));
    }
}; 