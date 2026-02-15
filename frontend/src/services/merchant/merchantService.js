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
    },

    getTransactions: async (merchantId) => {
        const response = await apiClient.get(MERCHANT_ENDPOINTS.TRANSACTIONS(merchantId));
        return response.data || response;
    },

    getPerformance: async (merchantId) => {  // ADD THIS METHOD
        const response = await apiClient.get(MERCHANT_ENDPOINTS.PERFORMANCE(merchantId));
        return response.data || response;
    },
    getServiceMerchants: () => {
        return apiClient.get(`${MERCHANT_ENDPOINTS.BASE}?merchantType=SERVICE`);
    },
};