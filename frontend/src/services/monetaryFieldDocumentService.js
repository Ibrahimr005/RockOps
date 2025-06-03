import apiClient from '../utils/apiClient';

export const monetaryFieldDocumentService = {
    // Get all monetary field documents for equipment
    getByEquipment: (equipmentId) => {
        return apiClient.get(`/api/equipment/${equipmentId}/monetary-documents`);
    },

    // Get monetary field documents by field type
    getByEquipmentAndFieldType: (equipmentId, fieldType) => {
        return apiClient.get(`/api/equipment/${equipmentId}/monetary-documents/${fieldType}`);
    },

    // Get document by ID
    getById: (documentId) => {
        return apiClient.get(`/api/equipment/monetary-documents/${documentId}`);
    },

    // Upload document for monetary field
    uploadDocument: (equipmentId, fieldType, documentData) => {
        const formData = new FormData();
        formData.append('file', documentData.file);
        formData.append('documentName', documentData.documentName);
        formData.append('documentType', documentData.documentType);

        return apiClient.post(
            `/api/equipment/${equipmentId}/monetary-documents/${fieldType}`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' }
            }
        );
    },

    // Delete document
    deleteDocument: (documentId) => {
        return apiClient.delete(`/api/equipment/monetary-documents/${documentId}`);
    }
}; 