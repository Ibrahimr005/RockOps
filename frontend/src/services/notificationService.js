import apiClient from '../utils/apiClient.js';
import { API_BASE_URL, NOTIFICATION_ENDPOINTS } from '../config/api.config.js';

export const notificationService = {
    /**
     * Get all notifications
     * @returns {Promise} API response with notifications
     */
    getAll: async () => {
        try {
            return await apiClient.get(NOTIFICATION_ENDPOINTS.BASE);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    },

    /**
     * Get unread notifications count
     * @returns {Promise} API response with unread count
     */
    getUnreadCount: async () => {
        try {
            return await apiClient.get(NOTIFICATION_ENDPOINTS.UNREAD_COUNT);
        } catch (error) {
            console.error('Error fetching unread count:', error);
            throw error;
        }
    },

    /**
     * Get notification by ID
     * @param {string} id - Notification ID
     * @returns {Promise} API response with notification
     */
    getById: async (id) => {
        try {
            return await apiClient.get(NOTIFICATION_ENDPOINTS.BY_ID(id));
        } catch (error) {
            console.error(`Error fetching notification ${id}:`, error);
            throw error;
        }
    },

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     * @returns {Promise} API response
     */
    markAsRead: async (id) => {
        try {
            return await apiClient.put(NOTIFICATION_ENDPOINTS.MARK_READ(id));
        } catch (error) {
            console.error(`Error marking notification ${id} as read:`, error);
            throw error;
        }
    },

    /**
     * Mark all notifications as read
     * @returns {Promise} API response
     */
    markAllAsRead: async () => {
        try {
            return await apiClient.put('/api/notifications/read-all');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    },

    /**
     * Mark notification as unread
     * @param {string} id - Notification ID
     * @returns {Promise} API response
     */
    markAsUnread: async (id) => {
        try {
            return await apiClient.put(NOTIFICATION_ENDPOINTS.MARK_UNREAD(id));
        } catch (error) {
            console.error(`Error marking notification ${id} as unread:`, error);
            throw error;
        }
    },

    /**
     * Delete notification
     * @param {string} id - Notification ID
     * @returns {Promise} API response
     */
    delete: async (id) => {
        try {
            return await apiClient.delete(`/api/notifications/${id}`);
        } catch (error) {
            console.error(`Error deleting notification ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get WebSocket URL for real-time notifications
     * @returns {string} WebSocket URL
     */
    getWebSocketUrl: () => {
        return 'ws://localhost:8080/ws';
    }
};