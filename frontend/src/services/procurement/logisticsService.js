import apiClient from '../../utils/apiClient';
import { LOGISTICS_ENDPOINTS } from '../../config/api.config';

export const logisticsService = {
    /**
     * Create new logistics entry
     */
    create: async (logisticsData) => {
        const response = await apiClient.post(LOGISTICS_ENDPOINTS.CREATE, logisticsData);
        return response.data || response;
    },

    /**
     * Get logistics by ID
     */
    getById: async (id) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.GET_BY_ID(id));
        return response.data || response;
    },

    /**
     * Get all logistics entries
     */
    getAll: async () => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.GET_ALL);
        return response.data || response;
    },

    /**
     * Get pending approval logistics (for Pending Approval tab)
     */
    getPendingApproval: async () => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.PENDING_APPROVAL);
        return response.data || response;
    },

    /**
     * Get history logistics (for History tab - approved/rejected/paid)
     */
    getHistory: async () => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.HISTORY);
        return response.data || response;
    },

    /**
     * Get logistics entries for a specific purchase order (for PO's logistics tab)
     */
    getByPurchaseOrder: async (purchaseOrderId) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.BY_PURCHASE_ORDER(purchaseOrderId));
        return response.data || response;
    },

    /**
     * Get total logistics cost allocated to a purchase order
     */
    getTotalCost: async (purchaseOrderId) => {
        const response = await apiClient.get(LOGISTICS_ENDPOINTS.TOTAL_COST(purchaseOrderId));
        return response.data || response;
    },

    /**
     * Handle payment approval (webhook - usually called from backend)
     */
    approvePayment: async (paymentRequestId) => {
        const response = await apiClient.post(LOGISTICS_ENDPOINTS.PAYMENT_APPROVED(paymentRequestId));
        return response.data || response;
    },

    /**
     * Handle payment rejection (webhook - usually called from backend)
     */
    rejectPayment: async (paymentRequestId, rejectionData) => {
        const response = await apiClient.post(LOGISTICS_ENDPOINTS.PAYMENT_REJECTED(paymentRequestId), rejectionData);
        return response.data || response;
    },

    /**
     * Handle payment completion (webhook - usually called from backend)
     */
    completePayment: async (paymentRequestId) => {
        const response = await apiClient.post(LOGISTICS_ENDPOINTS.PAYMENT_COMPLETED(paymentRequestId));
        return response.data || response;
    },
    /**
     * Update logistics entry
     */
    update: async (id, logisticsData) => {
        const response = await apiClient.put(LOGISTICS_ENDPOINTS.UPDATE(id), logisticsData);
        return response.data || response;
    },

    /**
     * Delete logistics entry
     */
    delete: async (id) => {
        const response = await apiClient.delete(LOGISTICS_ENDPOINTS.DELETE(id));
        return response.data || response;
    },
};

export default logisticsService;