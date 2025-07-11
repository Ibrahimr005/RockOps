package com.example.backend.services.notification;

import com.example.backend.controllers.notification.WebSocketController;
import com.example.backend.dto.notification.NotificationMessage;
import com.example.backend.models.notification.Notification;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.User;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.notification.NotificationRepository;
import com.example.backend.repositories.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private WebSocketController webSocketController;

    @Autowired
    private UserRepository userRepository;

    // ================= HELPER METHOD FOR AUTHENTICATION =================

    /**
     * Get the current authenticated user
     */
    private User getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof User) {
                return (User) authentication.getPrincipal();
            }
            return null;
        } catch (Exception e) {
            System.err.println("❌ Error getting current user: " + e.getMessage());
            return null;
        }
    }

    /**
     * Create message with current user info automatically
     */
    private String createMessageWithUser(String baseMessage, String action) {
        User currentUser = getCurrentUser();
        if (currentUser != null) {
            return String.format("%s by %s %s.", baseMessage,
                    currentUser.getFirstName(), currentUser.getLastName());
        }
        return baseMessage + ".";
    }

    // ================= ENHANCED GROUP NOTIFICATION METHODS =================

    /**
     * Send notification to warehouse users with action URL and related entity (AUTO USER)
     */
    public List<Notification> sendNotificationToWarehouseUsers(String title, String message,
                                                               NotificationType type, String actionUrl, String relatedEntity) {
        System.out.println("🔍 DEBUG: Finding warehouse users...");
        List<User> warehouseUsers = userRepository.findWarehouseUsers();
        System.out.println("🔍 DEBUG: Found " + warehouseUsers.size() + " warehouse users: " +
                warehouseUsers.stream().map(User::getUsername).collect(Collectors.toList()));

        // Auto-append current user info if message doesn't already contain user info
        String finalMessage = message;
        if (!message.contains(" by ") && getCurrentUser() != null) {
            User currentUser = getCurrentUser();
            finalMessage = String.format("%s by %s %s.", message.replaceAll("\\.$", ""),
                    currentUser.getFirstName(), currentUser.getLastName());
        }

        List<Notification> notifications = sendNotificationToUsers(warehouseUsers, title, finalMessage, type, actionUrl, relatedEntity);

        logNotificationSent("warehouse users", relatedEntity, actionUrl);
        return notifications;
    }

    /**
     * Send notification to equipment users with action URL and related entity (AUTO USER)
     */
    public List<Notification> sendNotificationToEquipmentUsers(String title, String message,
                                                               NotificationType type, String actionUrl, String relatedEntity) {
        List<User> equipmentUsers = userRepository.findEquipmentUsers();

        String finalMessage = message;
        if (!message.contains(" by ") && getCurrentUser() != null) {
            User currentUser = getCurrentUser();
            finalMessage = String.format("%s by %s %s.", message.replaceAll("\\.$", ""),
                    currentUser.getFirstName(), currentUser.getLastName());
        }

        List<Notification> notifications = sendNotificationToUsers(equipmentUsers, title, finalMessage, type, actionUrl, relatedEntity);

        logNotificationSent("equipment users", relatedEntity, actionUrl);
        return notifications;
    }

    /**
     * Send notification to finance users with action URL and related entity (AUTO USER)
     */
    public List<Notification> sendNotificationToFinanceUsers(String title, String message,
                                                             NotificationType type, String actionUrl, String relatedEntity) {
        List<User> financeUsers = userRepository.findFinanceUsers();

        String finalMessage = message;
        if (!message.contains(" by ") && getCurrentUser() != null) {
            User currentUser = getCurrentUser();
            finalMessage = String.format("%s by %s %s.", message.replaceAll("\\.$", ""),
                    currentUser.getFirstName(), currentUser.getLastName());
        }

        List<Notification> notifications = sendNotificationToUsers(financeUsers, title, finalMessage, type, actionUrl, relatedEntity);

        logNotificationSent("finance users", relatedEntity, actionUrl);
        return notifications;
    }

    /**
     * Send notification to HR users with action URL and related entity (AUTO USER)
     */
    public List<Notification> sendNotificationToHRUsers(String title, String message,
                                                        NotificationType type, String actionUrl, String relatedEntity) {
        List<User> hrUsers = userRepository.findHRUsers();

        String finalMessage = message;
        if (!message.contains(" by ") && getCurrentUser() != null) {
            User currentUser = getCurrentUser();
            finalMessage = String.format("%s by %s %s.", message.replaceAll("\\.$", ""),
                    currentUser.getFirstName(), currentUser.getLastName());
        }

        List<Notification> notifications = sendNotificationToUsers(hrUsers, title, finalMessage, type, actionUrl, relatedEntity);

        logNotificationSent("HR users", relatedEntity, actionUrl);
        return notifications;
    }

    /**
     * Send notification to procurement users with action URL and related entity (AUTO USER)
     */
    public List<Notification> sendNotificationToProcurementUsers(String title, String message,
                                                                 NotificationType type, String actionUrl, String relatedEntity) {
        List<User> procurementUsers = userRepository.findProcurementUsers();

        String finalMessage = message;
        if (!message.contains(" by ") && getCurrentUser() != null) {
            User currentUser = getCurrentUser();
            finalMessage = String.format("%s by %s %s.", message.replaceAll("\\.$", ""),
                    currentUser.getFirstName(), currentUser.getLastName());
        }

        List<Notification> notifications = sendNotificationToUsers(procurementUsers, title, finalMessage, type, actionUrl, relatedEntity);

        logNotificationSent("procurement users", relatedEntity, actionUrl);
        return notifications;
    }

    /**
     * Helper method to log notification details
     */
    private void logNotificationSent(String userGroup, String relatedEntity, String actionUrl) {
        System.out.println("✅ Notification sent to " + userGroup + "!");
        System.out.println("   - Related entity: " + relatedEntity);
        System.out.println("   - Action URL: " + actionUrl);

        User currentUser = getCurrentUser();
        if (currentUser != null) {
            System.out.println("   - Sent by: " + currentUser.getFirstName() + " " + currentUser.getLastName());
        }
    }

    // ================= EXISTING METHODS (KEEP ALL YOUR ORIGINAL METHODS) =================

    /**
     * Send notification to warehouse users (WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, ADMIN)
     */
    public List<Notification> sendNotificationToWarehouseUsers(String title, String message, NotificationType type) {
        List<User> warehouseUsers = userRepository.findWarehouseUsers();
        return sendNotificationToUsers(warehouseUsers, title, message, type);
    }

    /**
     * Send notification to warehouse users with action URL
     */
    public List<Notification> sendNotificationToWarehouseUsers(String title, String message, NotificationType type, String actionUrl) {
        List<User> warehouseUsers = userRepository.findWarehouseUsers();
        return sendNotificationToUsers(warehouseUsers, title, message, type, actionUrl);
    }

    /**
     * Send notification to equipment users (EQUIPMENT_MANAGER, ADMIN) with related entity
     */
    public List<Notification> sendNotificationToEquipmentUsers(String title, String message, NotificationType type, String relatedEntity) {
        List<User> equipmentUsers = userRepository.findEquipmentUsers();
        return sendNotificationToUsers(equipmentUsers, title, message, type, null, relatedEntity);
    }

    /**
     * Send notification to finance users (FINANCE_MANAGER, FINANCE_EMPLOYEE, ADMIN) with related entity
     */
    public List<Notification> sendNotificationToFinanceUsers(String title, String message, NotificationType type, String relatedEntity) {
        List<User> financeUsers = userRepository.findFinanceUsers();
        return sendNotificationToUsers(financeUsers, title, message, type, null, relatedEntity);
    }

    /**
     * Send notification to HR users (HR_MANAGER, HR_EMPLOYEE, ADMIN) with related entity
     */
    public List<Notification> sendNotificationToHRUsers(String title, String message, NotificationType type, String relatedEntity) {
        List<User> hrUsers = userRepository.findHRUsers();
        return sendNotificationToUsers(hrUsers, title, message, type, null, relatedEntity);
    }

    /**
     * Send notification to procurement users (PROCUREMENT, ADMIN) with related entity
     */
    public List<Notification> sendNotificationToProcurementUsers(String title, String message, NotificationType type, String relatedEntity) {
        List<User> procurementUsers = userRepository.findProcurementUsers();
        return sendNotificationToUsers(procurementUsers, title, message, type, null, relatedEntity);
    }

    /**
     * Send notification to users with specific roles
     */
    public List<Notification> sendNotificationToUsersByRoles(List<Role> roles, String title, String message, NotificationType type) {
        List<User> users = getUsersByRoles(roles);
        return sendNotificationToUsers(users, title, message, type);
    }

    /**
     * Send notification to users with specific roles with action URL
     */
    public List<Notification> sendNotificationToUsersByRoles(List<Role> roles, String title, String message, NotificationType type, String actionUrl) {
        List<User> users = getUsersByRoles(roles);
        return sendNotificationToUsers(users, title, message, type, actionUrl);
    }

    /**
     * Send notification to users with specific roles with action URL and related entity
     */
    public List<Notification> sendNotificationToUsersByRoles(List<Role> roles, String title, String message, NotificationType type, String actionUrl, String relatedEntity) {
        List<User> users = getUsersByRoles(roles);
        return sendNotificationToUsers(users, title, message, type, actionUrl, relatedEntity);
    }

    /**
     * Send notification to a list of users
     */
    public List<Notification> sendNotificationToUsers(List<User> users, String title, String message, NotificationType type) {
        List<Notification> notifications = new ArrayList<>();

        for (User user : users) {
            Notification notification = sendNotificationToUser(user, title, message, type);
            notifications.add(notification);

        }

        System.out.println("✅ Sent notifications to " + users.size() + " users");
        return notifications;
    }

    /**
     * Send notification to a list of users with action URL
     */
    public List<Notification> sendNotificationToUsers(List<User> users, String title, String message, NotificationType type, String actionUrl) {
        List<Notification> notifications = new ArrayList<>();

        for (User user : users) {
            Notification notification = sendNotificationToUser(user, title, message, type, actionUrl);
            notifications.add(notification);
        }

        System.out.println("✅ Sent notifications to " + users.size() + " users with action URL");
        return notifications;
    }

    /**
     * Send notification to a list of users with action URL and related entity
     */
    public List<Notification> sendNotificationToUsers(List<User> users, String title, String message, NotificationType type, String actionUrl, String relatedEntity) {
        List<Notification> notifications = new ArrayList<>();

        System.out.println("🔍 DEBUG: Starting to send notifications to " + users.size() + " users");
        System.out.println("🔍 DEBUG: Users found: " + users.stream().map(User::getUsername).collect(Collectors.toList()));

        for (User user : users) {
            System.out.println("🔍 DEBUG: Processing user: " + user.getUsername() + " (ID: " + user.getId() + ")");
            Notification notification = sendNotificationToUser(user, title, message, type, actionUrl, relatedEntity);
            notifications.add(notification);
        }

        System.out.println("✅ Sent notifications to " + users.size() + " users with action URL and related entity");
        return notifications;
    }

    /**
     * Get users by their roles
     */
    private List<User> getUsersByRoles(List<Role> roles) {
        return userRepository.findByRoleIn(roles);
    }

    // ================= INDIVIDUAL USER NOTIFICATION METHODS =================

    /**
     * Send notification to a specific user
     */
    public Notification sendNotificationToUser(User user, String title, String message, NotificationType type) {
        Notification notification = new Notification(title, message, type, user);
        notification = notificationRepository.save(notification);

        if (webSocketController.isUserConnected(user.getId())) {
            NotificationMessage dto = convertToDTO(notification);
            webSocketController.sendNotificationToUser(user, dto);
        }

        return notification;
    }

    /**
     * Send notification to a specific user with action URL
     */
    public Notification sendNotificationToUser(User user, String title, String message,
                                               NotificationType type, String actionUrl) {
        Notification notification = new Notification(title, message, type, user, actionUrl);
        notification = notificationRepository.save(notification);

        if (webSocketController.isUserConnected(user.getId())) {
            NotificationMessage dto = convertToDTO(notification);
            webSocketController.sendNotificationToUser(user, dto);
        }

        return notification;
    }

    /**
     * Send notification to a specific user with action URL and related entity
     */
    public Notification sendNotificationToUser(User user, String title, String message,
                                               NotificationType type, String actionUrl, String relatedEntity) {
        System.out.println("🔍 DEBUG: Creating notification for user: " + user.getId());
        System.out.println("🔍 DEBUG: Title: " + title);
        System.out.println("🔍 DEBUG: Message: " + message);
        System.out.println("🔍 DEBUG: Related Entity: " + relatedEntity);

        Notification notification = new Notification(title, message, type, user, actionUrl, relatedEntity);

        System.out.println("🔍 DEBUG: Before saving notification");
        notification = notificationRepository.save(notification);
        System.out.println("🔍 DEBUG: After saving notification. ID: " + notification.getId());

        if (webSocketController.isUserConnected(user.getId())) {
            NotificationMessage dto = convertToDTO(notification);
            webSocketController.sendNotificationToUser(user, dto);
            System.out.println("🔍 DEBUG: WebSocket notification sent");
        } else {
            System.out.println("🔍 DEBUG: User not connected via WebSocket");
        }

        return notification;
    }

    /**
     * Send notification to specific user by user ID
     */
    public Notification sendNotificationToUser(UUID userId, String title, String message, NotificationType type) {
        User user = new User();
        user.setId(userId);

        Notification notification = new Notification(title, message, type, user);
        notification = notificationRepository.save(notification);

        if (webSocketController.isUserConnected(userId)) {
            NotificationMessage dto = convertToDTO(notification);
            webSocketController.sendNotificationToUser(user, dto);
        }

        return notification;
    }

    // ================= BROADCAST NOTIFICATION METHODS =================

    /**
     * Broadcast notification to all users
     */
    public Notification broadcastNotification(String title, String message, NotificationType type) {
        Notification notification = new Notification(title, message, type);
        notification = notificationRepository.save(notification);

        NotificationMessage dto = convertToDTO(notification);
        webSocketController.broadcastNotification(dto);

        return notification;
    }

    /**
     * Broadcast notification with action URL
     */
    public Notification broadcastNotification(String title, String message, NotificationType type, String actionUrl) {
        Notification notification = new Notification(title, message, type);
        notification.setActionUrl(actionUrl);
        notification = notificationRepository.save(notification);

        NotificationMessage dto = convertToDTO(notification);
        webSocketController.broadcastNotification(dto);

        return notification;
    }

    /**
     * Broadcast notification with action URL and related entity
     */
    public Notification broadcastNotification(String title, String message, NotificationType type,
                                              String actionUrl, String relatedEntity) {
        System.out.println("🔍 DEBUG: Creating broadcast notification");
        System.out.println("🔍 DEBUG: Title: " + title);
        System.out.println("🔍 DEBUG: Message: " + message);
        System.out.println("🔍 DEBUG: Related Entity: " + relatedEntity);

        Notification notification = new Notification(title, message, type);
        notification.setActionUrl(actionUrl);
        notification.setRelatedEntity(relatedEntity);

        System.out.println("🔍 DEBUG: Before saving broadcast notification");
        notification = notificationRepository.save(notification);
        System.out.println("🔍 DEBUG: After saving broadcast notification. ID: " + notification.getId());

        NotificationMessage dto = convertToDTO(notification);
        webSocketController.broadcastNotification(dto);
        System.out.println("🔍 DEBUG: Broadcast WebSocket notification sent");

        return notification;
    }

    // ================= NOTIFICATION RETRIEVAL METHODS =================

    /**
     * Get all notifications for a user (including broadcasts)
     */
    public List<NotificationMessage> getNotificationsForUser(User user) {
        System.out.println("🔍 DEBUG: Getting notifications for user: " + user.getId());

        // Get user-specific notifications
        List<Notification> userNotifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        System.out.println("🔍 DEBUG: Found " + userNotifications.size() + " user-specific notifications");

        // Get broadcast notifications (user = null) that are not hidden by this user
        List<Notification> broadcastNotifications = notificationRepository.findByUserIsNullOrderByCreatedAtDesc();
        List<Notification> visibleBroadcastNotifications = broadcastNotifications.stream()
                .filter(notification -> !notification.isHiddenByUser(user.getId()))
                .collect(Collectors.toList());

        System.out.println("🔍 DEBUG: Found " + broadcastNotifications.size() + " broadcast notifications");
        System.out.println("🔍 DEBUG: " + visibleBroadcastNotifications.size() + " visible to user " + user.getId());

        // Combine both lists
        List<Notification> allNotifications = new ArrayList<>();
        allNotifications.addAll(userNotifications);
        allNotifications.addAll(visibleBroadcastNotifications);

        // Sort by timestamp descending
        allNotifications.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

        System.out.println("🔍 DEBUG: Total visible notifications to return: " + allNotifications.size());

        return allNotifications.stream()
                .map(notification -> convertToDTO(notification, user))
                .collect(Collectors.toList());
    }

    /**
     * Get unread notifications for a user
     */
    public List<NotificationMessage> getUnreadNotificationsForUser(User user) {
        List<Notification> notifications = notificationRepository.findByUserAndReadFalseOrderByCreatedAtDesc(user);
        return notifications.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get unread notification count for a user (including broadcasts)
     */
    public long getUnreadCountForUser(User user) {
        // Count user-specific unread notifications
        long userUnread = notificationRepository.countByUserAndReadFalse(user);

        // Count broadcast notifications that are NOT read by this user
        List<Notification> broadcastNotifications = notificationRepository.findByUserIsNullOrderByCreatedAtDesc();
        long unreadBroadcastCount = broadcastNotifications.stream()
                .filter(notification -> !notification.isReadByUser(user.getId()) && !notification.isHiddenByUser(user.getId()))
                .count();

        System.out.println("🔍 DEBUG: User unread: " + userUnread + ", Unread broadcast count: " + unreadBroadcastCount);
        return userUnread + unreadBroadcastCount;
    }

    /**
     * Get broadcast notifications (notifications for all users)
     */
    public List<NotificationMessage> getBroadcastNotifications() {
        List<Notification> notifications = notificationRepository.findByUserIsNullOrderByCreatedAtDesc();
        return notifications.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // ================= NOTIFICATION MANAGEMENT METHODS =================

    /**
     * Mark notification as read
     */
    public boolean markAsRead(UUID notificationId, User user) {
        int updated = notificationRepository.markAsRead(notificationId, user);
        return updated > 0;
    }

    /**
     * Mark all notifications as read for a user
     */
    public int markAllAsReadForUser(User user) {
        return notificationRepository.markAllAsReadForUser(user);
    }

    /**
     * Get notification by ID (with user validation)
     */
    public Optional<Notification> getNotificationById(UUID notificationId, User user) {
        Optional<Notification> notification = notificationRepository.findById(notificationId);

        if (notification.isPresent()) {
            Notification n = notification.get();
            if (n.getUser() == null || n.getUser().getId().equals(user.getId())) {
                return notification;
            }
        }

        return Optional.empty();
    }

    /**
     * Delete notification (or hide if broadcast)
     */
    public boolean deleteNotification(UUID notificationId, User user) {
        try {
            Optional<Notification> notificationOpt = getNotificationById(notificationId, user);
            if (notificationOpt.isPresent()) {
                Notification notification = notificationOpt.get();

                if (notification.getUser() != null) {
                    // User-specific notification (GREEN) - actually delete it
                    notificationRepository.deleteById(notificationId);
                    System.out.println("🗑️ DEBUG: Deleted user-specific notification " + notificationId);
                } else {
                    // Broadcast notification (BLUE) - just hide it for this user
                    notification.hideForUser(user.getId());
                    notificationRepository.save(notification);
                    System.out.println("🙈 DEBUG: Hidden broadcast notification " + notificationId + " for user: " + user.getId());
                    System.out.println("🔍 DEBUG: Hidden by users: " + notification.getHiddenByUsers());
                }
                return true;
            }
            return false;
        } catch (Exception e) {
            System.err.println("Error deleting/hiding notification: " + e.getMessage());
            return false;
        }
    }

    // ================= CONVENIENCE METHODS FOR COMMON NOTIFICATIONS =================

    /**
     * Send SUCCESS notification
     */
    public Notification sendSuccessNotification(User user, String title, String message) {
        return sendNotificationToUser(user, title, message, NotificationType.SUCCESS);
    }

    /**
     * Send SUCCESS notification with related entity
     */
    public Notification sendSuccessNotification(User user, String title, String message, String relatedEntity) {
        return sendNotificationToUser(user, title, message, NotificationType.SUCCESS, null, relatedEntity);
    }

    /**
     * Send ERROR notification
     */
    public Notification sendErrorNotification(User user, String title, String message) {
        return sendNotificationToUser(user, title, message, NotificationType.ERROR);
    }

    /**
     * Send ERROR notification with related entity
     */
    public Notification sendErrorNotification(User user, String title, String message, String relatedEntity) {
        return sendNotificationToUser(user, title, message, NotificationType.ERROR, null, relatedEntity);
    }

    /**
     * Send WARNING notification
     */
    public Notification sendWarningNotification(User user, String title, String message) {
        return sendNotificationToUser(user, title, message, NotificationType.WARNING);
    }

    /**
     * Send WARNING notification with related entity
     */
    public Notification sendWarningNotification(User user, String title, String message, String relatedEntity) {
        return sendNotificationToUser(user, title, message, NotificationType.WARNING, null, relatedEntity);
    }

    /**
     * Send INFO notification
     */
    public Notification sendInfoNotification(User user, String title, String message) {
        return sendNotificationToUser(user, title, message, NotificationType.INFO);
    }

    /**
     * Send INFO notification with related entity
     */
    public Notification sendInfoNotification(User user, String title, String message, String relatedEntity) {
        return sendNotificationToUser(user, title, message, NotificationType.INFO, null, relatedEntity);
    }

    /**
     * Broadcast SUCCESS notification
     */
    public Notification broadcastSuccessNotification(String title, String message) {
        return broadcastNotification(title, message, NotificationType.SUCCESS);
    }

    /**
     * Broadcast SUCCESS notification with related entity
     */
    public Notification broadcastSuccessNotification(String title, String message, String relatedEntity) {
        return broadcastNotification(title, message, NotificationType.SUCCESS, null, relatedEntity);
    }

    /**
     * Broadcast ERROR notification
     */
    public Notification broadcastErrorNotification(String title, String message) {
        return broadcastNotification(title, message, NotificationType.ERROR);
    }

    /**
     * Broadcast WARNING notification
     */
    public Notification broadcastWarningNotification(String title, String message) {
        return broadcastNotification(title, message, NotificationType.WARNING);
    }

    /**
     * Broadcast INFO notification
     */
    public Notification broadcastInfoNotification(String title, String message) {
        return broadcastNotification(title, message, NotificationType.INFO);
    }

    // ================= PRIVATE HELPER METHODS =================

    /**
     * Convert Notification entity to NotificationMessage DTO WITH USER CONTEXT
     */
    private NotificationMessage convertToDTO(Notification notification, User currentUser) {
        NotificationMessage dto = new NotificationMessage();
        dto.setId(notification.getId());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setType(notification.getType());
        dto.setUserId(notification.getUser() != null ? notification.getUser().getId() : null);
        dto.setCreatedAt(notification.getCreatedAt());
        dto.setActionUrl(notification.getActionUrl());
        dto.setRelatedEntity(notification.getRelatedEntity());

        // Set read status based on notification type
        if (notification.getUser() != null) {
            // User-specific notification
            dto.setRead(notification.isRead());
            System.out.println("🔍 DEBUG: User-specific notification " + notification.getId() + " read status: " + notification.isRead());
        } else {
            // Broadcast notification - check if this specific user has read it
            boolean isReadByUser = notification.isReadByUser(currentUser.getId());
            dto.setRead(isReadByUser);
            System.out.println("🔍 DEBUG: Broadcast notification " + notification.getId() + " read by user " + currentUser.getId() + ": " + isReadByUser);
            System.out.println("🔍 DEBUG: ReadByUsers field: " + notification.getReadByUsers());
        }

        return dto;
    }

    /**
     * Convert Notification entity to NotificationMessage DTO
     */
    private NotificationMessage convertToDTO(Notification notification) {
        NotificationMessage dto = new NotificationMessage();
        dto.setId(notification.getId());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setType(notification.getType());
        dto.setUserId(notification.getUser() != null ? notification.getUser().getId() : null);
        dto.setCreatedAt(notification.getCreatedAt());
        dto.setActionUrl(notification.getActionUrl());
        dto.setRead(notification.isRead());
        dto.setRelatedEntity(notification.getRelatedEntity());
        return dto;
    }
}