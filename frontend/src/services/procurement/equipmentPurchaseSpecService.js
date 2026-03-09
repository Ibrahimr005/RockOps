import apiClient from '../../utils/apiClient.js';
import { EQUIPMENT_PURCHASE_SPEC_ENDPOINTS } from '../../config/api.config.js';

export const equipmentPurchaseSpecService = {
    getAll: async () => {
        const response = await apiClient.get(EQUIPMENT_PURCHASE_SPEC_ENDPOINTS.BASE);
        return response.data || response;
    },

    getById: async (id) => {
        const response = await apiClient.get(EQUIPMENT_PURCHASE_SPEC_ENDPOINTS.BY_ID(id));
        return response.data || response;
    },

    create: async (specData) => {
        const response = await apiClient.post(EQUIPMENT_PURCHASE_SPEC_ENDPOINTS.BASE, specData);
        return response.data || response;
    },

    update: async (id, specData) => {
        const response = await apiClient.put(EQUIPMENT_PURCHASE_SPEC_ENDPOINTS.BY_ID(id), specData);
        return response.data || response;
    },

    delete: async (id) => {
        const response = await apiClient.delete(EQUIPMENT_PURCHASE_SPEC_ENDPOINTS.BY_ID(id));
        return response.data || response;
    }
};
