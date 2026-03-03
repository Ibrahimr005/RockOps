import apiClient from '../../utils/apiClient';
import { PO_RETURN_ENDPOINTS } from '../../config/api.config';

export const poReturnService = {
    /**
     * Create PO return request (automatically groups by merchant)
     * @param {string} purchaseOrderId - PO ID
     * @param {object} returnData - { reason, items: [{ purchaseOrderItemId, returnQuantity, reason }] }
     */
    create: async (purchaseOrderId, returnData) => {
        const response = await apiClient.post(
            PO_RETURN_ENDPOINTS.CREATE(purchaseOrderId),
            returnData
        );
        return response.data || response;
    },

    /**
     * Get all PO returns
     */
    getAll: async () => {
        const response = await apiClient.get(PO_RETURN_ENDPOINTS.GET_ALL);
        return response.data || response;
    },

    /**
     * Get PO return by ID
     */
    getById: async (id) => {
        const response = await apiClient.get(PO_RETURN_ENDPOINTS.GET_BY_ID(id));
        return response.data || response;
    },

    /**
     * Get PO returns by status
     * @param {string} status - 'PENDING', 'CONFIRMED', or 'REJECTED'
     */
    getByStatus: async (status) => {
        const response = await apiClient.get(PO_RETURN_ENDPOINTS.BY_STATUS(status));
        return response.data || response;
    },

    /**
     * Get pending PO returns (helper method)
     */
    getPending: async () => {
        return poReturnService.getByStatus('PENDING');
    },

    /**
     * Get confirmed PO returns (helper method)
     */
    getConfirmed: async () => {
        return poReturnService.getByStatus('CONFIRMED');
    },

    /**
     * Get rejected PO returns (helper method)
     */
    getRejected: async () => {
        return poReturnService.getByStatus('REJECTED');
    },
};

export default poReturnService;