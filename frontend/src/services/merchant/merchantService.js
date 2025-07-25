// src/services/merchantService.js
import apiClient from '../../utils/apiClient.js';
import { MERCHANT_ENDPOINTS } from '../../config/api.config.js';

export const merchantService = {
    getAll: () => {
        return apiClient.get(MERCHANT_ENDPOINTS.BASE);
    },

    getAllMerchants: () => {
        return apiClient.get(MERCHANT_ENDPOINTS.BASE);
    },

    getById: (id) => {
        return apiClient.get(MERCHANT_ENDPOINTS.BY_ID(id));
    }
}; 