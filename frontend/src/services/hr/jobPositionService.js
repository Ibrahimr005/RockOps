// src/services/jobPositionService.js
import apiClient from '../../utils/apiClient.js';
import { JOB_POSITION_ENDPOINTS } from '../../config/api.config.js';

export const jobPositionService = {
    // Get all job positions
    getAll: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BASE);
    },

    // Get all job positions as DTOs
    getAllDTOs: () => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BASE);
    },

    // Get job position by ID
    getById: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.BY_ID(id));
    },

    // Get job position DTO by ID
    getDTOById: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.DTO_BY_ID(id));
    },

    // Create new job position
    create: (jobPositionData) => {
        return apiClient.post(JOB_POSITION_ENDPOINTS.CREATE, jobPositionData);
    },

    // Create new job position using DTO
    createDTO: (jobPositionDTO) => {
        return apiClient.post(JOB_POSITION_ENDPOINTS.CREATE_DTO, jobPositionDTO);
    },

    // Update existing job position
    update: (id, jobPositionData) => {
        return apiClient.put(JOB_POSITION_ENDPOINTS.UPDATE(id), jobPositionData);
    },

    // Update existing job position using DTO
    updateDTO: (id, jobPositionDTO) => {
        return apiClient.put(JOB_POSITION_ENDPOINTS.UPDATE_DTO(id), jobPositionDTO);
    },

    // Delete job position
    delete: (id) => {
        return apiClient.delete(JOB_POSITION_ENDPOINTS.DELETE(id));
    },

    // Get employees by job position ID
    getEmployees: (id) => {
        return apiClient.get(JOB_POSITION_ENDPOINTS.EMPLOYEES(id));
    }
}; 