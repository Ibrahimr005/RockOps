// src/services/merchantService.js
import apiClient from '../utils/apiClient.js';
import { MERCHANT_ENDPOINTS } from '../config/api.config.js';

export const merchantService = {
    /**
     * Get all merchants
     * @returns {Promise} API response with merchants
     */
    getAll: async () => {
        try {
            return await apiClient.get(MERCHANT_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching merchants:', error);
            throw error;
        }
    },

    /**
     * Get merchant by ID
     * @param {string} id - Merchant ID
     * @returns {Promise} API response with merchant
     */
    getById: async (id) => {
        try {
            return await apiClient.get(MERCHANT_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching merchant ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new merchant
     * @param {Object} merchantData - Merchant data
     * @returns {Promise} API response with created merchant
     */
    create: async (merchantData) => {
        try {
            return await apiClient.post(MERCHANT_ENDPOINTS.BASE, merchantData);
        } catch (error) {
            console.error('Error creating merchant:', error);
            throw error;
        }
    },

    /**
     * Update merchant
     * @param {string} id - Merchant ID
     * @param {Object} merchantData - Updated merchant data
     * @returns {Promise} API response with updated merchant
     */
    update: async (id, merchantData) => {
        try {
            return await apiClient.put(MERCHANT_ENDPOINTS.BY_ID(id), merchantData);
        } catch (error) {
            console.error(`Error updating merchant ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete merchant
     * @param {string} id - Merchant ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(`/api/v1/procurement/${id}`);
        } catch (error) {
            console.error(`Error deleting merchant ${id}:`, error);
            throw error;
        }
    }
}; 