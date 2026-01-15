// src/services/procurement/offerRequestItemService.js
import apiClient from '../../utils/apiClient.js';
import { OFFER_ENDPOINTS } from '../../config/api.config.js';

export const offerRequestItemService = {
    /**
     * Get effective request items for an offer (modified or original)
     */
    getEffectiveRequestItems: async (offerId) => {
        const response = await apiClient.get(OFFER_ENDPOINTS.REQUEST_ITEMS(offerId));
        return response.data || response;
    },

    /**
     * Initialize modified items from original request order
     * This creates a working copy of the request items that can be modified
     */
    initializeModifiedItems: async (offerId) => {
        const response = await apiClient.post(OFFER_ENDPOINTS.REQUEST_ITEMS_INITIALIZE(offerId));
        return response.data || response;
    },

    /**
     * Add a new request item to the offer
     */
    addRequestItem: async (offerId, itemData) => {
        const response = await apiClient.post(OFFER_ENDPOINTS.REQUEST_ITEMS(offerId), itemData);
        return response.data || response;
    },

    /**
     * Update an existing request item
     */
    updateRequestItem: async (offerId, itemId, itemData) => {
        const response = await apiClient.put(
            OFFER_ENDPOINTS.REQUEST_ITEM_BY_ID(offerId, itemId),
            itemData
        );
        return response.data || response;
    },

    /**
     * Delete a request item (and its associated offer items)
     */
    deleteRequestItem: async (offerId, itemId) => {
        const response = await apiClient.delete(OFFER_ENDPOINTS.REQUEST_ITEM_BY_ID(offerId, itemId));
        return response.data || response;
    },

    /**
     * Get modification history for an offer
     */
    getModificationHistory: async (offerId) => {
        const response = await apiClient.get(OFFER_ENDPOINTS.REQUEST_ITEMS_HISTORY(offerId));
        return response.data || response;
    },
};