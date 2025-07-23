import apiClient from '../../utils/apiClient.js';
import { ITEM_TYPE_ENDPOINTS } from '../../config/api.config.js';

export const itemTypeService = {
    // Get all item types
    getAll: async () => {
        const response = await apiClient.get(ITEM_TYPE_ENDPOINTS.BASE);
        return response.data || response;
    },

    // Get item type by ID
    getById: async (id) => {
        const response = await apiClient.get(ITEM_TYPE_ENDPOINTS.BY_ID(id));
        return response.data || response;
    },

    // Create a new item type
    create: async (itemTypeData) => {
        const response = await apiClient.post(ITEM_TYPE_ENDPOINTS.CREATE, itemTypeData);
        return response.data || response;
    },

    // Update an item type
    update: async (id, itemTypeData) => {
        const response = await apiClient.put(ITEM_TYPE_ENDPOINTS.UPDATE(id), itemTypeData);
        return response.data || response;
    },

    // Delete an item type
    delete: async (id) => {
        const response = await apiClient.delete(ITEM_TYPE_ENDPOINTS.DELETE(id));
        return response.data || response;
    },

    // Get all item types (alternative endpoint)
    getAllTypes: async () => {
        const response = await apiClient.get(ITEM_TYPE_ENDPOINTS.ALL_TYPES);
        return response.data || response;
    }
};