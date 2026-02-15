import apiClient from '../../utils/apiClient';
import { LOGISTICS_ENDPOINTS } from '../../config/api.config';



export const logisticsService = {

    create: async (logisticsData) => {
        const response = await apiClient.post(LOGISTICS_ENDPOINTS.CREATE, logisticsData);
        return response.data || response;
    },

    getById: async (id) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.GET_BY_ID(id));
        return response.data || response;
    },

    getAll: async () => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.GET_ALL);
        return response.data || response;
    },

    getPendingApproval: async () => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.PENDING_APPROVAL);
        return response.data || response;
    },

    getPendingPayment: async () => {  // ✅ ADD THIS
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.PENDING_PAYMENT);
        return response.data || response;
    },

    getCompleted: async () => {  // ✅ ADD THIS
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.COMPLETED);
        return response.data || response;
    },

    getByPurchaseOrder: async (purchaseOrderId) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.BY_PURCHASE_ORDER(purchaseOrderId));
        return response.data || response;
    },

    getTotalCost: async (purchaseOrderId) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.TOTAL_COST(purchaseOrderId));
        return response.data || response;
    },

    update: async (id, logisticsData) => {
        const response = await apiClient.put(LOGISTICS_ENDPOINTS.UPDATE(id), logisticsData);
        return response.data || response;
    },

    delete: async (id) => {
        const response = await apiClient.delete(LOGISTICS_ENDPOINTS.DELETE(id));
        return response.data || response;
    },
};

export default logisticsService;