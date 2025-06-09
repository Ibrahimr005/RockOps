import apiClient from '../utils/apiClient';
import { TRANSACTION_ENDPOINTS } from '../config/api.config';

export const transactionService = {
    // Get transaction by ID
    getById: (transactionId) => {
        return apiClient.get(TRANSACTION_ENDPOINTS.BY_ID(transactionId));
    },

    // Get transaction by batch number
    getByBatchNumber: (batchNumber) => {
        return apiClient.get(TRANSACTION_ENDPOINTS.BY_BATCH(batchNumber));
    },

    // Create a new transaction
    create: (transactionData) => {
        return apiClient.post(TRANSACTION_ENDPOINTS.CREATE, transactionData);
    },

    // Accept a transaction
    accept: (transactionId, acceptanceData) => {
        return apiClient.post(TRANSACTION_ENDPOINTS.ACCEPT(transactionId), acceptanceData);
    },

    // Reject a transaction
    reject: (transactionId, rejectionData) => {
        return apiClient.post(TRANSACTION_ENDPOINTS.REJECT(transactionId), rejectionData);
    },

    // Update a transaction
    update: (transactionId, updateData) => {
        return apiClient.put(TRANSACTION_ENDPOINTS.UPDATE(transactionId), updateData);
    },

    // Get transactions for warehouse
    getTransactionsForWarehouse: (warehouseId) => {
        return apiClient.get(TRANSACTION_ENDPOINTS.BY_WAREHOUSE(warehouseId));
    },

    // Get transactions for equipment
    getTransactionsForEquipment: (equipmentId) => {
        return apiClient.get(TRANSACTION_ENDPOINTS.BY_EQUIPMENT(equipmentId));
    }
}; 