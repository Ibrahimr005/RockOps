import apiClient from '../utils/apiClient.js';
import { OFFER_ENDPOINTS } from '../config/api.config.js';

export const offerService = {
    /**
     * Get all offers
     * @param {string} status - Optional status filter
     * @returns {Promise} API response with offers
     */
    getAll: async (status = null) => {
        try {
            const params = status ? { status } : {};
            return await apiClient.get(OFFER_ENDPOINTS.BASE, { params });
        } catch (error) {
            console.error('Error fetching offers:', error);
            throw error;
        }
    },

    /**
     * Get offer by ID
     * @param {string} id - Offer ID
     * @returns {Promise} API response with offer
     */
    getById: async (id) => {
        try {
            return await apiClient.get(OFFER_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching offer ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new offer
     * @param {Object} offerData - Offer data
     * @returns {Promise} API response with created offer
     */
    create: async (offerData) => {
        try {
            return await apiClient.post(OFFER_ENDPOINTS.CREATE, offerData);
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    },

    /**
     * Update offer
     * @param {string} id - Offer ID
     * @param {Object} offerData - Updated offer data
     * @returns {Promise} API response with updated offer
     */
    update: async (id, offerData) => {
        try {
            return await apiClient.put(OFFER_ENDPOINTS.UPDATE(id), offerData);
        } catch (error) {
            console.error(`Error updating offer ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete offer
     * @param {string} id - Offer ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(OFFER_ENDPOINTS.DELETE(id));
        } catch (error) {
            console.error(`Error deleting offer ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get request order for offer
     * @param {string} offerId - Offer ID
     * @returns {Promise} API response with request order
     */
    getRequestOrder: async (offerId) => {
        try {
            return await apiClient.get(`${OFFER_ENDPOINTS.BY_ID(offerId)}/request-order`);
        } catch (error) {
            console.error(`Error fetching request order for offer ${offerId}:`, error);
            throw error;
        }
    },

    /**
     * Update offer status
     * @param {string} offerId - Offer ID
     * @param {string} status - New status
     * @param {string} rejectionReason - Optional rejection reason
     * @returns {Promise} API response
     */
    updateStatus: async (offerId, status, rejectionReason = null) => {
        try {
            const params = { status };
            if (rejectionReason) {
                params.rejectionReason = rejectionReason;
            }
            return await apiClient.put(`${OFFER_ENDPOINTS.BY_ID(offerId)}/status`, null, { params });
        } catch (error) {
            console.error(`Error updating offer ${offerId} status:`, error);
            throw error;
        }
    },

    /**
     * Update offer finance status
     * @param {string} offerId - Offer ID
     * @param {string} financeStatus - New finance status
     * @returns {Promise} API response
     */
    updateFinanceStatus: async (offerId, financeStatus) => {
        try {
            return await apiClient.put(`${OFFER_ENDPOINTS.BY_ID(offerId)}/finance-status`, null, { 
                params: { financeStatus } 
            });
        } catch (error) {
            console.error(`Error updating offer ${offerId} finance status:`, error);
            throw error;
        }
    }
}; 