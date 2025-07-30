import apiClient from '../utils/apiClient.js';
import { TRANSACTION_ENDPOINTS } from '../config/api.config.js';

export const transactionService = {
    /**
     * Get all transactions
     * @returns {Promise} API response with transactions
     */
    getAll: async () => {
        try {
            return await apiClient.get(TRANSACTION_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    },

    /**
     * Get transaction by ID
     * @param {string} id - Transaction ID
     * @returns {Promise} API response with transaction
     */
    getById: async (id) => {
        try {
            return await apiClient.get(TRANSACTION_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get transactions by batch number
     * @param {string} batchNumber - Batch number
     * @returns {Promise} API response with transactions
     */
    getByBatch: async (batchNumber) => {
        try {
            return await apiClient.get(TRANSACTION_ENDPOINTS.BY_BATCH(batchNumber));
        } catch (error) {
            console.error(`Error fetching transactions by batch ${batchNumber}:`, error);
            throw error;
        }
    },

    /**
     * Create new transaction
     * @param {Object} transactionData - Transaction data
     * @returns {Promise} API response with created transaction
     */
    create: async (transactionData) => {
        try {
            return await apiClient.post(TRANSACTION_ENDPOINTS.CREATE, transactionData);
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    },

    /**
     * Update transaction
     * @param {string} id - Transaction ID
     * @param {Object} transactionData - Updated transaction data
     * @returns {Promise} API response with updated transaction
     */
    update: async (id, transactionData) => {
        try {
            return await apiClient.put(TRANSACTION_ENDPOINTS.UPDATE(id), transactionData);
        } catch (error) {
            console.error(`Error updating transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Accept transaction
     * @param {string} id - Transaction ID
     * @returns {Promise} API response
     */
    accept: async (id) => {
        try {
            return await apiClient.post(TRANSACTION_ENDPOINTS.ACCEPT(id));
        } catch (error) {
            console.error(`Error accepting transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Reject transaction
     * @param {string} id - Transaction ID
     * @returns {Promise} API response
     */
    reject: async (id) => {
        try {
            return await apiClient.post(TRANSACTION_ENDPOINTS.REJECT(id));
        } catch (error) {
            console.error(`Error rejecting transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get transactions by warehouse
     * @param {string} warehouseId - Warehouse ID
     * @returns {Promise} API response with transactions
     */
    getByWarehouse: async (warehouseId) => {
        try {
            return await apiClient.get(TRANSACTION_ENDPOINTS.BY_WAREHOUSE(warehouseId));
        } catch (error) {
            console.error(`Error fetching transactions for warehouse ${warehouseId}:`, error);
            throw error;
        }
    },

    /**
     * Get transactions by equipment
     * @param {string} equipmentId - Equipment ID
     * @returns {Promise} API response with transactions
     */
    getByEquipment: async (equipmentId) => {
        try {
            return await apiClient.get(TRANSACTION_ENDPOINTS.BY_EQUIPMENT(equipmentId));
        } catch (error) {
            console.error(`Error fetching transactions for equipment ${equipmentId}:`, error);
            throw error;
        }
    },

    /**
     * Create maintenance transaction
     * @param {string} equipmentId - Equipment ID
     * @param {string} maintenanceId - Maintenance ID
     * @param {Object} transactionData - Transaction data
     * @returns {Promise} API response with created transaction
     */
    createMaintenanceTransaction: async (equipmentId, maintenanceId, transactionData) => {
        try {
            return await apiClient.post(`/api/equipment/${equipmentId}/maintenance/${maintenanceId}/transactions`, transactionData);
        } catch (error) {
            console.error(`Error creating maintenance transaction for equipment ${equipmentId}, maintenance ${maintenanceId}:`, error);
            throw error;
        }
    },

    /**
     * Link transaction to maintenance
     * @param {string} equipmentId - Equipment ID
     * @param {string} maintenanceId - Maintenance ID
     * @param {string} transactionId - Transaction ID
     * @returns {Promise} API response
     */
    linkTransactionToMaintenance: async (equipmentId, maintenanceId, transactionId) => {
        try {
            return await apiClient.put(`/api/equipment/${equipmentId}/maintenance/${maintenanceId}/link-transaction/${transactionId}`);
        } catch (error) {
            console.error(`Error linking transaction ${transactionId} to maintenance ${maintenanceId} for equipment ${equipmentId}:`, error);
            throw error;
        }
    }
}; 