import apiClient from '../utils/apiClient';
import { CONSUMABLE_ENDPOINTS } from '../config/api.config';

export const consumableService = {
    // Resolve a consumable discrepancy
    resolveDiscrepancy: (resolutionData) => {
        return apiClient.post(CONSUMABLE_ENDPOINTS.RESOLVE_DISCREPANCY, resolutionData);
    },

    // Get resolution history for equipment
    getResolutionHistory: (equipmentId) => {
        return apiClient.get(CONSUMABLE_ENDPOINTS.RESOLUTION_HISTORY(equipmentId));
    },

    // Get unresolved discrepancy consumables
    getDiscrepancies: (equipmentId) => {
        return apiClient.get(CONSUMABLE_ENDPOINTS.DISCREPANCIES(equipmentId));
    },

    // Get resolved consumables
    getResolved: (equipmentId) => {
        return apiClient.get(CONSUMABLE_ENDPOINTS.RESOLVED(equipmentId));
    },

    // Get consumable history by consumable ID
    getConsumableHistory: (consumableId) => {
        return apiClient.get(CONSUMABLE_ENDPOINTS.HISTORY_BY_CONSUMABLE(consumableId));
    }
}; 