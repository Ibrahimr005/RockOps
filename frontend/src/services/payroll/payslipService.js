import apiClient from '../../utils/apiClient.js';

// Updated Payslip API endpoints to match backend controller
const PAYSLIP_ENDPOINTS = {
    BASE: '/api/v1/payroll/payslips',
    BY_ID: (payslipId) => `/api/v1/payroll/payslips/${payslipId}`,
    CREATE: '/api/v1/payroll/payslips',
    UPDATE: (payslipId) => `/api/v1/payroll/payslips/${payslipId}`,
    FINALIZE: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/finalize`,
    SEND: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/send`,
    ACKNOWLEDGE: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/acknowledge`,
    GENERATE_PDF: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/generate-pdf`,
    DOWNLOAD: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/download`,
    BULK_FINALIZE: '/api/v1/payroll/payslips/bulk-finalize',
    BULK_SEND: '/api/v1/payroll/payslips/bulk-send',
    BULK_GENERATE: '/api/v1/payroll/payslips/bulk-generate',
    STATUS: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/status`,
    STATUS_UPDATE: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/status`,
    EMPLOYEE: (employeeId) => `/api/v1/payroll/payslips/employee/${employeeId}`,
    PERIOD: '/api/v1/payroll/payslips/period',
    SEARCH: '/api/v1/payroll/payslips/search',
    SEARCH_ADVANCED: '/api/v1/payroll/payslips/search',
    EXPORT: '/api/v1/payroll/payslips/export',
    PENDING: '/api/v1/payroll/payslips/pending',
    SENT: '/api/v1/payroll/payslips/sent',
    ACKNOWLEDGED: '/api/v1/payroll/payslips/acknowledged',
    REGENERATE: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/regenerate`,
    CANCEL: (payslipId) => `/api/v1/payroll/payslips/${payslipId}`,
    DELETE: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/force`,
    LOAN_SUMMARY: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/loan-summary`,
    STATUS_INFO: (payslipId) => `/api/v1/payroll/payslips/${payslipId}/status-info`,
    COUNT: '/api/v1/payroll/payslips/count'
};

