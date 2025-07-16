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
    },

    // Update document (name and type only)
    update: (id, documentData) => {
        const formData = new FormData();
        formData.append('name', documentData.name);
        formData.append('type', documentData.type);
        
        return apiClient.put(DOCUMENT_ENDPOINTS.UPDATE(id), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // View document (get document details with URL)
    view: (id) => {
        return apiClient.get(DOCUMENT_ENDPOINTS.BY_ID(id));
    },

    // Download document (get file URL)
    download: (id) => {
        return apiClient.get(DOCUMENT_ENDPOINTS.BY_ID(id));
    },

    // Sarky-specific document methods
    getBySarkyMonth: (entityType, entityId, month, year) => {
        return apiClient.get(DOCUMENT_ENDPOINTS.BY_SARKY_MONTH(entityType, entityId, month, year));
    },

    createSarkyDocument: (entityType, entityId, documentData, month, year) => {
        const formData = new FormData();
        formData.append('name', documentData.name);
        formData.append('type', documentData.type);
        formData.append('file', documentData.file);
        formData.append('month', month);
        formData.append('year', year);

        return apiClient.post(DOCUMENT_ENDPOINTS.CREATE_SARKY(entityType, entityId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    assignToSarkyMonth: (documentId, month, year) => {
        console.log('Assigning to sarky month - API call:', {
            documentId,
            month: Number(month),
            year: Number(year)
        });
        return apiClient.put(`${DOCUMENT_ENDPOINTS.ASSIGN_SARKY(documentId)}?month=${Number(month)}&year=${Number(year)}`);
    },

    removeSarkyAssignment: (documentId) => {
        return apiClient.delete(DOCUMENT_ENDPOINTS.REMOVE_SARKY(documentId));
    },

    getSarkyDocumentTypes: () => {
        return apiClient.get(DOCUMENT_ENDPOINTS.SARKY_TYPES);
    }
}; 