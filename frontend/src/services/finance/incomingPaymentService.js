import apiClient from '../../utils/apiClient';
import { INCOMING_PAYMENT_ENDPOINTS } from '../../config/api.config';

export const incomingPaymentService = {
    /**
     * Get all incoming payment requests
     */
    getAll: async () => {
        const response = await apiClient.get(INCOMING_PAYMENT_ENDPOINTS.GET_ALL);
        return response.data || response;
    },

    /**
     * Get incoming payment request by ID
     */
    getById: async (id) => {
        const response = await apiClient.get(INCOMING_PAYMENT_ENDPOINTS.GET_BY_ID(id));
        return response.data || response;
    },

    /**
     * Get incoming payments by status
     * @param {string} status - 'PENDING' or 'CONFIRMED'
     */
    getByStatus: async (status) => {
        const response = await apiClient.get(INCOMING_PAYMENT_ENDPOINTS.BY_STATUS(status));
        return response.data || response;
    },

    /**
     * Get incoming payments by source
     * @param {string} source - 'REFUND' or 'PO_RETURN'
     */
    getBySource: async (source) => {
        const response = await apiClient.get(INCOMING_PAYMENT_ENDPOINTS.BY_SOURCE(source));
        return response.data || response;
    },

    /**
     * Get pending incoming payments (helper method)
     */
    getPending: async () => {
        return incomingPaymentService.getByStatus('PENDING');
    },

    /**
     * Get confirmed incoming payments (helper method)
     */
    getConfirmed: async () => {
        return incomingPaymentService.getByStatus('CONFIRMED');
    },

    /**
     * Get refund incoming payments (helper method)
     */
    getRefunds: async () => {
        return incomingPaymentService.getBySource('REFUND');
    },

    /**
     * Get PO return incoming payments (helper method)
     */
    getPOReturns: async () => {
        return incomingPaymentService.getBySource('PO_RETURN');
    },

    /**
     * Confirm incoming payment receipt
     * @param {string} id - Incoming payment request ID
     * @param {object} confirmData - { balanceType, balanceAccountId, dateReceived, financeNotes }
     */
    confirm: async (id, confirmData) => {
        const response = await apiClient.post(
            INCOMING_PAYMENT_ENDPOINTS.CONFIRM(id),
            confirmData
        );
        return response.data || response;
    },
};

export default incomingPaymentService;