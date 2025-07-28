import apiClient from '../utils/apiClient.js';
import { ITEM_CATEGORY_ENDPOINTS } from '../config/api.config.js';

export const itemCategoryService = {
    /**
     * Get all item categories
     * @returns {Promise} API response with item categories
     */
    getAll: async () => {
        try {
            return await apiClient.get(ITEM_CATEGORY_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching item categories:', error);
            throw error;
        }
    },

    /**
     * Get item category by ID
     * @param {string} id - Item category ID
     * @returns {Promise} API response with item category
     */
    getById: async (id) => {
        try {
            return await apiClient.get(`${ITEM_CATEGORY_ENDPOINTS.BASE}/${id}`);
        } catch (error) {
            console.error(`Error fetching item category ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new item category
     * @param {Object} itemCategoryData - Item category data
     * @returns {Promise} API response with created item category
     */
    create: async (itemCategoryData) => {
        try {
            return await apiClient.post(ITEM_CATEGORY_ENDPOINTS.CREATE, itemCategoryData);
        } catch (error) {
            console.error('Error creating item category:', error);
            throw error;
        }
    },

    /**
     * Update item category
     * @param {string} id - Item category ID
     * @param {Object} itemCategoryData - Updated item category data
     * @returns {Promise} API response with updated item category
     */
    update: async (id, itemCategoryData) => {
        try {
            return await apiClient.put(`${ITEM_CATEGORY_ENDPOINTS.BASE}/${id}`, itemCategoryData);
        } catch (error) {
            console.error(`Error updating item category ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete item category
     * @param {string} id - Item category ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(`${ITEM_CATEGORY_ENDPOINTS.BASE}/${id}`);
        } catch (error) {
            console.error(`Error deleting item category ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get parent categories
     * @returns {Promise} API response with parent categories
     */
    getParents: async () => {
        try {
            return await apiClient.get(ITEM_CATEGORY_ENDPOINTS.PARENTS);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
            throw error;
        }
    },

    /**
     * Get child categories
     * @returns {Promise} API response with child categories
     */
    getChildren: async () => {
        try {
            return await apiClient.get(ITEM_CATEGORY_ENDPOINTS.CHILDREN);
        } catch (error) {
            console.error('Error fetching child categories:', error);
            throw error;
        }
    },

    /**
     * Get parent categories (alternative endpoint)
     * @returns {Promise} API response with parent categories
     */
    getParentCategories: async () => {
        try {
            return await apiClient.get(ITEM_CATEGORY_ENDPOINTS.PARENT_CATEGORIES);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
            throw error;
        }
    }
}; 