import apiClient from '../../utils/apiClient';
import { WAREHOUSE_EMPLOYEE_ENDPOINTS } from '../../config/api.config';

export const warehouseEmployeeService = {
    // Get all warehouse employees
    getWarehouseEmployees: async () => {
        const response = await apiClient.get(WAREHOUSE_EMPLOYEE_ENDPOINTS.WAREHOUSE_EMPLOYEES);
        return response.data || response;
    },

    // Assign employee to warehouse
    assignToWarehouse: async (employeeId, warehouseData) => {
        const response = await apiClient.post(WAREHOUSE_EMPLOYEE_ENDPOINTS.ASSIGN_WAREHOUSE(employeeId), warehouseData);
        return response.data || response;
    },

    // Unassign employee from warehouse
    unassignFromWarehouse: async (employeeId, warehouseData) => {
        const response = await apiClient.delete(WAREHOUSE_EMPLOYEE_ENDPOINTS.UNASSIGN_WAREHOUSE(employeeId), warehouseData);
        return response.data || response;
    },

    // Get employee assignments by username
    getAssignmentsByUsername: async (username) => {
        const response = await apiClient.get(WAREHOUSE_EMPLOYEE_ENDPOINTS.BY_USERNAME_ASSIGNMENTS(username));
        return response.data || response;
    },

    // Get assigned users for a warehouse
    getWarehouseAssignedUsers: async (warehouseId) => {
        const response = await apiClient.get(WAREHOUSE_EMPLOYEE_ENDPOINTS.WAREHOUSE_ASSIGNED_USERS(warehouseId));
        return response.data || response;
    },

    // Get warehouses for employee
    getWarehousesForEmployee: async (employeeId) => {
        const response = await apiClient.get(WAREHOUSE_EMPLOYEE_ENDPOINTS.EMPLOYEE_WAREHOUSES(employeeId));
        return response.data || response;
    },

    // Get assignment details
    getAssignmentDetails: async (employeeId, warehouseId) => {
        const response = await apiClient.get(WAREHOUSE_EMPLOYEE_ENDPOINTS.ASSIGNMENT_DETAILS(employeeId, warehouseId));
        return response.data || response;
    },

    // Get all assignments for employee
    getEmployeeAssignments: async (employeeId) => {
        const response = await apiClient.get(WAREHOUSE_EMPLOYEE_ENDPOINTS.EMPLOYEE_ASSIGNMENTS(employeeId));
        return response.data || response;
    },

    // Check warehouse access
    checkWarehouseAccess: async (employeeId, warehouseId) => {
        const response = await apiClient.get(WAREHOUSE_EMPLOYEE_ENDPOINTS.CHECK_WAREHOUSE_ACCESS(employeeId, warehouseId));
        return response.data || response;
    }
};