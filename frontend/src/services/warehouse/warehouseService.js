import apiClient from '../../utils/apiClient.js';
import { WAREHOUSE_ENDPOINTS } from '../../config/api.config.js';

export const warehouseService = {
    // Get all warehouses
    getAll: async () => {
        const response = await apiClient.get(WAREHOUSE_ENDPOINTS.BASE);
        return response.data || response;
    },

    // Get warehouse by ID
    getById: async (id) => {
        const response = await apiClient.get(WAREHOUSE_ENDPOINTS.BY_ID(id));
        return response.data || response;
    },

    // Get warehouses by site ID
    getBySite: async (siteId) => {
        const response = await apiClient.get(WAREHOUSE_ENDPOINTS.BY_SITE(siteId));
        return response.data || response;
    },

    // Get items in a warehouse
    getItems: async (warehouseId) => {
        const response = await apiClient.get(WAREHOUSE_ENDPOINTS.ITEMS(warehouseId));
        return response.data || response;
    },

    // Get warehouse inventory
    getInventory: async (warehouseId) => {
        const response = await apiClient.get(`/api/v1/warehouses/${warehouseId}/inventory`);
        return response.data || response;
    },

    // Create a new warehouse
    create: async (warehouseData) => {
        const response = await apiClient.post(WAREHOUSE_ENDPOINTS.CREATE, warehouseData);
        return response.data || response;
    },

    // Update a warehouse
    update: async (id, warehouseData) => {
        const response = await apiClient.put(WAREHOUSE_ENDPOINTS.UPDATE(id), warehouseData);
        return response.data || response;
    },

    // Delete a warehouse
    delete: async (id) => {
        const response = await apiClient.delete(WAREHOUSE_ENDPOINTS.DELETE(id));
        return response.data || response;
    },

    // Get warehouse employees
    getEmployees: async (warehouseId) => {
        const response = await apiClient.get(WAREHOUSE_ENDPOINTS.BY_EMPLOYEES(warehouseId));
        return response.data || response;
    },
};