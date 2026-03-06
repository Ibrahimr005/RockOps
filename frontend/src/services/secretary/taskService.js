import apiClient from '../../utils/apiClient.js';
import { TASK_ENDPOINTS } from '../../config/api.config.js';

export const taskService = {

    getAll: async () => {
        const response = await apiClient.get(TASK_ENDPOINTS.GET_ALL);
        return response.data || response;
    },

    getById: async (id) => {
        const response = await apiClient.get(TASK_ENDPOINTS.GET_BY_ID(id));
        return response.data || response;
    },

    getByUser: async (userId) => {
        const response = await apiClient.get(TASK_ENDPOINTS.BY_USER(userId));
        return response.data || response;
    },

    getByStatus: async (status) => {
        const response = await apiClient.get(TASK_ENDPOINTS.BY_STATUS(status));
        return response.data || response;
    },

    getByUserAndStatus: async (userId, status) => {
        const response = await apiClient.get(TASK_ENDPOINTS.BY_USER_AND_STATUS(userId, status));
        return response.data || response;
    },

    create: async (secretaryId, taskData) => {
        const response = await apiClient.post(TASK_ENDPOINTS.CREATE(secretaryId), taskData);
        return response.data || response;
    },

    update: async (id, taskData) => {
        const response = await apiClient.put(TASK_ENDPOINTS.UPDATE(id), taskData);
        return response.data || response;
    },

    updateStatus: async (id, status) => {
        const response = await apiClient.patch(TASK_ENDPOINTS.UPDATE_STATUS(id), { status });
        return response.data || response;
    },

    delete: async (id) => {
        const response = await apiClient.delete(TASK_ENDPOINTS.DELETE(id));
        return response.data || response;
    },
};