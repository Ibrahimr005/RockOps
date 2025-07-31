// src/services/offerService.js
import apiClient from '../../utils/apiClient.js';
import { OFFER_ENDPOINTS } from '../../config/api.config.js';

export const offerService = {
    // Basic CRUD operations
    getAll: async () => {
        const response = await apiClient.get(OFFER_ENDPOINTS.BASE);
        return response.data || response;
    },

    getById: async (id) => {
        const response = await apiClient.get(OFFER_ENDPOINTS.BY_ID(id));
        return response.data || response;
    },

    create: async (offerData) => {
        const response = await apiClient.post(OFFER_ENDPOINTS.CREATE, offerData);
        return response.data || response;
    },

    update: async (id, offerData) => {
        const response = await apiClient.put(OFFER_ENDPOINTS.UPDATE(id), offerData);
        return response.data || response;
    },

    delete: async (id) => {
        const response = await apiClient.delete(OFFER_ENDPOINTS.DELETE(id));
        return response.data || response;
    },

    // Status-based operations
    getByStatus: async (status) => {
        const response = await apiClient.get(`${OFFER_ENDPOINTS.BASE}?status=${status}`);
        return response.data || response;
    },

    updateStatus: async (offerId, status, rejectionReason = null) => {
        const params = new URLSearchParams({ status });
        if (rejectionReason) {
            params.append('rejectionReason', rejectionReason);
        }
        const response = await apiClient.put(`${OFFER_ENDPOINTS.UPDATE_STATUS(offerId)}?${params}`);
        return response.data || response;
    },

    // Request Order operations
    getRequestOrder: async (offerId) => {
        const response = await apiClient.get(OFFER_ENDPOINTS.REQUEST_ORDER(offerId));
        return response.data || response;
    },

    // Offer Items operations
    addItems: async (offerId, items) => {
        const response = await apiClient.post(OFFER_ENDPOINTS.ADD_ITEMS(offerId), items);
        return response.data || response;
    },

    updateItem: async (itemId, itemData) => {
        const response = await apiClient.put(OFFER_ENDPOINTS.UPDATE_ITEM(itemId), itemData);
        return response.data || response;
    },

    deleteItem: async (itemId) => {
        const response = await apiClient.delete(OFFER_ENDPOINTS.DELETE_ITEM(itemId));
        return response.data || response;
    },

    getItems: async (offerId) => {
        const response = await apiClient.get(OFFER_ENDPOINTS.GET_ITEMS(offerId));
        return response.data || response;
    },

    // Finance operations
    updateFinanceStatus: async (offerId, financeStatus) => {
        const response = await apiClient.put(
            `${OFFER_ENDPOINTS.UPDATE_FINANCE_STATUS(offerId)}?financeStatus=${financeStatus}`
        );
        return response.data || response;
    },

    updateItemFinanceStatus: async (itemId, financeStatus, rejectionReason = null) => {
        const params = new URLSearchParams({ financeStatus });
        if (rejectionReason) {
            params.append('rejectionReason', rejectionReason);
        }
        const response = await apiClient.put(`${OFFER_ENDPOINTS.UPDATE_ITEM_FINANCE_STATUS(itemId)}?${params}`);
        return response.data || response;
    },

    getByFinanceStatus: async (status) => {
        const response = await apiClient.get(OFFER_ENDPOINTS.BY_FINANCE_STATUS(status));
        return response.data || response;
    },

    getCompletedFinanceOffers: async () => {
        const response = await apiClient.get(OFFER_ENDPOINTS.COMPLETED_FINANCE);
        return response.data || response;
    },

    completeFinanceReview: async (offerId) => {
        const response = await apiClient.post(OFFER_ENDPOINTS.COMPLETE_FINANCE_REVIEW(offerId));
        return response.data || response;
    },

    // Retry operation
    retryOffer: async (offerId) => {
        const response = await apiClient.post(OFFER_ENDPOINTS.RETRY(offerId));
        return response.data || response;
    },

    // Multiple status operations for complex tabs
    getMultipleStatuses: async (statuses) => {
        const promises = statuses.map(status => offerService.getByStatus(status));
        const results = await Promise.all(promises);
        return results.flat();
    }
};