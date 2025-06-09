import apiClient from '../utils/apiClient';
import { EQUIPMENT_TYPE_ENDPOINTS } from '../config/api.config';

export const equipmentTypeService = {
    // Get all equipment types
    getAllEquipmentTypes: () => {
        return apiClient.get(EQUIPMENT_TYPE_ENDPOINTS.BASE);
    },

    // Get equipment type by ID
    getEquipmentTypeById: (id) => {
        return apiClient.get(EQUIPMENT_TYPE_ENDPOINTS.BY_ID(id));
    },

    // Create new equipment type
    createEquipmentType: (typeData) => {
        return apiClient.post(EQUIPMENT_TYPE_ENDPOINTS.CREATE, typeData);
    },

    // Update equipment type
    updateEquipmentType: (id, typeData) => {
        return apiClient.put(EQUIPMENT_TYPE_ENDPOINTS.UPDATE(id), typeData);
    },

    // Delete equipment type
    deleteEquipmentType: (id) => {
        return apiClient.delete(EQUIPMENT_TYPE_ENDPOINTS.DELETE(id));
    },

    // Search equipment types
    searchEquipmentTypes: (searchParams) => {
        return apiClient.get(EQUIPMENT_TYPE_ENDPOINTS.SEARCH, { params: searchParams });
    },

    // Get supported work types for equipment type
    getSupportedWorkTypes: (id) => {
        return apiClient.get(EQUIPMENT_TYPE_ENDPOINTS.SUPPORTED_WORK_TYPES(id));
    },

    // Set supported work types for equipment type
    setSupportedWorkTypes: (id, workTypeIds) => {
        return apiClient.put(EQUIPMENT_TYPE_ENDPOINTS.SET_SUPPORTED_WORK_TYPES(id), workTypeIds);
    }
}; 