import apiClient from "../../utils/apiClient.js";

const VACATION_BALANCE_ENDPOINTS = {
    BASE: '/api/v1/vacation-balance',
    EMPLOYEE: (employeeId) => `/api/v1/vacation-balance/${employeeId}`,
    INITIALIZE: (year) => `/api/v1/vacation-balance/initialize/${year}`,
    CARRY_FORWARD: '/api/v1/vacation-balance/carry-forward',
    BONUS: (employeeId) => `/api/v1/vacation-balance/${employeeId}/bonus`,
    LOW_BALANCE: '/api/v1/vacation-balance/low-balance'
};

export const vacationBalanceService = {
    // Get vacation balance for a specific employee
    getVacationBalance: (employeeId) => {
        return apiClient.get(VACATION_BALANCE_ENDPOINTS.EMPLOYEE(employeeId));
    },

    // Get all vacation balances for a year (admin/HR only)
    getAllVacationBalances: (year = null) => {
        const params = year ? { year } : {};
        return apiClient.get(VACATION_BALANCE_ENDPOINTS.BASE, { params });
    },

    // Initialize vacation balances for a year
    initializeYearlyBalances: (year) => {
        return apiClient.post(VACATION_BALANCE_ENDPOINTS.INITIALIZE(year));
    },

    // Carry forward vacation balances
    carryForwardBalances: (fromYear, toYear, maxCarryForward = 5) => {
        return apiClient.post(VACATION_BALANCE_ENDPOINTS.CARRY_FORWARD, {
            params: { fromYear, toYear, maxCarryForward }
        });
    },

    // Award bonus days to an employee
    awardBonusDays: (employeeId, year, bonusDays, reason) => {
        return apiClient.post(VACATION_BALANCE_ENDPOINTS.BONUS(employeeId), {
            year,
            bonusDays,
            reason
        });
    },

    // Get employees with low vacation balance
    getEmployeesWithLowBalance: (year = null, threshold = 5) => {
        const params = {};
        if (year) params.year = year;
        if (threshold) params.threshold = threshold;

        return apiClient.get(VACATION_BALANCE_ENDPOINTS.LOW_BALANCE, { params });
    }
};