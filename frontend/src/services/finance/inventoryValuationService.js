import apiClient from '../../utils/apiClient.js';
import { INVENTORY_VALUATION_ENDPOINTS } from '../../config/api.config.js';
export const inventoryValuationService = {
    // Warehouse Balances
    getWarehouseBalance: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.WAREHOUSE_BALANCE(warehouseId)
        );
        return response.data || response;
    },

    // Site Balances (Backward Compatible)
    getSiteBalance: async (siteId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.SITE_BALANCE(siteId)
        );
        return response.data || response;
    },

    getAllSiteBalances: async () => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.ALL_SITE_BALANCES
        );
        return response.data || response;
    },

    // Site Valuations (With Expenses)
    getSiteValuation: async (siteId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.SITE_VALUATION(siteId)
        );
        return response.data || response;
    },

    getAllSiteValuations: async () => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.ALL_SITE_VALUATIONS
        );
        return response.data || response;
    },

    // Equipment Financials
    getEquipmentFinancials: async (equipmentId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.EQUIPMENT_FINANCIALS(equipmentId)
        );
        return response.data || response;
    },

    getEquipmentConsumablesBreakdown: async (equipmentId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.EQUIPMENT_CONSUMABLES_BREAKDOWN(equipmentId)
        );
        return response.data || response;
    },

    // Warehouse Details
    getWarehouseItemBreakdown: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.WAREHOUSE_ITEMS_BREAKDOWN(warehouseId)
        );
        return response.data || response;
    },

    getWarehouseItemHistory: async (warehouseId) => {
        const response = await apiClient.get(
            INVENTORY_VALUATION_ENDPOINTS.WAREHOUSE_ITEM_HISTORY(warehouseId)
        );
        return response.data || response;
    },
};