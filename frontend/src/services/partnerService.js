// src/services/partnerService.js
import apiClient from '../utils/apiClient';
import { PARTNER_ENDPOINTS } from '../config/api.config';

export const partnerService = {
    getAll: () => {
        return apiClient.get(PARTNER_ENDPOINTS.GET_ALL);
    },

    add: (firstName, lastName) => {
        return apiClient.post(PARTNER_ENDPOINTS.ADD, null, {
            params: { firstName, lastName }
        });
    },

    update: (id, firstName, lastName) => {
        return apiClient.put(PARTNER_ENDPOINTS.UPDATE(id), null, {
            params: { firstName, lastName }
        });
    },

    delete: (id) => {
        return apiClient.delete(PARTNER_ENDPOINTS.DELETE(id));
    }
}; 