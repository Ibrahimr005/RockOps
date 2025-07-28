// src/services/requestOrderService.js
import apiClient from '../../utils/apiClient.js';
import { REQUEST_ORDER_ENDPOINTS } from '../../config/api.config.js';

export const requestOrderService = {
    getAll: async () => {
        const response = await apiClient.get(REQUEST_ORDER_ENDPOINTS.BASE);
        return response.data || response;
    },

    getById: async (id) => {
        const response = await apiClient.get(REQUEST_ORDER_ENDPOINTS.BY_ID(id));
        return response.data || response;
    },

    create: async (requestData) => {
        const response = await apiClient.post(REQUEST_ORDER_ENDPOINTS.CREATE, requestData);
        return response.data || response;
    },

    update: async (id, requestData) => {
        const response = await apiClient.put(REQUEST_ORDER_ENDPOINTS.BY_ID(id), requestData);
        return response.data || response;
    },

    updateStatus: async (id, status) => {
        const response = await apiClient.put(`${REQUEST_ORDER_ENDPOINTS.BY_ID(id)}/status`, { status });
        return response.data || response;
    },

    getByWarehouseAndStatus: async (warehouseId, status) => {
        const response = await apiClient.get(REQUEST_ORDER_ENDPOINTS.BASE + '/warehouse', {
            params: {
                warehouseId,
                status
            }
        });
        return response.data || response;
    },

    delete: async (id) => {
        const response = await apiClient.delete(REQUEST_ORDER_ENDPOINTS.BY_ID(id));
        return response.data || response;
    }
};