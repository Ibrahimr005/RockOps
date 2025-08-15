import apiClient from '../utils/apiClient.js';
import { PURCHASE_ORDER_ENDPOINTS } from '../config/api.config.js';

export const purchaseOrderService = {
    /**
     * Get all purchase orders
     * @returns {Promise} API response with purchase orders
     */
    getAll: async () => {
        try {
            return await apiClient.get(PURCHASE_ORDER_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            throw error;
        }
    },

    /**
     * Get purchase order by ID
     * @param {string} id - Purchase order ID
     * @returns {Promise} API response with purchase order
     */
    getById: async (id) => {
        try {
            return await apiClient.get(PURCHASE_ORDER_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching purchase order ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new purchase order
     * @param {Object} purchaseOrderData - Purchase order data
     * @returns {Promise} API response with created purchase order
     */
    create: async (purchaseOrderData) => {
        try {
            return await apiClient.post(PURCHASE_ORDER_ENDPOINTS.CREATE, purchaseOrderData);
        } catch (error) {
            console.error('Error creating purchase order:', error);
            throw error;
        }
    },

    /**
     * Update purchase order
     * @param {string} id - Purchase order ID
     * @param {Object} purchaseOrderData - Updated purchase order data
     * @returns {Promise} API response with updated purchase order
     */
    update: async (id, purchaseOrderData) => {
        try {
            return await apiClient.put(PURCHASE_ORDER_ENDPOINTS.UPDATE(id), purchaseOrderData);
        } catch (error) {
            console.error(`Error updating purchase order ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete purchase order
     * @param {string} id - Purchase order ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(PURCHASE_ORDER_ENDPOINTS.DELETE(id));
        } catch (error) {
            console.error(`Error deleting purchase order ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get purchase orders by status
     * @param {string} status - Purchase order status
     * @returns {Promise} API response with filtered purchase orders
     */
    getByStatus: async (status) => {
        try {
            return await apiClient.get(PURCHASE_ORDER_ENDPOINTS.BY_STATUS(status));
        } catch (error) {
            console.error(`Error fetching purchase orders by status ${status}:`, error);
            throw error;
        }
    },

    /**
     * Get pending purchase orders
     * @returns {Promise} API response with pending purchase orders
     */
    getPending: async () => {
        try {
            return await apiClient.get(PURCHASE_ORDER_ENDPOINTS.PENDING);
        } catch (error) {
            console.error('Error fetching pending purchase orders:', error);
            throw error;
        }
    },

    /**
     * Get completed purchase orders
     * @returns {Promise} API response with completed purchase orders
     */
    getCompleted: async () => {
        try {
            return await apiClient.get(PURCHASE_ORDER_ENDPOINTS.COMPLETED);
        } catch (error) {
            console.error('Error fetching completed purchase orders:', error);
            throw error;
        }
    }
}; 