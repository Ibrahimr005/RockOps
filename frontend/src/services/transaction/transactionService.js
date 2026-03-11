// transactionService.js
import apiClient from '../../utils/apiClient.js';
import { TRANSACTION_ENDPOINTS } from '../../config/api.config.js';

export const transactionService = {

    getById: async (transactionId) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_ID(transactionId));
        return response.data || response;
    },

    getByBatchNumber: async (batchNumber) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_BATCH(batchNumber));
        return response.data || response;
    },

    // transactionData shape:
    // {
    //   senderId,          ← always a warehouse UUID
    //   receiverType,      ← 'WAREHOUSE' | 'EQUIPMENT' | 'LOSS'
    //   receiverId,
    //   items: [{ itemTypeId, quantity }],
    //   transactionDate,
    //   username,
    //   batchNumber,
    //   description,
    //   handledBy          ← optional
    // }
    create: async (transactionData) => {
        const response = await apiClient.post(TRANSACTION_ENDPOINTS.CREATE, transactionData);
        return response.data || response;
    },

    // acceptanceData shape:
    // {
    //   username,
    //   acceptanceComment,
    //   receivedItems: [{ transactionItemId, receivedQuantity, itemNotReceived }]
    // }
    accept: async (transactionId, acceptanceData) => {
        const response = await apiClient.post(TRANSACTION_ENDPOINTS.ACCEPT(transactionId), acceptanceData);
        return response.data || response;
    },

    // rejectionData shape:
    // { username, rejectionReason }
    reject: async (transactionId, rejectionData) => {
        const response = await apiClient.post(TRANSACTION_ENDPOINTS.REJECT(transactionId), rejectionData);
        return response.data || response;
    },

    update: async (transactionId, updateData) => {
        const response = await apiClient.put(TRANSACTION_ENDPOINTS.UPDATE(transactionId), updateData);
        return response.data || response;
    },

    delete: async (transactionId) => {
        const response = await apiClient.delete(TRANSACTION_ENDPOINTS.DELETE(transactionId));
        return response.data || response;
    },

    getTransactionsForWarehouse: async (warehouseId) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_WAREHOUSE(warehouseId));
        return response.data || response;
    },

    getTransactionsForEquipment: async (equipmentId) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.BY_EQUIPMENT(equipmentId));
        return response.data || response;
    },

    // Fetch all ItemResolution records for a given transaction
    // Endpoint: GET /api/v1/transactions/resolutions/transaction/{transactionId}
    getResolutionsByTransaction: async (transactionId) => {
        const response = await apiClient.get(TRANSACTION_ENDPOINTS.RESOLUTIONS_BY_TX(transactionId));
        return response.data || response;
    },

};