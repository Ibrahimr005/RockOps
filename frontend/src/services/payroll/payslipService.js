import apiClient from '../../utils/apiClient.js';

// Payslip API endpoints
const PAYSLIP_ENDPOINTS = {
    BASE: '/api/v1/payroll/payslips',
    PAYSLIP_BY_ID: (payslipId) => `/api/v1/payroll/payslips/${payslipId}`,
    GENERATE_PDF: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/generate-pdf`,
    SEND_EMAIL: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/send-email`,
    ACKNOWLEDGE: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/acknowledge`,
    DOWNLOAD: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/download`,
    BULK_GENERATE: '/api/v1/payroll/payslips/bulk-generate',
    BULK_SEND: '/api/v1/payroll/payslips/bulk-send',
    STATUS: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/status`,
    EMPLOYEE_PAYSLIPS: (employeeId) => `/api/v1/payroll/payslips/employee/${employeeId}`,
    PERIOD_PAYSLIPS: '/api/v1/payroll/payslips/period'
};

export const payslipService = {
    // Generate PDF for payslip
    generatePayslipPdf: (payslipId) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.GENERATE_PDF(payslipId));
    },

    // Send payslip via email
    sendPayslipEmail: (payslipId) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.SEND_EMAIL(payslipId));
    },

    // Acknowledge payslip receipt
    acknowledgePayslip: (payslipId) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.ACKNOWLEDGE(payslipId));
    },

    // Get payslip by ID
    getPayslipById: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.PAYSLIP_BY_ID(payslipId));
    },

    // Download payslip PDF
    downloadPayslipPdf: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.DOWNLOAD(payslipId), {
            responseType: 'blob'
        });
    },

    // Get all payslips with pagination
    getPayslips: (page = 0, size = 20, sort = 'payDate,desc') => {
        return apiClient.get(PAYSLIP_ENDPOINTS.BASE, {
            params: { page, size, sort }
        });
    },

    // Get payslips by employee
    getPayslipsByEmployee: (employeeId, page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.EMPLOYEE_PAYSLIPS(employeeId), {
            params: { page, size }
        });
    },

    // Get payslips by period
    getPayslipsByPeriod: (startDate, endDate, page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.PERIOD_PAYSLIPS, {
            params: { startDate, endDate, page, size }
        });
    },

    // Update payslip status
    updatePayslipStatus: (payslipId, status) => {
        return apiClient.put(PAYSLIP_ENDPOINTS.STATUS(payslipId), { status });
    },

    // Get payslip status
    getPayslipStatus: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.STATUS(payslipId));
    },

    // Bulk generate PDFs for multiple payslips
    bulkGeneratePdfs: (payslipIds) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.BULK_GENERATE, { payslipIds });
    },

    // Bulk send emails for multiple payslips
    bulkSendEmails: (payslipIds) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.BULK_SEND, { payslipIds });
    },

    // Search payslips
    searchPayslips: (searchCriteria) => {
        return apiClient.post(`${PAYSLIP_ENDPOINTS.BASE}/search`, searchCriteria);
    },

    // Get payslips by status
    getPayslipsByStatus: (status, page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.BASE, {
            params: { status, page, size }
        });
    },

    // Get pending payslips (not yet sent)
    getPendingPayslips: () => {
        return apiClient.get(`${PAYSLIP_ENDPOINTS.BASE}/pending`);
    },

    // Get sent payslips
    getSentPayslips: (page = 0, size = 20) => {
        return apiClient.get(`${PAYSLIP_ENDPOINTS.BASE}/sent`, {
            params: { page, size }
        });
    },

    // Get acknowledged payslips
    getAcknowledgedPayslips: (page = 0, size = 20) => {
        return apiClient.get(`${PAYSLIP_ENDPOINTS.BASE}/acknowledged`, {
            params: { page, size }
        });
    },

    // Regenerate payslip
    regeneratePayslip: (payslipId) => {
        return apiClient.post(`${PAYSLIP_ENDPOINTS.PAYSLIP_BY_ID(payslipId)}/regenerate`);
    },

    // Cancel payslip
    cancelPayslip: (payslipId) => {
        return apiClient.delete(PAYSLIP_ENDPOINTS.PAYSLIP_BY_ID(payslipId));
    },

    // Export payslips
    exportPayslips: (startDate, endDate, format = 'excel') => {
        return apiClient.get(`${PAYSLIP_ENDPOINTS.BASE}/export`, {
            params: { startDate, endDate, format },
            responseType: 'blob'
        });
    }
};