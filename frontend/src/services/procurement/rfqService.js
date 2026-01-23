// src/services/procurement/rfqService.js
import apiClient from '../../utils/apiClient.js';
import { RFQ_ENDPOINTS } from '../../config/api.config.js';

export const rfqService = {
    /**
     * Export RFQ to Excel
     * @param {Object} exportRequest - Contains offerId, items, language, filename
     * @returns {Blob} Excel file as blob
     */
    exportRFQ: async (exportRequest) => {
        const response = await apiClient.post(RFQ_ENDPOINTS.EXPORT, exportRequest, {
            responseType: 'blob', // Important for file download
        });
        return response.data;
    },

    /**
     * Import and preview RFQ response from Excel
     * @param {UUID} offerId - The offer ID
     * @param {File} file - The Excel file uploaded by user
     * @returns {Object} Preview data with valid/invalid rows
     */
    importAndPreview: async (offerId, file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post(
            RFQ_ENDPOINTS.IMPORT_PREVIEW(offerId),
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data || response;
    },

    /**
     * Confirm and import RFQ response data after preview
     * @param {UUID} offerId - The offer ID
     * @param {UUID} merchantId - The merchant providing the response
     * @param {Array} validRowIds - IDs of rows to import
     * @param {Object} preview - The preview data
     * @returns {Array} Created offer items
     */
        /**
         * Confirm and import RFQ response data after preview
         * @param {UUID} offerId - The offer ID
         * @param {UUID} merchantId - The merchant providing the response
         * @param {Array} selectedItemTypeIds - Item type IDs to import
         * @param {Object} previewData - The preview data containing rows
         * @returns {Array} Created offer items
         */
        confirmImport: async (offerId, merchantId, selectedItemTypeIds, previewData) => {
            // Filter and map the selected rows to include currency and delivery days
            const updatedPreview = {
                ...previewData,
                rows: previewData.rows.map(row => ({
                    ...row,
                    currency: row.currency || 'EGP',
                    estimatedDeliveryDays: row.estimatedDeliveryDays
                }))
            };

            const params = new URLSearchParams();
            params.append('merchantId', merchantId);
            selectedItemTypeIds.forEach(id => params.append('validRowIds', id));

            const response = await apiClient.post(
                `${RFQ_ENDPOINTS.IMPORT_CONFIRM(offerId)}?${params.toString()}`,
                updatedPreview
            );
            return response.data || response;
        },

    /**
     * Helper method to download the exported Excel file
     * @param {Blob} blob - The Excel file blob
     * @param {String} filename - The filename to save as
     */
    downloadExcelFile: (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};