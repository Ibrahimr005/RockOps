import apiClient from '../utils/apiClient';
import { WAREHOUSE_ENDPOINTS } from '../config/api.config';

export const warehouseService = {
    // Get all warehouses
    getAll: () => {
        return apiClient.get(WAREHOUSE_ENDPOINTS.BASE);
    },

    // Get warehouse by ID
    getById: (id) => {
        return apiClient.get(WAREHOUSE_ENDPOINTS.BY_ID(id));
    },

    // Get warehouses by site ID
    getBySite: (siteId) => {
        return apiClient.get(WAREHOUSE_ENDPOINTS.BY_SITE(siteId));
    },

    // Get items in a warehouse
    getItems: (warehouseId) => {
        return apiClient.get(WAREHOUSE_ENDPOINTS.ITEMS(warehouseId));
    },

    // Get warehouse inventory
    getInventory: (warehouseId) => {
        return apiClient.get(`/api/v1/warehouses/${warehouseId}/inventory`);
    },

    // Create a new warehouse
    create: (warehouseData) => {
        return apiClient.post(WAREHOUSE_ENDPOINTS.CREATE, warehouseData);
    },

    // Update a warehouse
    update: (id, warehouseData) => {
        return apiClient.put(WAREHOUSE_ENDPOINTS.UPDATE(id), warehouseData);
    },

    // Delete a warehouse
    delete: (id) => {
        return apiClient.delete(WAREHOUSE_ENDPOINTS.DELETE(id));
    }
}; 