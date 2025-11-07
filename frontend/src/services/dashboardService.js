// src/services/dashboardService.js
import { DASHBOARD_ENDPOINTS } from '../config/api.config';
import apiClient from '../utils/apiClient';

/**
 * Dashboard Service
 * Handles fetching role-specific dashboard data from the backend
 */
class DashboardService {
    /**
     * Get dashboard data for the current user based on their role
     * @returns {Promise} Dashboard data specific to user's role
     */
    static async getDashboardData() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.BASE);
        return response.data;
    }

    /**
     * Get admin dashboard data
     * @returns {Promise} Admin-specific dashboard data
     */
    static async getAdminDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.ADMIN);
        return response.data;
    }

    /**
     * Get site admin dashboard data
     * @returns {Promise} Site admin dashboard data
     */
    static async getSiteAdminDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.SITE_ADMIN);
        return response.data;
    }

    /**
     * Get equipment manager dashboard data
     * @returns {Promise} Equipment manager dashboard data
     */
    static async getEquipmentManagerDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.EQUIPMENT_MANAGER);
        return response.data;
    }

    /**
     * Get warehouse manager dashboard data
     * @returns {Promise} Warehouse manager dashboard data
     */
    static async getWarehouseManagerDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.WAREHOUSE_MANAGER);
        return response.data;
    }

    /**
     * Get HR manager dashboard data
     * @returns {Promise} HR manager dashboard data
     */
    static async getHRManagerDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.HR_MANAGER);
        return response.data;
    }

    /**
     * Get HR employee dashboard data
     * @returns {Promise} HR employee dashboard data
     */
    static async getHREmployeeDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.HR_EMPLOYEE);
        return response.data;
    }

    /**
     * Get finance manager dashboard data
     * @returns {Promise} Finance manager dashboard data
     */
    static async getFinanceManagerDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.FINANCE_MANAGER);
        return response.data;
    }

    /**
     * Get finance employee dashboard data
     * @returns {Promise} Finance employee dashboard data
     */
    static async getFinanceEmployeeDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.FINANCE_EMPLOYEE);
        return response.data;
    }

    /**
     * Get maintenance manager dashboard data
     * @returns {Promise} Maintenance manager dashboard data
     */
    static async getMaintenanceManagerDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.MAINTENANCE_MANAGER);
        return response.data;
    }

    /**
     * Get maintenance employee dashboard data
     * @returns {Promise} Maintenance employee dashboard data
     */
    static async getMaintenanceEmployeeDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.MAINTENANCE_EMPLOYEE);
        return response.data;
    }

    /**
     * Get procurement dashboard data
     * @returns {Promise} Procurement dashboard data
     */
    static async getProcurementDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.PROCUREMENT);
        return response.data;
    }

    /**
     * Get secretary dashboard data
     * @returns {Promise} Secretary dashboard data
     */
    static async getSecretaryDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.SECRETARY);
        return response.data;
    }

    /**
     * Get user dashboard data
     * @returns {Promise} User dashboard data
     */
    static async getUserDashboard() {
        const response = await apiClient.get(DASHBOARD_ENDPOINTS.USER);
        return response.data;
    }

    /**
     * Get dashboard data based on specific role
     * @param {string} role - User role
     * @returns {Promise} Role-specific dashboard data
     */
    static async getDashboardByRole(role) {
        switch (role) {
            case 'ADMIN':
                return this.getAdminDashboard();
            case 'SITE_ADMIN':
                return this.getSiteAdminDashboard();
            case 'EQUIPMENT_MANAGER':
                return this.getEquipmentManagerDashboard();
            case 'WAREHOUSE_MANAGER':
                return this.getWarehouseManagerDashboard();
            case 'HR_MANAGER':
                return this.getHRManagerDashboard();
            case 'HR_EMPLOYEE':
                return this.getHREmployeeDashboard();
            case 'FINANCE_MANAGER':
                return this.getFinanceManagerDashboard();
            case 'FINANCE_EMPLOYEE':
                return this.getFinanceEmployeeDashboard();
            case 'MAINTENANCE_MANAGER':
                return this.getMaintenanceManagerDashboard();
            case 'MAINTENANCE_EMPLOYEE':
                return this.getMaintenanceEmployeeDashboard();
            case 'PROCUREMENT':
                return this.getProcurementDashboard();
            case 'SECRETARY':
                return this.getSecretaryDashboard();
            case 'USER':
            default:
                return this.getUserDashboard();
        }
    }
}

export default DashboardService;

