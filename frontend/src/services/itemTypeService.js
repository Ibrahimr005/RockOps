import apiClient from '../utils/apiClient.js';
import { ITEM_TYPE_ENDPOINTS } from '../config/api.config.js';

export const itemTypeService = {
    /**
     * Get all item types
     * @returns {Promise} API response with item types
     */
    getAll: async () => {
        try {
            return await apiClient.get(ITEM_TYPE_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching item types:', error);
            throw error;
        }
    },

    /**
     * Get item type by ID
     * @param {string} id - Item type ID
     * @returns {Promise} API response with item type
     */
    getById: async (id) => {
        try {
            return await apiClient.get(ITEM_TYPE_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching item type ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new item type
     * @param {Object} itemTypeData - Item type data
     * @returns {Promise} API response with created item type
     */
    create: async (itemTypeData) => {
        try {
            return await apiClient.post(ITEM_TYPE_ENDPOINTS.CREATE, itemTypeData);
        } catch (error) {
            console.error('Error creating item type:', error);
            throw error;
        }
    },

    /**
     * Update item type
     * @param {string} id - Item type ID
     * @param {Object} itemTypeData - Updated item type data
     * @returns {Promise} API response with updated item type
     */
    update: async (id, itemTypeData) => {
        try {
            return await apiClient.put(ITEM_TYPE_ENDPOINTS.UPDATE(id), itemTypeData);
        } catch (error) {
            console.error(`Error updating item type ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete item type
     * @param {string} id - Item type ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(ITEM_TYPE_ENDPOINTS.DELETE(id));
        } catch (error) {
            console.error(`Error deleting item type ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get all types (alternative endpoint)
     * @returns {Promise} API response with all types
     */
    getAllTypes: async () => {
        try {
            return await apiClient.get(ITEM_TYPE_ENDPOINTS.ALL_TYPES);
        } catch (error) {
            console.error('Error fetching all types:', error);
            throw error;
        }
    }
}; 