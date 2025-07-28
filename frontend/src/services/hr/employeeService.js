import apiClient from '../../utils/apiClient.js';
import { EMPLOYEE_ENDPOINTS } from '../../config/api.config.js';

export const employeeService = {
    /**
     * Get all employees with full data
     * @returns {Promise} API response with full employee data
     */
    getAll: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching all employees:', error);
            throw error;
        }
    },

    /**
     * Get employees with minimal data for attendance operations
     * This is more efficient for large lists and attendance operations
     * @returns {Promise} API response with minimal employee data
     */
    getMinimal: async () => {
        try {
            const response = await apiClient.get(`${EMPLOYEE_ENDPOINTS.BASE}/minimal`);
            return response;
        } catch (error) {
            console.error('Error fetching minimal employee data:', error);
            throw error;
        }
    },

    /**
     * Get employees by contract type with minimal data
     * @param {string} contractType - Contract type (HOURLY, DAILY, MONTHLY)
     * @returns {Promise} API response with filtered employees
     */
    getByContractType: async (contractType) => {
        try {
            const response = await apiClient.get(`${EMPLOYEE_ENDPOINTS.BASE}/by-contract-type/${contractType.toUpperCase()}`);
            return response;
        } catch (error) {
            console.error(`Error fetching employees by contract type ${contractType}:`, error);
            throw error;
        }
    },

    /**
     * Get active employees by contract type with minimal data
     * @param {string} contractType - Contract type (HOURLY, DAILY, MONTHLY)
     * @returns {Promise} API response with filtered active employees
     */
    getActiveByContractType: async (contractType) => {
        try {
            const response = await apiClient.get(`${EMPLOYEE_ENDPOINTS.BASE}/active/by-contract-type/${contractType.toUpperCase()}`);
            return response;
        } catch (error) {
            console.error(`Error fetching active employees by contract type ${contractType}:`, error);
            throw error;
        }
    },

    /**
     * Get employee by ID
     * @param {string} id - Employee ID
     * @returns {Promise} API response with employee
     */
    getById: async (id) => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching employee ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create new employee
     * @param {Object} employeeData - Employee data
     * @returns {Promise} API response with created employee
     */
    create: async (employeeData) => {
        try {
            return await apiClient.post(EMPLOYEE_ENDPOINTS.BASE, employeeData);
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    },

    /**
     * Update employee
     * @param {string} id - Employee ID
     * @param {Object} employeeData - Updated employee data
     * @returns {Promise} API response with updated employee
     */
    update: async (id, employeeData) => {
        try {
            return await apiClient.put(EMPLOYEE_ENDPOINTS.BY_ID(id), employeeData);
        } catch (error) {
            console.error(`Error updating employee ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete employee
     * @param {string} id - Employee ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(EMPLOYEE_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error deleting employee ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get employee attendance
     * @param {string} employeeId - Employee ID
     * @returns {Promise} API response with employee attendance
     */
    getAttendance: async (employeeId) => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.ATTENDANCE.BY_EMPLOYEE(employeeId));
        } catch (error) {
            console.error(`Error fetching attendance for employee ${employeeId}:`, error);
            throw error;
        }
    },

    /**
     * Get employee monthly attendance
     * @param {string} employeeId - Employee ID
     * @returns {Promise} API response with employee monthly attendance
     */
    getMonthlyAttendance: async (employeeId) => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.ATTENDANCE.MONTHLY(employeeId));
        } catch (error) {
            console.error(`Error fetching monthly attendance for employee ${employeeId}:`, error);
            throw error;
        }
    },

    /**
     * Get unassigned employees
     * @returns {Promise} API response with unassigned employees
     */
    getUnassigned: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.UNASSIGNED);
        } catch (error) {
            console.error('Error fetching unassigned employees:', error);
            throw error;
        }
    },

    /**
     * Get drivers
     * @returns {Promise} API response with drivers
     */
    getDrivers: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.DRIVERS);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            throw error;
        }
    },

    /**
     * Get warehouse workers
     * @returns {Promise} API response with warehouse workers
     */
    getWarehouseWorkers: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.WAREHOUSE_WORKERS);
        } catch (error) {
            console.error('Error fetching warehouse workers:', error);
            throw error;
        }
    },

    /**
     * Get warehouse managers
     * @returns {Promise} API response with warehouse managers
     */
    getWarehouseManagers: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.WAREHOUSE_MANAGERS);
        } catch (error) {
            console.error('Error fetching warehouse managers:', error);
            throw error;
        }
    },

    /**
     * Get technicians
     * @returns {Promise} API response with technicians
     */
    getTechnicians: async () => {
        try {
            return await apiClient.get(EMPLOYEE_ENDPOINTS.TECHNICIANS);
        } catch (error) {
            console.error('Error fetching technicians:', error);
            throw error;
        }
    }
};