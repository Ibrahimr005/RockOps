import apiClient from '../../utils/apiClient.js';

// Payroll API endpoints
const PAYROLL_ENDPOINTS = {
    BASE: '/api/v1/payroll',
    GENERATE_MONTHLY: (year, month) => `/api/v1/payroll/generate-monthly/${year}/${month}`,
    REPORT: '/api/v1/payroll/report',
    EMPLOYEE: (employeeId) => `/api/v1/payroll/employee/${employeeId}`,
    PERIOD: '/api/v1/payroll/period',
    HEALTH: '/api/v1/payroll/health'
};

export const payrollService = {
    // Generate monthly payslips for all employees
    generateMonthlyPayslips: (year, month, createdBy = 'SYSTEM') => {
        return apiClient.post(PAYROLL_ENDPOINTS.GENERATE_MONTHLY(year, month), null, {
            params: { createdBy }
        });
    },

    // Get payroll report for a period
    getPayrollReport: (startDate, endDate) => {
        return apiClient.get(PAYROLL_ENDPOINTS.REPORT, {
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

    // Get payroll statistics
    getPayrollStatistics: (year, month) => {
        return apiClient.get(`${PAYROLL_ENDPOINTS.BASE}/statistics`, {
            params: { year, month }
        });
    },

    // Get payroll summary by department
    getPayrollSummaryByDepartment: (startDate, endDate) => {
        return apiClient.get(`${PAYROLL_ENDPOINTS.BASE}/summary/department`, {
            params: { startDate, endDate }
        });
    },

    // Export payroll report
    exportPayrollReport: (startDate, endDate, format = 'excel') => {
        return apiClient.get(`${PAYROLL_ENDPOINTS.BASE}/export`, {
            params: { startDate, endDate, format },
            responseType: 'blob'
        });
    },

    // Health check
    healthCheck: () => {
        return apiClient.get(PAYROLL_ENDPOINTS.HEALTH);
    }
};