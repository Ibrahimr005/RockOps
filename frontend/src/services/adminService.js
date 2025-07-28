// src/services/adminService.js
import apiClient from '../utils/apiClient';
import { ADMIN_ENDPOINTS } from '../config/api.config';

export const adminService = {
    // Get all users
    getUsers: () => {
        return apiClient.get(ADMIN_ENDPOINTS.USERS);
    },

    // Get user by ID
    getUserById: (userId) => {
        return apiClient.get(ADMIN_ENDPOINTS.USER_BY_ID(userId));
    },

    // Create new user
    createUser: (userData) => {
        return apiClient.post(ADMIN_ENDPOINTS.CREATE_USER, userData);
    },

    // Update user role
    updateUserRole: (userId, roleData) => {
        return apiClient.put(ADMIN_ENDPOINTS.UPDATE_USER_ROLE(userId), roleData);
    },

    // Delete user
    deleteUser: (userId) => {
        return apiClient.delete(ADMIN_ENDPOINTS.DELETE_USER(userId));
    }
}; 