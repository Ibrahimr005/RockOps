import apiClient from '../../utils/apiClient.js';
import { PRICE_APPROVALS_ENDPOINTS } from '../../config/api.config.js';

export const priceApprovalsService = {
    // ========================================
    // PENDING APPROVALS
    // ========================================

    /**
     * Get all pending item price approvals across all warehouses
     */
    getAllPendingApprovals: async () => {
        const response = await apiClient.get(PRICE_APPROVALS_ENDPOINTS.PENDING_APPROVALS);
        return response.data || response;
    },

    /**
     * Get pending approvals for a specific warehouse
     */
    getPendingApprovalsByWarehouse: async (warehouseId) => {
        const response = await apiClient.get(
            PRICE_APPROVALS_ENDPOINTS.PENDING_APPROVALS_BY_WAREHOUSE(warehouseId)
        );
        return response.data || response;
    },

    // ========================================
    // APPROVAL ACTIONS
    // ========================================

    /**
     * Approve a single item price
     * @param {string} itemId - UUID of the item
     * @param {number} unitPrice - Approved price per unit
     */
    approveItemPrice: async (itemId, unitPrice) => {
        const response = await apiClient.post(
            PRICE_APPROVALS_ENDPOINTS.APPROVE_ITEM(itemId),
            { unitPrice }
        );
        return response.data || response;
    },

    /**
     * Bulk approve multiple item prices
     * @param {Array} items - Array of { itemId, unitPrice } objects
     */
    bulkApproveItemPrices: async (items) => {
        const response = await apiClient.post(
            PRICE_APPROVALS_ENDPOINTS.APPROVE_BULK,
            { items }
        );
        return response.data || response;
    },

    // ========================================
    // HISTORY
    // ========================================

    /**
     * Get approval history (all approved items)
     */
    getApprovalHistory: async () => {
        const response = await apiClient.get(
            PRICE_APPROVALS_ENDPOINTS.APPROVAL_HISTORY
        );
        return response.data || response;
    },
};