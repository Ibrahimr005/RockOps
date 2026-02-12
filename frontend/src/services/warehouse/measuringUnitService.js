import apiClient from '../../utils/apiClient.js';
import { MEASURING_UNIT_ENDPOINTS } from '../../config/api.config.js';

export const measuringUnitService = {
    // Get all measuring units
    getAll: async () => {
        const response = await apiClient.get(MEASURING_UNIT_ENDPOINTS.BASE);
        return response.data || response;
    },

    // Get only active measuring units
    getActive: async () => {
        const response = await apiClient.get(MEASURING_UNIT_ENDPOINTS.ACTIVE);
        return response.data || response;
    },

    // Get measuring unit by ID
    getById: async (id) => {
        const response = await apiClient.get(MEASURING_UNIT_ENDPOINTS.BY_ID(id));
        return response.data || response;
    },

    // Create a new measuring unit
    create: async (unitData) => {
        const response = await apiClient.post(MEASURING_UNIT_ENDPOINTS.CREATE, unitData);
        return response.data || response;
    },

    // Update a measuring unit
    update: async (id, unitData) => {
        const response = await apiClient.put(MEASURING_UNIT_ENDPOINTS.UPDATE(id), unitData);
        return response.data || response;
    },

    // Delete (deactivate) a measuring unit
    delete: async (id) => {
        const response = await apiClient.delete(MEASURING_UNIT_ENDPOINTS.DELETE(id));
        return response.data || response;
    }
};