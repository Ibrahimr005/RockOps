import apiClient from '../utils/apiClient';
import { MAINTENANCE_TYPE_ENDPOINTS } from '../config/api.config';

export const maintenanceTypeService = {
    getAll: () => {
        return apiClient.get(MAINTENANCE_TYPE_ENDPOINTS.BASE);
    },

    getAllForManagement: () => {
        return apiClient.get(MAINTENANCE_TYPE_ENDPOINTS.MANAGEMENT);
    },

    getById: (id) => {
        return apiClient.get(MAINTENANCE_TYPE_ENDPOINTS.BY_ID(id));
    },

    create: (maintenanceTypeData) => {
        return apiClient.post(MAINTENANCE_TYPE_ENDPOINTS.CREATE, maintenanceTypeData);
    },

    update: (id, maintenanceTypeData) => {
        return apiClient.put(MAINTENANCE_TYPE_ENDPOINTS.UPDATE(id), maintenanceTypeData);
    },

    delete: (id) => {
        return apiClient.delete(MAINTENANCE_TYPE_ENDPOINTS.DELETE(id));
    }
}; 