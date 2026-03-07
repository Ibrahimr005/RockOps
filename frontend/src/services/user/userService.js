import apiClient from '../../utils/apiClient.js';
import { USER_ENDPOINTS } from '../../config/api.config.js';

export const userService = {
    getAll: async () => {
        const response = await apiClient.get(USER_ENDPOINTS.GET_ALL);
        return response.data || response;
    }
};