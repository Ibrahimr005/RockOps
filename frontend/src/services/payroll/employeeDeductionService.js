// frontend/src/services/payroll/employeeDeductionService.js
import apiClient from '../../utils/apiClient.js';

// Employee Deduction API endpoints
const EMPLOYEE_DEDUCTION_ENDPOINTS = {
    BASE: '/api/v1/payroll/employee-deductions',
    BY_ID: (id) => `/api/v1/payroll/employee-deductions/${id}`,
    BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/employee-deductions/employee/${employeeId}`,
    ACTIVE_BY_EMPLOYEE: (employeeId) => `/api/v1/payroll/employee-deductions/employee/${employeeId}/active`,
    FOR_PERIOD: (employeeId) => `/api/v1/payroll/employee-deductions/employee/${employeeId}/period`,
    REACTIVATE: (id) => `/api/v1/payroll/employee-deductions/${id}/reactivate`,
    PERMANENT_DELETE: (id) => `/api/v1/payroll/employee-deductions/${id}/permanent`,
    CALCULATION_METHODS: '/api/v1/payroll/employee-deductions/calculation-methods',
    FREQUENCIES: '/api/v1/payroll/employee-deductions/frequencies',
    CALCULATE_PREVIEW: '/api/v1/payroll/employee-deductions/calculate-preview'
};

export const employeeDeductionService = {
    // Get all deductions for an employee
    getDeductionsByEmployee: (employeeId) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_EMPLOYEE(employeeId));
    },

    // Get active deductions for an employee
    getActiveDeductionsByEmployee: (employeeId) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.ACTIVE_BY_EMPLOYEE(employeeId));
    },

    // Get deduction by ID
    getDeductionById: (id) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_ID(id));
    },

    // Get deductions for a payroll period
    getDeductionsForPayrollPeriod: (employeeId, startDate, endDate) => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.FOR_PERIOD(employeeId), {
            params: { startDate, endDate }
        });
    },

    // Create a new employee deduction
    createDeduction: (deductionData) => {
        return apiClient.post(EMPLOYEE_DEDUCTION_ENDPOINTS.BASE, deductionData);
    },

    // Update an employee deduction
    updateDeduction: (id, deductionData) => {
        return apiClient.put(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_ID(id), deductionData);
    },

    // Deactivate a deduction (soft delete)
    deactivateDeduction: (id) => {
        return apiClient.delete(EMPLOYEE_DEDUCTION_ENDPOINTS.BY_ID(id));
    },

    // Reactivate a deduction
    reactivateDeduction: (id) => {
        return apiClient.post(EMPLOYEE_DEDUCTION_ENDPOINTS.REACTIVATE(id));
    },

    // Permanently delete a deduction (admin only)
    deleteDeductionPermanently: (id) => {
        return apiClient.delete(EMPLOYEE_DEDUCTION_ENDPOINTS.PERMANENT_DELETE(id));
    },

    // Get available calculation methods
    getCalculationMethods: () => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.CALCULATION_METHODS);
    },

    // Get available frequencies
    getFrequencies: () => {
        return apiClient.get(EMPLOYEE_DEDUCTION_ENDPOINTS.FREQUENCIES);
    },

    // Calculate deductions preview (without applying)
    calculateDeductionsPreview: (employeeId, periodStart, periodEnd, grossSalary, basicSalary) => {
        return apiClient.post(EMPLOYEE_DEDUCTION_ENDPOINTS.CALCULATE_PREVIEW, {
            employeeId,
            periodStart,
            periodEnd,
            grossSalary,
            basicSalary
        });
    }
};

export default employeeDeductionService;
