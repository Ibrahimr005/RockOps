import apiClient from '../../utils/apiClient.js';
import { TRANSACTION_ENDPOINTS } from '../../config/api.config.js';

export const transactionService = {
    // Get transaction by ID
    getById: async (transactionId) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_ID(transactionId));
        return response.data || response;
    },

    // Get transaction by batch number
    getByBatchNumber: async (batchNumber) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_BATCH(batchNumber));
        return response.data || response;
    },

    // Create a new transaction
    create: async (transactionData) => {
        const response = await apiClient.post(TRANSACTION_ENDPOINTS.CREATE, transactionData);
        return response.data || response;
    },

    // Accept a transaction
    accept: async (transactionId, acceptanceData) => {
        const response = await apiClient.post(TRANSACTION_ENDPOINTS.ACCEPT(transactionId), acceptanceData);
        return response.data || response;
    },

    // Reject a transaction
    reject: async (transactionId, rejectionData) => {
        const response = await apiClient.post(TRANSACTION_ENDPOINTS.REJECT(transactionId), rejectionData);
        return response.data || response;
    },

    // Update a transaction
    update: async (transactionId, updateData) => {
        const response = await apiClient.put(TRANSACTION_ENDPOINTS.UPDATE(transactionId), updateData);
        return response.data || response;
    },

    // Delete a transaction
    delete: async (transactionId) => {
        const response = await apiClient.delete(`/api/v1/transactions/${transactionId}`);
        return response.data || response;
    },

    // Get transactions for warehouse
    getTransactionsForWarehouse: async (warehouseId) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_WAREHOUSE(warehouseId));
        return response.data || response;
    },

    // Get transactions for equipment
    getTransactionsForEquipment: async (equipmentId) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_EQUIPMENT(equipmentId));
        return response.data || response;
    }
};