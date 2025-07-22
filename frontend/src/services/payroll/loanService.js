import apiClient from '../../utils/apiClient.js';

// Loan API endpoints - Matching LoanController.java exactly
const LOAN_ENDPOINTS = {
    BASE: '/api/v1/payroll/loans',
    BY_ID: (loanId) => `/api/v1/payroll/loans/${loanId}`,
    EMPLOYEE: (employeeId) => `/api/v1/payroll/loans/employee/${employeeId}`,
    ACTIVE: '/api/v1/payroll/loans/active',
    OVERDUE: '/api/v1/payroll/loans/overdue',
    STATISTICS: '/api/v1/payroll/loans/statistics',
    SCHEDULE: (loanId) => `/api/v1/payroll/loans/${loanId}/schedule`,
    APPROVE: (loanId) => `/api/v1/payroll/loans/${loanId}/approve`,
    REJECT: (loanId) => `/api/v1/payroll/loans/${loanId}/reject`,
    OUTSTANDING_BALANCE: (employeeId) => `/api/v1/payroll/loans/employee/${employeeId}/outstanding-balance`,
    PROCESS_REPAYMENT: (scheduleId) => `/api/v1/payroll/loans/repayments/${scheduleId}/pay`
};

export const loanService = {
    // Create new loan
    createLoan: (loanData, createdBy = 'SYSTEM') => {
        return apiClient.post(LOAN_ENDPOINTS.BASE, loanData, {
            params: { createdBy }
        });
    },

    // Get loan by ID
    getLoanById: (loanId) => {
        return apiClient.get(LOAN_ENDPOINTS.BY_ID(loanId));
    },

    // Update loan
    updateLoan: (loanId, loanData) => {
        return apiClient.put(LOAN_ENDPOINTS.BY_ID(loanId), loanData);
    },

    // Cancel/Delete loan
    cancelLoan: (loanId) => {
        return apiClient.delete(LOAN_ENDPOINTS.BY_ID(loanId));
    },

    // Get loans by employee
    getLoansByEmployee: (employeeId) => {
        return apiClient.get(LOAN_ENDPOINTS.EMPLOYEE(employeeId));
    },

    // Get active loans
    getActiveLoans: () => {
        return apiClient.get(LOAN_ENDPOINTS.ACTIVE);
    },

    // Get overdue loans
    getOverdueLoans: () => {
        return apiClient.get(LOAN_ENDPOINTS.OVERDUE);
    },

    // Get loans by status
    getLoansByStatus: (status) => {
        return apiClient.get(LOAN_ENDPOINTS.BASE, {
            params: { status }
        });
    },

    // Get loan statistics
    getLoanStatistics: () => {
        return apiClient.get(LOAN_ENDPOINTS.STATISTICS);
    },

    // Get loan repayment schedule
    getRepaymentSchedule: (loanId) => {
        return apiClient.get(LOAN_ENDPOINTS.SCHEDULE(loanId));
    },

    // Approve loan
    approveLoan: (loanId, approvedBy = 'SYSTEM') => {
        return apiClient.post(LOAN_ENDPOINTS.APPROVE(loanId), null, {
            params: { approvedBy }
        });
    },

    // Reject loan
    rejectLoan: (loanId, rejectedBy = 'SYSTEM', reason = '') => {
        return apiClient.post(LOAN_ENDPOINTS.REJECT(loanId), null, {
            params: { rejectedBy, reason }
        });
    },

    // Get total outstanding balance for employee
    getOutstandingBalance: (employeeId) => {
        return apiClient.get(LOAN_ENDPOINTS.OUTSTANDING_BALANCE(employeeId));
    },

    // Process loan repayment
    processRepayment: (scheduleId, amount) => {
        return apiClient.post(LOAN_ENDPOINTS.PROCESS_REPAYMENT(scheduleId), null, {
            params: { amount }
        });
    },

    // Export loan report (if needed in the future)
    exportLoanReport: (filters = {}) => {
        return apiClient.get(`${LOAN_ENDPOINTS.BASE}/export`, {
            params: filters,
            responseType: 'blob'
        });
    }
};