export const payslipService = {
    // FIXED: Get all payslips with proper pagination parameters
    getPayslips: (page = 0, size = 20, sort = 'payDate,desc', status = null) => {
        const params = { page, size, sort };
        if (status) {
            params.status = status;
        }
        return apiClient.get(PAYSLIP_ENDPOINTS.BASE, { params });
    },

    // Alternative method for loading all payslips (for DataTable internal pagination)
    getAllPayslips: (maxSize = 1000) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.BASE, {
            params: { page: 0, size: maxSize, sort: 'payDate,desc' }
        });
    },

    // Create new payslip
    createPayslip: (payslipData, createdBy = 'SYSTEM') => {
        return apiClient.post(PAYSLIP_ENDPOINTS.CREATE, payslipData, {
            params: { createdBy }
        });
    },

    // Get payslip by ID
    getPayslipById: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.BY_ID(payslipId));
    },

    // Update payslip
    updatePayslip: (payslipId, payslipData) => {
        return apiClient.put(PAYSLIP_ENDPOINTS.UPDATE(payslipId), payslipData);
    },

    // Delete payslip (force delete)
    deletePayslip: (payslipId) => {
        return apiClient.delete(PAYSLIP_ENDPOINTS.DELETE(payslipId));
    },

    // Cancel payslip (soft delete)
    cancelPayslip: (payslipId) => {
        return apiClient.delete(PAYSLIP_ENDPOINTS.CANCEL(payslipId));
    },

    // FIXED: Finalize payslip with correct parameter
    finalizePayslip: (payslipId, approvedBy = 'SYSTEM') => {
        return apiClient.post(PAYSLIP_ENDPOINTS.FINALIZE(payslipId), null, {
            params: { approvedBy }
        });
    },

    // Send payslip via email
    sendPayslip: (payslipId) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.SEND(payslipId));
    },

    // Acknowledge payslip receipt
    acknowledgePayslip: (payslipId) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.ACKNOWLEDGE(payslipId));
    },

    // Generate PDF for payslip
    generatePayslipPdf: (payslipId) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.GENERATE_PDF(payslipId));
    },

    // Download payslip PDF
    downloadPayslip: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.DOWNLOAD(payslipId), {
            responseType: 'blob'
        });
    },

    // FIXED: Bulk operations to match backend endpoints
    bulkFinalizePayslips: (payslipIds, approvedBy = 'SYSTEM') => {
        return apiClient.post(PAYSLIP_ENDPOINTS.BULK_FINALIZE, payslipIds, {
            params: { approvedBy }
        });
    },

    // Bulk send payslips
    bulkSendPayslips: (payslipIds) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.BULK_SEND, payslipIds);
    },

    // FIXED: Bulk generate PDFs
    bulkGeneratePdfs: (payslipIds) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.BULK_GENERATE, payslipIds);
    },

    // Get payslip status
    getPayslipStatus: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.STATUS(payslipId));
    },

    // FIXED: Update payslip status
    updatePayslipStatus: (payslipId, status) => {
        return apiClient.put(PAYSLIP_ENDPOINTS.STATUS_UPDATE(payslipId), status, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    },

    // FIXED: Get payslips by employee with pagination
    getPayslipsByEmployee: (employeeId, page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.EMPLOYEE(employeeId), {
            params: { page, size }
        });
    },

    // FIXED: Get payslips by period with pagination
    getPayslipsByPeriod: (startDate, endDate, page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.PERIOD, {
            params: { startDate, endDate, page, size }
        });
    },

    // FIXED: Get payslips by status with pagination
    getPayslipsByStatus: (status, page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.BASE, {
            params: { status, page, size, sort: 'payDate,desc' }
        });
    },

    // FIXED: Get pending payslips (returns List, not Page)
    getPendingPayslips: () => {
        return apiClient.get(PAYSLIP_ENDPOINTS.PENDING);
    },

    // FIXED: Get sent payslips with pagination
    getSentPayslips: (page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.SENT, {
            params: { page, size }
        });
    },

    // FIXED: Get acknowledged payslips with pagination
    getAcknowledgedPayslips: (page = 0, size = 20) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.ACKNOWLEDGED, {
            params: { page, size }
        });
    },

    // FIXED: Search payslips using POST method for complex criteria
    searchPayslips: (searchCriteria, page = 0, size = 20) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.SEARCH, searchCriteria, {
            params: { page, size }
        });
    },

    // FIXED: Advanced search using GET method with query parameters
    searchPayslipsAdvanced: (criteria) => {
        const {
            employeeName,
            status,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            page = 0,
            size = 20,
            sort = 'payDate,desc'
        } = criteria;

        const params = { page, size, sort };

        if (employeeName) params.employeeName = employeeName;
        if (status) params.status = status;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (minAmount !== undefined) params.minAmount = minAmount;
        if (maxAmount !== undefined) params.maxAmount = maxAmount;

        return apiClient.get(PAYSLIP_ENDPOINTS.SEARCH_ADVANCED, { params });
    },

    // Export payslips
    exportPayslips: (startDate, endDate, format = 'excel') => {
        return apiClient.get(PAYSLIP_ENDPOINTS.EXPORT, {
            params: { startDate, endDate, format },
            responseType: 'blob'
        });
    },

    // FIXED: Regenerate payslip
    regeneratePayslip: (payslipId) => {
        return apiClient.post(PAYSLIP_ENDPOINTS.REGENERATE(payslipId));
    },

    // FIXED: Get payslip with loan summary
    getPayslipWithLoanSummary: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.LOAN_SUMMARY(payslipId));
    },

    // FIXED: Get payslip status info
    getPayslipStatusInfo: (payslipId) => {
        return apiClient.get(PAYSLIP_ENDPOINTS.STATUS_INFO(payslipId));
    },

    // FIXED: Count payslips by search criteria
    countPayslipsBySearchCriteria: (criteria) => {
        const {
            employeeName,
            status,
            startDate,
            endDate,
            minAmount,
            maxAmount
        } = criteria;

        const params = {};

        if (employeeName) params.employeeName = employeeName;
        if (status) params.status = status;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (minAmount !== undefined) params.minAmount = minAmount;
        if (maxAmount !== undefined) params.maxAmount = maxAmount;

        return apiClient.get(PAYSLIP_ENDPOINTS.COUNT, { params });
    },

    // HELPER METHODS for frontend convenience

    // Get all payslips for a specific status
    getAllPayslipsByStatus: async (status) => {
        try {
            const response = await apiClient.get(PAYSLIP_ENDPOINTS.BASE, {
                params: { status, page: 0, size: 1000, sort: 'payDate,desc' }
            });
            return response;
        } catch (error) {
            console.error(`Error fetching payslips with status ${status}:`, error);
            throw error;
        }
    },

    // Get payslip statistics
    getPayslipStatistics: async () => {
        try {
            const [pending, approved, sent, acknowledged] = await Promise.allSettled([
                apiClient.get(PAYSLIP_ENDPOINTS.PENDING),
                payslipService.getAllPayslipsByStatus('APPROVED'),
                payslipService.getAllPayslipsByStatus('SENT'),
                payslipService.getAllPayslipsByStatus('ACKNOWLEDGED')
            ]);

            const stats = {
                pending: 0,
                approved: 0,
                sent: 0,
                acknowledged: 0,
                total: 0
            };

            if (pending.status === 'fulfilled') {
                stats.pending = Array.isArray(pending.value.data) ? pending.value.data.length : 0;
            }

            if (approved.status === 'fulfilled') {
                const data = approved.value.data;
                stats.approved = data.totalElements || (Array.isArray(data.content) ? data.content.length : 0);
            }

            if (sent.status === 'fulfilled') {
                const data = sent.value.data;
                stats.sent = data.totalElements || (Array.isArray(data.content) ? data.content.length : 0);
            }

            if (acknowledged.status === 'fulfilled') {
                const data = acknowledged.value.data;
                stats.acknowledged = data.totalElements || (Array.isArray(data.content) ? data.content.length : 0);
            }

            stats.total = stats.pending + stats.approved + stats.sent + stats.acknowledged;

            return { data: stats };
        } catch (error) {
            console.error('Error fetching payslip statistics:', error);
            throw error;
        }
    },

    // Validate payslip operation based on status
    canPerformOperation: (payslip, operation) => {
        const status = payslip.status;

        switch (operation) {
            case 'edit':
                return status === 'DRAFT';
            case 'finalize':
                return status === 'DRAFT';
            case 'send':
                return status === 'APPROVED';
            case 'download':
                return ['APPROVED', 'SENT', 'ACKNOWLEDGED'].includes(status);
            case 'generatePdf':
                return status !== 'DRAFT';
            case 'acknowledge':
                return status === 'SENT';
            case 'regenerate':
                return status !== 'ACKNOWLEDGED';
            case 'cancel':
                return status !== 'ACKNOWLEDGED';
            case 'delete':
                return status === 'DRAFT';
            default:
                return false;
        }
    },

    // Get status label for display
    getStatusLabel: (status) => {
        const statusLabels = {
            DRAFT: 'Draft',
            APPROVED: 'Approved',
            SENT: 'Sent',
            ACKNOWLEDGED: 'Acknowledged'
        };
        return statusLabels[status] || status;
    },

    // Get next possible status transitions
    getNextStatusOptions: (currentStatus) => {
        const transitions = {
            DRAFT: ['APPROVED'],
            APPROVED: ['SENT'],
            SENT: ['ACKNOWLEDGED'],
            ACKNOWLEDGED: []
        };
        return transitions[currentStatus] || [];
    }
};