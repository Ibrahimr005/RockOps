// src/services/documentService.js
import apiClient from '../utils/apiClient';
import { DOCUMENT_ENDPOINTS } from '../config/api.config';

export const documentService = {
    getById: (id) => {
        return apiClient.get(DOCUMENT_ENDPOINTS.BY_ID(id));
    },

    getByEntity: (entityType, entityId) => {
        return apiClient.get(DOCUMENT_ENDPOINTS.BY_ENTITY(entityType, entityId));
    },

    create: (entityType, entityId, documentData) => {
        const formData = new FormData();
        formData.append('name', documentData.name);
        formData.append('type', documentData.type);
        formData.append('file', documentData.file);

        return apiClient.post(DOCUMENT_ENDPOINTS.CREATE(entityType, entityId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    delete: (id) => {
        return apiClient.delete(DOCUMENT_ENDPOINTS.DELETE(id));
    }
}; 