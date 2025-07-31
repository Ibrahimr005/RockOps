import apiClient from '../../utils/apiClient';
import { ITEM_ENDPOINTS } from '../../config/api.config';

export const itemService = {
    // Get all items by warehouse
    getItemsByWarehouse: async (warehouseId) => {
        console.log('🔗 ItemService: Making API call to:', ITEM_ENDPOINTS.BY_WAREHOUSE(warehouseId));
        const response = await apiClient.get(ITEM_ENDPOINTS.BY_WAREHOUSE(warehouseId));
        console.log('🔗 ItemService: Raw API response:', response);
        console.log('🔗 ItemService: Response status:', response.status);
        console.log('🔗 ItemService: Response data:', response.data);
        return response; // Return the full response object, not just response.data
    },

    // Create a new item
    createItem: async (itemData) => {
        const response = await apiClient.post(ITEM_ENDPOINTS.CREATE, itemData);
        return response.data || response;
    },

    // Delete an item
    deleteItem: async (itemId) => {
        const response = await apiClient.delete(ITEM_ENDPOINTS.DELETE(itemId));
        return response.data || response;
    },

    // Resolution endpoints
    resolveDiscrepancy: async (resolutionData) => {
        const response = await apiClient.post(ITEM_ENDPOINTS.RESOLVE_DISCREPANCY, resolutionData);
        return response.data || response;
    },

    // Get resolution history for a specific item
    getItemResolutionHistory: async (itemId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.ITEM_RESOLUTIONS(itemId));
        return response.data || response;
    },

    // Get discrepancy items for a warehouse
    getDiscrepancyItems: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.WAREHOUSE_DISCREPANCIES(warehouseId));
        return response.data || response;
    },

    // Get resolved items for history tab
    getResolvedItems: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.WAREHOUSE_RESOLVED(warehouseId));
        return response.data || response;
    },

    // Get resolutions by user
    getResolutionsByUser: async (username) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.RESOLUTIONS_BY_USER(username));
        return response.data || response;
    },

    // Get specific status items
    getStolenItems: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.WAREHOUSE_STOLEN(warehouseId));
        return response.data || response;
    },

    getOverReceivedItems: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.WAREHOUSE_OVERRECEIVED(warehouseId));
        return response.data || response;
    },

    // Get item status counts
    getItemStatusCounts: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.WAREHOUSE_COUNTS(warehouseId));
        return response.data || response;
    },

    // Check if an item can be resolved
    canResolveItem: async (itemId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.CAN_RESOLVE(itemId));
        return response.data || response;
    },

    // Get active items (unresolved)
    getActiveItems: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.WAREHOUSE_ACTIVE(warehouseId));
        return response.data || response;
    },

    // Get warehouse summary
    getWarehouseSummary: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.WAREHOUSE_SUMMARY(warehouseId));
        return response.data || response;
    },

    // Get resolution history by warehouse
    getResolutionHistoryByWarehouse: async (warehouseId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.RESOLUTION_HISTORY_BY_WAREHOUSE(warehouseId));
        return response.data || response;
    },

    // Get transaction details for an item
    getItemTransactionDetails: async (warehouseId, itemTypeId) => {
        const response = await apiClient.get(ITEM_ENDPOINTS.TRANSACTION_DETAILS(warehouseId, itemTypeId));
        return response.data || response;
    }
};