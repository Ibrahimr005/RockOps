// src/services/merchantService.js
import apiClient from '../utils/apiClient';
import { MERCHANT_ENDPOINTS } from '../config/api.config';

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