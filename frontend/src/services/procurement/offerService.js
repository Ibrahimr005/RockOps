// src/services/offerService.js
import apiClient from '../../utils/apiClient.js';
import { OFFER_ENDPOINTS } from '../../config/api.config.js';

export const offerService = {
    getAll: async () => {
        const response = await apiClient.get(OFFER_ENDPOINTS.BASE);
        return response.data || response;
    },

    getById: async (id) => {
        const response = await apiClient.get(OFFER_ENDPOINTS.BY_ID(id));
        return response.data || response;
    },

    create: async (offerData) => {
        const response = await apiClient.post(OFFER_ENDPOINTS.CREATE, offerData);
        return response.data || response;
    },

    update: async (id, offerData) => {
        const response = await apiClient.put(OFFER_ENDPOINTS.UPDATE(id), offerData);
        return response.data || response;
    },

    delete: async (id) => {
        const response = await apiClient.delete(OFFER_ENDPOINTS.DELETE(id));
        return response.data || response;
    }
};