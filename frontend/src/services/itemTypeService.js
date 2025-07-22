import apiClient from '../utils/apiClient';
import { ITEM_TYPE_ENDPOINTS } from '../config/api.config';

export const itemTypeService = {
    // Get all item types
    getAll: () => {
        return apiClient.get(ITEM_TYPE_ENDPOINTS.BASE);
    },

    // Get item type by ID
    getById: (id) => {
        return apiClient.get(ITEM_TYPE_ENDPOINTS.BY_ID(id));
    },

    // Create a new item type
    create: (itemTypeData) => {
        return apiClient.post(ITEM_TYPE_ENDPOINTS.CREATE, itemTypeData);
    },

    // Update an item type
    update: (id, itemTypeData) => {
        return apiClient.put(ITEM_TYPE_ENDPOINTS.UPDATE(id), itemTypeData);
    },

    // Delete an item type
    delete: (id) => {
        return apiClient.delete(ITEM_TYPE_ENDPOINTS.DELETE(id));
    },

    // Get all item types (alternative endpoint)
    getAllTypes: () => {
        return apiClient.get(ITEM_TYPE_ENDPOINTS.ALL_TYPES);
    }
}; 