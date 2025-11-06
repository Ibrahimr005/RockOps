// src/services/hr/employeeDocumentService.js
import apiClient from '../../utils/apiClient.js';

/**
 * Service for managing employee documents
 */
export const employeeDocumentService = {
    /**
     * Get all documents for an employee
     * @param {string} employeeId - Employee UUID
     * @returns {Promise} API response with documents array
     */
    getDocuments: async (employeeId) => {
        try {
            const response = await apiClient.get(`/api/v1/hr/employees/${employeeId}/documents`);
            return response.data;
        } catch (error) {
            console.error('Error fetching employee documents:', error);
            throw error;
        }
    },

    /**
     * Get a specific document by ID
     * @param {string} employeeId - Employee UUID
     * @param {string} documentId - Document UUID
     * @returns {Promise} API response with document details
     */
    getDocumentById: async (employeeId, documentId) => {
        try {
            const response = await apiClient.get(`/api/v1/hr/employees/${employeeId}/documents/${documentId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching document:', error);
            throw error;
        }
    },

    /**
     * Upload a single document
     * @param {string} employeeId - Employee UUID
     * @param {File} file - File to upload
     * @param {string} documentType - Type of document (e.g., 'CONTRACT', 'RESUME')
     * @param {string} description - Optional description
     * @param {string} uploadedBy - Optional uploader name
     * @returns {Promise} API response with uploaded document details
     */
    uploadDocument: async (employeeId, file, documentType, description = '', uploadedBy = 'System') => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', documentType);
            if (description) formData.append('description', description);
            formData.append('uploadedBy', uploadedBy);

            const response = await apiClient.post(
                `/api/v1/hr/employees/${employeeId}/documents`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error uploading document:', error);
            throw error;
        }
    },

    /**
     * Upload multiple documents
     * @param {string} employeeId - Employee UUID
     * @param {File[]} files - Array of files to upload
     * @param {string} documentType - Type of documents
     * @param {string} description - Optional description
     * @param {string} uploadedBy - Optional uploader name
     * @returns {Promise} API response with uploaded documents
     */
    uploadMultipleDocuments: async (employeeId, files, documentType, description = '', uploadedBy = 'System') => {
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));
            formData.append('documentType', documentType);
            if (description) formData.append('description', description);
            formData.append('uploadedBy', uploadedBy);

            const response = await apiClient.post(
                `/api/v1/hr/employees/${employeeId}/documents/bulk`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error uploading multiple documents:', error);
            throw error;
        }
    },

    /**
     * Update ID card (front or back)
     * @param {string} employeeId - Employee UUID
     * @param {File} file - ID card image file
     * @param {boolean} isFront - True for front, false for back
     * @param {string} uploadedBy - Optional uploader name
     * @returns {Promise} API response with updated document
     */
    updateIdCard: async (employeeId, file, isFront, uploadedBy = 'System') => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('isFront', isFront);
            formData.append('uploadedBy', uploadedBy);

            const response = await apiClient.put(
                `/api/v1/hr/employees/${employeeId}/documents/id-card`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating ID card:', error);
            throw error;
        }
    },

    /**
     * Delete a document
     * @param {string} employeeId - Employee UUID
     * @param {string} documentId - Document UUID
     * @returns {Promise} API response
     */
    deleteDocument: async (employeeId, documentId) => {
        try {
            const response = await apiClient.delete(
                `/api/v1/hr/employees/${employeeId}/documents/${documentId}`
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    },

    /**
     * Get documents by type
     * @param {string} employeeId - Employee UUID
     * @param {string} documentType - Type of document
     * @returns {Promise} API response with documents of specified type
     */
    getDocumentsByType: async (employeeId, documentType) => {
        try {
            const response = await apiClient.get(
                `/api/v1/hr/employees/${employeeId}/documents/type/${documentType}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching documents by type:', error);
            throw error;
        }
    }
};

/**
 * Document type constants
 */
export const DOCUMENT_TYPES = {
    ID_CARD_FRONT: 'ID_CARD_FRONT',
    ID_CARD_BACK: 'ID_CARD_BACK',
    CONTRACT: 'CONTRACT',
    RESUME: 'RESUME',
    CERTIFICATE: 'CERTIFICATE',
    LICENSE: 'LICENSE',
    MEDICAL_REPORT: 'MEDICAL_REPORT',
    PROOF_OF_ADDRESS: 'PROOF_OF_ADDRESS',
    EDUCATIONAL_DOCUMENT: 'EDUCATIONAL_DOCUMENT',
    OTHER: 'OTHER'
};

/**
 * Get display name for document type
 */
export const getDocumentTypeName = (type) => {
    const names = {
        ID_CARD_FRONT: 'ID Card - Front',
        ID_CARD_BACK: 'ID Card - Back',
        CONTRACT: 'Employment Contract',
        RESUME: 'Resume/CV',
        CERTIFICATE: 'Certificate',
        LICENSE: 'License',
        MEDICAL_REPORT: 'Medical Report',
        PROOF_OF_ADDRESS: 'Proof of Address',
        EDUCATIONAL_DOCUMENT: 'Educational Document',
        OTHER: 'Other'
    };
    return names[type] || type;
};

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file icon based on mime type
 */
export const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    return '📄';
};