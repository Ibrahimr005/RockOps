import apiClient from '../../utils/apiClient.js';
import { INVENTORY_VALUATION_ENDPOINTS } from '../../config/api.config.js';

export const inventoryValuationService = {
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

    // ========================================
    // WAREHOUSE DETAILS
    // ========================================

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

    /**
     * Get all item history for a warehouse (all sources)
     */
    getWarehouseItemHistory: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.WAREHOUSE_ITEM_HISTORY(warehouseId)
        );
        return response.data || response;
    },
};