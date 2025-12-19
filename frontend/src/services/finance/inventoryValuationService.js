import apiClient from '../../utils/apiClient.js';
import { INVENTORY_VALUATION_ENDPOINTS } from '../../config/api.config.js';

export const inventoryValuationService = {
    // ========================================
    // PENDING APPROVALS
    // ========================================

    /**
     * Get all pending item price approvals across all warehouses
     */
    getAllPendingApprovals: async () => {
        const response = await apiClient.get(INVENTORY_VALUATION_ENDPOINTS.PENDING_APPROVALS);
        return response.data || response;
    },

    /**
     * Get pending approvals for a specific warehouse
     */
    getPendingApprovalsByWarehouse: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.PENDING_APPROVALS_BY_WAREHOUSE(warehouseId)
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
            INVENTORY_VALUATION_ENDPOINTS.APPROVE_ITEM(itemId),
            { unitPrice }  // This is correct - matches backend
        );
        return response.data || response;
    },

    /**
     * Bulk approve multiple item prices
     * @param {Array} items - Array of { itemId, unitPrice } objects
     */
    bulkApproveItemPrices: async (items) => {
        const response = await apiClient.post(
            INVENTORY_VALUATION_ENDPOINTS.APPROVE_BULK,
            { items }
        );
        return response.data || response;
    },

    // ========================================
    // WAREHOUSE BALANCES
    // ========================================

    /**
     * Get balance information for a specific warehouse
     */
    getWarehouseBalance: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.WAREHOUSE_BALANCE(warehouseId)
        );
        return response.data || response;
    },

    /**
     * Manually trigger warehouse balance recalculation
     */
    recalculateWarehouseBalance: async (warehouseId) => {
        const response = await apiClient.post(
            INVENTORY_VALUATION_ENDPOINTS.RECALCULATE_WAREHOUSE_BALANCE(warehouseId)
        );
        return response.data || response;
    },

    // ========================================
    // SITE BALANCES
    // ========================================

    /**
     * Get balance for a specific site (includes all warehouses)
     */
    getSiteBalance: async (siteId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.SITE_BALANCE(siteId)
        );
        return response.data || response;
    },

    /**
     * Get all site balances
     */
    getAllSiteBalances: async () => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.ALL_SITE_BALANCES
        );
        return response.data || response;
    },

    /**
     * Manually trigger site balance recalculation
     */
    recalculateSiteBalance: async (siteId) => {
        const response = await apiClient.post(
            INVENTORY_VALUATION_ENDPOINTS.RECALCULATE_SITE_BALANCE(siteId)
        );
        return response.data || response;
    },

    /**
     * Get approval history (all approved items)
     */
    getApprovalHistory: async () => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.APPROVAL_HISTORY
        );
        return response.data || response;
    },
    /**
     * Get item breakdown (value composition) for a warehouse
     */
    getWarehouseItemBreakdown: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.WAREHOUSE_ITEMS_BREAKDOWN(warehouseId)
        );
        return response.data || response;
    },
    /**
     * Get transaction history for a warehouse (finance view)
     */
    getWarehouseTransactionHistory: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.WAREHOUSE_TRANSACTIONS(warehouseId)
        );
        return response.data || response;
    },
};