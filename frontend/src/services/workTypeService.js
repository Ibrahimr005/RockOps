// src/services/workTypeService.js
import apiClient from '../utils/apiClient';
import { WORK_TYPE_ENDPOINTS } from '../config/api.config';

export const workTypeService = {
    getAll: () => {
        return apiClient.get(WORK_TYPE_ENDPOINTS.BASE);
    },

    getAllForManagement: () => {
        return apiClient.get(WORK_TYPE_ENDPOINTS.MANAGEMENT);
    },

    getById: (id) => {
        return apiClient.get(WORK_TYPE_ENDPOINTS.BY_ID(id));
    },

    create: (workTypeData) => {
        return apiClient.post(WORK_TYPE_ENDPOINTS.CREATE, workTypeData);
    },

    update: (id, workTypeData) => {
        return apiClient.put(WORK_TYPE_ENDPOINTS.UPDATE(id), workTypeData);
    },

    delete: (id) => {
        return apiClient.delete(WORK_TYPE_ENDPOINTS.DELETE(id));
    },

    reactivateByName: (name, workTypeData) => {
        return apiClient.post(`${WORK_TYPE_ENDPOINTS.BASE}/reactivate`, { 
            name, 
            workTypeData 
        });
    }
}; 