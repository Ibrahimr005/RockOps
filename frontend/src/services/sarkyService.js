import apiClient from '../utils/apiClient';
import { SARKY_ENDPOINTS } from '../config/api.config';

export const sarkyService = {
    // Single sarky log operations
    getByEquipment: (equipmentId) => {
        return apiClient.get(SARKY_ENDPOINTS.BY_EQUIPMENT(equipmentId));
    },

    getByEquipmentAndDate: (equipmentId, date) => {
        return apiClient.get(SARKY_ENDPOINTS.BY_EQUIPMENT_AND_DATE(equipmentId, date));
    },

    getByEquipmentDateRange: (equipmentId, startDate, endDate) => {
        return apiClient.get(SARKY_ENDPOINTS.BY_EQUIPMENT_DATE_RANGE(equipmentId), {
            params: { startDate, endDate }
        });
    },

    getDailySummary: (equipmentId, date) => {
        return apiClient.get(SARKY_ENDPOINTS.DAILY_SUMMARY(equipmentId, date));
    },

    getExistingDates: (equipmentId) => {
        return apiClient.get(SARKY_ENDPOINTS.EXISTING_DATES(equipmentId));
    },

    getValidationInfo: (equipmentId) => {
        return apiClient.get(SARKY_ENDPOINTS.VALIDATION_INFO(equipmentId));
    },

    getLatestDate: (equipmentId) => {
        return apiClient.get(SARKY_ENDPOINTS.LATEST_DATE(equipmentId));
    },

    getById: (id) => {
        return apiClient.get(SARKY_ENDPOINTS.BY_ID(id));
    },

    create: (equipmentId, sarkyData) => {
        return apiClient.post(SARKY_ENDPOINTS.CREATE(equipmentId), sarkyData);
    },

    update: (id, sarkyData) => {
        return apiClient.put(SARKY_ENDPOINTS.UPDATE(id), sarkyData);
    },

    delete: (id) => {
        return apiClient.delete(SARKY_ENDPOINTS.DELETE(id));
    },

    // Range sarky log operations (deprecated - keeping for backward compatibility)
    // These methods are deprecated in favor of using multiple individual sarky entries per day
    getRangeByEquipment: (equipmentId) => {
        return apiClient.get(SARKY_ENDPOINTS.RANGE_BY_EQUIPMENT(equipmentId));
    },

    getRangeById: (id) => {
        return apiClient.get(SARKY_ENDPOINTS.RANGE_BY_ID(id));
    },

    createRange: (equipmentId, rangeData) => {
        return apiClient.post(SARKY_ENDPOINTS.CREATE_RANGE(equipmentId), rangeData);
    },

    updateRange: (id, rangeData) => {
        return apiClient.put(SARKY_ENDPOINTS.UPDATE_RANGE(id), rangeData);
    },

    deleteRange: (id) => {
        return apiClient.delete(SARKY_ENDPOINTS.DELETE_RANGE(id));
    }
}; 