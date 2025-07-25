import apiClient from '../utils/apiClient.js';
import { WAREHOUSE_ENDPOINTS } from '../config/api.config.js';

export const warehouseService = {
    /**
     * Get all warehouses
     * @returns {Promise} API response with warehouses
     */
    getAll: async () => {
        try {
            return await apiClient.get(WAREHOUSE_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            throw error;
        }
    },

    /**
     * Get warehouse by ID
     * @param {string} id - Warehouse ID
     * @returns {Promise} API response with warehouse
     */
    getById: async (id) => {
        try {
            return await apiClient.get(WAREHOUSE_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching warehouse ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get warehouses by site
     * @param {string} siteId - Site ID
     * @returns {Promise} API response with warehouses
     */
    getBySite: async (siteId) => {
        try {
            return await apiClient.get(WAREHOUSE_ENDPOINTS.BY_SITE(siteId));
        } catch (error) {
            console.error(`Error fetching warehouses for site ${siteId}:`, error);
            throw error;
        }
    },

    /**
     * Get warehouse items
     * @param {string} warehouseId - Warehouse ID
     * @returns {Promise} API response with warehouse items
     */
    getItems: async (warehouseId) => {
        try {
            return await apiClient.get(WAREHOUSE_ENDPOINTS.ITEMS(warehouseId));
        } catch (error) {
            console.error(`Error fetching items for warehouse ${warehouseId}:`, error);
            throw error;
        }
    },

    /**
     * Get warehouse summary
     * @param {string} warehouseId - Warehouse ID
     * @returns {Promise} API response with warehouse summary
     */
    getSummary: async (warehouseId) => {
        try {
            return await apiClient.get(`/api/v1/items/warehouse/${warehouseId}/summary`);
        } catch (error) {
            console.error(`Error fetching summary for warehouse ${warehouseId}:`, error);
            throw error;
        }
    },

    /**
     * Get warehouse counts
     * @param {string} warehouseId - Warehouse ID
     * @returns {Promise} API response with warehouse counts
     */
    getCounts: async (warehouseId) => {
        try {
            return await apiClient.get(`/api/v1/items/warehouse/${warehouseId}/counts`);
        } catch (error) {
            console.error(`Error fetching counts for warehouse ${warehouseId}:`, error);
            throw error;
        }
    },

    /**
     * Create new warehouse
     * @param {Object} warehouseData - Warehouse data
     * @returns {Promise} API response with created warehouse
     */
    create: async (warehouseData) => {
        try {
            return await apiClient.post(WAREHOUSE_ENDPOINTS.CREATE, warehouseData);
        } catch (error) {
            console.error('Error creating warehouse:', error);
            throw error;
        }
    },

    /**
     * Update warehouse
     * @param {string} id - Warehouse ID
     * @param {Object} warehouseData - Updated warehouse data
     * @returns {Promise} API response with updated warehouse
     */
    update: async (id, warehouseData) => {
        try {
            return await apiClient.put(WAREHOUSE_ENDPOINTS.UPDATE(id), warehouseData);
        } catch (error) {
            console.error(`Error updating warehouse ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete warehouse
     * @param {string} id - Warehouse ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(WAREHOUSE_ENDPOINTS.DELETE(id));
        } catch (error) {
            console.error(`Error deleting warehouse ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get warehouse employees
     * @param {string} warehouseId - Warehouse ID
     * @returns {Promise} API response with warehouse employees
     */
    getEmployees: async (warehouseId) => {
        try {
            return await apiClient.get(WAREHOUSE_ENDPOINTS.BY_EMPLOYEES(warehouseId));
        } catch (error) {
            console.error(`Error fetching employees for warehouse ${warehouseId}:`, error);
            throw error;
        }
    }
}; 