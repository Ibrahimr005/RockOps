import apiClient from '../../utils/apiClient';
import { LOGISTICS_ENDPOINTS } from '../../config/api.config';

export const logisticsService = {
    /**
     * Get all logistics entries for a purchase order
     */
    getByPurchaseOrder: async (purchaseOrderId) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.BY_PURCHASE_ORDER(purchaseOrderId));
        return response.data || response;
    },

    /**
     * Get total logistics cost for a purchase order
     */
    getTotalCost: async (purchaseOrderId) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.TOTAL_COST(purchaseOrderId));
        return response.data || response;
    },

    /**
     * Create new logistics entry
     */
    create: async (logisticsData) => {
        const response = await apiClient.post(LOGISTICS_ENDPOINTS.CREATE, logisticsData);
        return response.data || response;
    },

    /**
     * Update existing logistics entry
     */
    update: async (id, logisticsData) => {
        const response = await apiClient.put(LOGISTICS_ENDPOINTS.UPDATE(id), logisticsData);
        return response.data || response;
    },

    /**
     * Delete logistics entry
     */
    delete: async (id) => {
        const response = await apiClient.delete(LOGISTICS_ENDPOINTS.DELETE(id));
        return response.data || response;
    }
};