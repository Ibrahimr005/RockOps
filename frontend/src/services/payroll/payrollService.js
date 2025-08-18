// ==================== PAYROLL SERVICE ====================
// frontend/src/services/payroll/payrollService.js
import apiClient from '../../utils/apiClient.js';

const PAYROLL_ENDPOINTS = {
    BASE: '/api/v1/payroll',
    GENERATE_MONTHLY: (year, month) => `/api/v1/payroll/generate-monthly/${year}/${month}`,
    GENERATE_MONTHLY_PARAM: '/api/v1/payroll/generate-monthly',
    REPORT: '/api/v1/payroll/report',
    SUMMARY: '/api/v1/payroll/summary',
    EMPLOYEE: (employeeId) => `/api/v1/payroll/employee/${employeeId}`,
    PERIOD: '/api/v1/payroll/period',
    FINALIZE_PERIOD: '/api/v1/payroll/finalize-period',
    SEND_PERIOD: '/api/v1/payroll/send-period',
    STATUS: (status) => `/api/v1/payroll/status/${status}`,
    STATUS_SUMMARY: '/api/v1/payroll/status-summary',
    EXISTS: (year, month) => `/api/v1/payroll/exists/${year}/${month}`,
    MISSING_PAYSLIPS: (year, month) => `/api/v1/payroll/missing-payslips/${year}/${month}`,
    GENERATE_SPECIFIC: '/api/v1/payroll/generate-specific',
    MONTHLY_STATS: (year) => `/api/v1/payroll/monthly-stats/${year}`,
    VALIDATE: (year, month) => `/api/v1/payroll/validate/${year}/${month}`,
    REPROCESS_FAILED: '/api/v1/payroll/reprocess-failed',
    EXPORT: '/api/v1/payroll/export'
};

export const payrollService = {
    // Generate monthly payslips for all employees
    generateMonthlyPayslips: (year, month, createdBy = 'SYSTEM') => {
        return apiClient.post(PAYROLL_ENDPOINTS.GENERATE_MONTHLY(year, month), null, {
            params: { createdBy }
        });
    },

    // Generate monthly payslips with YearMonth parameter
    generateMonthlyPayslipsWithParam: (payPeriod, createdBy = 'SYSTEM') => {
        return apiClient.post(PAYROLL_ENDPOINTS.GENERATE_MONTHLY_PARAM, null, {
            params: { payPeriod, createdBy }
        });
    },

    // Get payroll report for a period
    getPayrollReport: (startDate, endDate) => {
        return apiClient.get(PAYROLL_ENDPOINTS.REPORT, {
            params: { startDate, endDate }
        });
    },

    // Get payroll summary (more efficient than full report)
    getPayrollSummary: (startDate, endDate) => {
        return apiClient.get(PAYROLL_ENDPOINTS.SUMMARY, {
            params: { startDate, endDate }
        });
    },

    // Get payslips by employee
    getPayslipsByEmployee: (employeeId) => {
        return apiClient.get(PAYROLL_ENDPOINTS.EMPLOYEE(employeeId));
    },

    // Get payslips by period
    getPayslipsByPeriod: (startDate, endDate) => {
        return apiClient.get(PAYROLL_ENDPOINTS.PERIOD, {
            params: { startDate, endDate }
        });
    },

    // Bulk finalize payslips for a period
    finalizePayslipsForPeriod: (startDate, endDate, approvedBy = 'SYSTEM') => {
        return apiClient.post(PAYROLL_ENDPOINTS.FINALIZE_PERIOD, null, {
            params: { startDate, endDate, approvedBy }
        });
    },

    // Bulk send payslips for a period
    sendPayslipsForPeriod: (startDate, endDate) => {
        return apiClient.post(PAYROLL_ENDPOINTS.SEND_PERIOD, null, {
            params: { startDate, endDate }
        });
    },

    // Get payslips by status for a period
    getPayslipsByStatusAndPeriod: (status, startDate, endDate) => {
        return apiClient.get(PAYROLL_ENDPOINTS.STATUS(status), {
            params: { startDate, endDate }
        });
    },

    // Get payroll status summary
    getPayrollStatusSummary: (startDate, endDate) => {
        return apiClient.get(PAYROLL_ENDPOINTS.STATUS_SUMMARY, {
            params: { startDate, endDate }
        });
    },

    // Check if payroll exists for a period
    payrollExistsForPeriod: (year, month) => {
        return apiClient.get(PAYROLL_ENDPOINTS.EXISTS(year, month));
    },

    // Get employees without payslips for a period
    getEmployeesWithoutPayslipsForPeriod: (year, month) => {
        return apiClient.get(PAYROLL_ENDPOINTS.MISSING_PAYSLIPS(year, month));
    },

    // Generate payslips for specific employees only
    generatePayslipsForEmployees: (employeeIds, payPeriod, createdBy = 'SYSTEM') => {
        return apiClient.post(PAYROLL_ENDPOINTS.GENERATE_SPECIFIC, employeeIds, {
            params: { payPeriod, createdBy }
        });
    },

    // Get monthly payroll statistics
    getMonthlyPayrollStats: (year) => {
        return apiClient.get(PAYROLL_ENDPOINTS.MONTHLY_STATS(year));
    },

    // Validate payroll data for a period
    validatePayrollForPeriod: (year, month) => {
        return apiClient.post(PAYROLL_ENDPOINTS.VALIDATE(year, month));
    },

    // Reprocess failed payslips
    reprocessFailedPayslips: (startDate, endDate, reprocessedBy = 'SYSTEM') => {
        return apiClient.post(PAYROLL_ENDPOINTS.REPROCESS_FAILED, null, {
            params: { startDate, endDate, reprocessedBy }
        });
    },

    // Export payroll data
    exportPayrollData: (startDate, endDate, format = 'excel') => {
        return apiClient.get(PAYROLL_ENDPOINTS.EXPORT, {
            params: { startDate, endDate, format },
            responseType: 'blob'
        });
    }
};