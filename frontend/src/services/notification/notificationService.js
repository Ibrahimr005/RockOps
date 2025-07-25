import apiClient from '../../utils/apiClient';
import { NOTIFICATION_ENDPOINTS } from '../../config/api.config';

export const notificationService = {
    // Get all notifications for the current user
    getAll: async () => {
        const response = await apiClient.get(NOTIFICATION_ENDPOINTS.BASE);
        return response.data || response;
    },

    // Get unread notifications for the current user
    getUnread: async () => {
        const response = await apiClient.get(NOTIFICATION_ENDPOINTS.UNREAD);
        return response.data || response;
    },

    // Get unread notification count
    getUnreadCount: async () => {
        const response = await apiClient.get(NOTIFICATION_ENDPOINTS.UNREAD_COUNT);
        return response.data || response;
    },

    // Mark a specific notification as read
    markAsRead: async (notificationId) => {
        const response = await apiClient.put(NOTIFICATION_ENDPOINTS.MARK_AS_READ(notificationId));
        return response.data || response;
    },

    // Mark all notifications as read
    markAllAsRead: async () => {
        const response = await apiClient.put(NOTIFICATION_ENDPOINTS.READ_ALL);
        return response.data || response;
    },

    // Delete a specific notification
    delete: async (notificationId) => {
        const response = await apiClient.delete(NOTIFICATION_ENDPOINTS.DELETE(notificationId));
        return response.data || response;
    },

    // Send notification to specific user (Admin only)
    sendToUser: async (notificationData) => {
        const response = await apiClient.post(NOTIFICATION_ENDPOINTS.SEND, notificationData);
        return response.data || response;
    },

    // Broadcast notification to all users (Admin only)
    broadcast: async (notificationData) => {
        const response = await apiClient.post(NOTIFICATION_ENDPOINTS.BROADCAST, notificationData);
        return response.data || response;
    }
};