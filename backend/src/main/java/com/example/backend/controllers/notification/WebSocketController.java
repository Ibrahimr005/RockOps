package com.example.backend.controllers.notification;

import com.example.backend.dto.notification.*;
import com.example.backend.models.notification.Notification;
import com.example.backend.models.user.User;
import com.example.backend.repositories.notification.NotificationRepository;
import com.example.backend.services.notification.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Controller
public class WebSocketController {

    private static final Logger log = LoggerFactory.getLogger(WebSocketController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private NotificationRepository notificationRepository;


    // Store active WebSocket sessions (userId -> sessionId)
    private final ConcurrentHashMap<UUID, String> activeSessions = new ConcurrentHashMap<>();

    /**
     * Handle client authentication when they connect to WebSocket
     * Client sends message to /app/authenticate
     */
    @MessageMapping("/authenticate")
    @SendToUser("/queue/auth-response")
    public WebSocketResponse authenticateUser(@Payload WebSocketAuthMessage authMessage,
                                              SimpMessageHeaderAccessor headerAccessor,
                                              Principal principal) {
        try {
            if (principal instanceof UsernamePasswordAuthenticationToken) {
                UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
                User user = (User) auth.getPrincipal();

                // Use the user ID from the authenticated user (not from message)
                String sessionId = headerAccessor.getSessionId();
                activeSessions.put(user.getId(), sessionId);

                // Store user info in WebSocket session
                headerAccessor.getSessionAttributes().put("userId", user.getId());
                headerAccessor.getSessionAttributes().put("username", user.getUsername());

                // Send unread notifications to newly connected user
                sendUnreadNotifications(user);

                return new WebSocketResponse("AUTH_SUCCESS",
                        "Authentication successful. Welcome " + user.getFirstName() + "!");
            }

            return new WebSocketResponse("AUTH_FAILED", "Invalid authentication");

        } catch (Exception e) {
            return new WebSocketResponse("AUTH_FAILED", "Authentication error: " + e.getMessage());
        }
    }
    /**
     * Handle marking notifications as read
     * Client sends message to /app/markAsRead
     */
    @MessageMapping("/markAsRead")
    @Transactional
    public void markNotificationAsRead(@Payload NotificationReadRequest request, Principal principal) {
        try {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            User user = (User) auth.getPrincipal();

            log.debug("Marking notification {} as read for user {}", request.getNotificationId(), user.getId());

            // Find the notification
            Optional<Notification> notificationOpt = notificationRepository.findByIdAndUserOrBroadcast(request.getNotificationId(), user);

            if (!notificationOpt.isPresent()) {
                log.debug("Notification not found or access denied");
                WebSocketResponse response = new WebSocketResponse("ERROR", "Notification not found or access denied");
                messagingTemplate.convertAndSendToUser(user.getUsername(), "/queue/responses", response);
                return;
            }

            Notification notification = notificationOpt.get();
            boolean newReadStatus;

            if (notification.getUser() != null) {
                // User-specific notification (GREEN notifications)
                newReadStatus = !notification.isRead();
                notification.setRead(newReadStatus);
            } else {
                // Broadcast notification (BLUE notifications)
                if (notification.isReadByUser(user.getId())) {
                    notification.markAsUnreadByUser(user.getId());
                    newReadStatus = false;
                } else {
                    notification.markAsReadByUser(user.getId());
                    newReadStatus = true;
                }
            }

            // Save the notification
            notificationRepository.save(notification);

            // Send success response
            WebSocketResponse response = new WebSocketResponse("SUCCESS",
                    newReadStatus ? "Notification marked as read" : "Notification marked as unread");
            messagingTemplate.convertAndSendToUser(user.getUsername(), "/queue/responses", response);

            // Send updated unread count
            sendUnreadCount(user);

        } catch (Exception e) {
            log.error("Exception in markAsRead", e);

            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            User user = (User) auth.getPrincipal();
            WebSocketResponse response = new WebSocketResponse("ERROR", "Failed to update notification: " + e.getMessage());
            messagingTemplate.convertAndSendToUser(user.getUsername(), "/queue/responses", response);
        }
    }

    /**
     * Handle marking ALL notifications as read for a user
     * Client sends message to /app/markAllAsRead
     */
    @MessageMapping("/markAllAsRead")
    @Transactional
    public void markAllNotificationsAsRead(Principal principal) {
        try {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            User user = (User) auth.getPrincipal();

            int updated = notificationRepository.markAllAsReadForUser(user);

            WebSocketResponse response = new WebSocketResponse("SUCCESS",
                    "All notifications marked as read. Updated: " + updated);
            messagingTemplate.convertAndSendToUser(user.getId().toString(),
                    "/queue/responses", response);

            // Send updated unread count (should be 0 now)
            sendUnreadCount(user);

        } catch (Exception e) {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            User user = (User) auth.getPrincipal();

            WebSocketResponse response = new WebSocketResponse("ERROR",
                    "Failed to mark all notifications as read: " + e.getMessage());
            messagingTemplate.convertAndSendToUser(user.getId().toString(),
                    "/queue/responses", response);
        }
    }

    /**
     * Handle client requesting their notification history
     * Client sends message to /app/getNotifications
     */
    @MessageMapping("/getNotifications")
    public void getNotificationHistory(Principal principal) {
        try {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            User user = (User) auth.getPrincipal();

            // Get all notifications for user (including read ones) - UPDATED METHOD NAME
            List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);

            // Convert to DTOs
            List<NotificationMessage> notificationDTOs = notifications.stream()
                    .map(notification -> convertToDTO(notification, user))  // <-- PASS USER HERE
                    .collect(Collectors.toList());

            // Send notification history to user
            messagingTemplate.convertAndSendToUser(user.getId().toString(),
                    "/queue/notifications", notificationDTOs);

        } catch (Exception e) {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            User user = (User) auth.getPrincipal();

            WebSocketResponse response = new WebSocketResponse("ERROR",
                    "Failed to fetch notifications: " + e.getMessage());
            messagingTemplate.convertAndSendToUser(user.getId().toString(),
                    "/queue/responses", response);
        }
    }

    /**
     * Send unread notifications to a newly connected user
     */
    private void sendUnreadNotifications(User user) {
        try {
            // Get unread notifications for user - UPDATED METHOD NAME
            List<Notification> unreadNotifications = notificationRepository
                    .findByUserAndReadFalseOrderByCreatedAtDesc(user);

            // Get broadcast notifications (if any) - UPDATED METHOD NAME
            List<Notification> broadcastNotifications = notificationRepository
                    .findByUserIsNullOrderByCreatedAtDesc();

            // Combine both lists
            unreadNotifications.addAll(broadcastNotifications);

            // Convert to DTOs and send
            List<NotificationMessage> notificationDTOs = unreadNotifications.stream()
                    .map(notification -> convertToDTO(notification, user))  // <-- PASS USER HERE
                    .collect(Collectors.toList());

            if (!notificationDTOs.isEmpty()) {
                messagingTemplate.convertAndSendToUser(user.getId().toString(),
                        "/queue/notifications", notificationDTOs);
            }

            // Send unread count
            sendUnreadCount(user);

        } catch (Exception e) {
            log.error("Error sending unread notifications: {}", e.getMessage());
        }
    }

    private void sendUnreadCount(User user) {
        try {
            // Calculate count directly using repository
            long userUnread = notificationRepository.countByUserAndReadFalse(user);

            List<Notification> broadcastNotifications = notificationRepository.findByUserIsNullOrderByCreatedAtDesc();
            long unreadBroadcastCount = broadcastNotifications.stream()
                    .filter(notification -> !notification.isReadByUser(user.getId()) && !notification.isHiddenByUser(user.getId()))
                    .count();

            long unreadCount = userUnread + unreadBroadcastCount;

            WebSocketResponse countResponse = new WebSocketResponse("UNREAD_COUNT",
                    "Unread count updated", unreadCount);

            // ✅ CHANGE THIS: Use USERNAME instead of user.getId().toString()
            messagingTemplate.convertAndSendToUser(user.getUsername(),
                    "/queue/unread-count", countResponse);

            log.debug("Sent unread count {} to user {}", unreadCount, user.getUsername());

        } catch (Exception e) {
            log.error("Error sending unread count: {}", e.getMessage());
        }
    }

    /**
     * Convert Notification entity to NotificationMessage DTO
     */
    /**
     * Convert Notification entity to NotificationMessage DTO
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
        } else {
            // Broadcast notification - check if this specific user has read it
            dto.setRead(notification.isReadByUser(currentUser.getId()));
        }

        return dto;
    }

    /**
     * Keep old method for backward compatibility
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
        dto.setRelatedEntity(notification.getRelatedEntity());
        dto.setRead(notification.isRead());
        return dto;
    }

    public void sendNotificationToUser(User user, NotificationMessage notification) {
        try {
            log.debug("Sending notification '{}' to user {} (connected: {})",
                    notification.getTitle(), user.getUsername(), isUserConnected(user.getId()));

            messagingTemplate.convertAndSendToUser(user.getUsername(),
                    "/queue/notifications", notification);

            log.debug("Notification sent successfully to {}", user.getUsername());

        } catch (Exception e) {
            log.error("Error sending notification to user {}", user.getUsername(), e);
        }
    }

    /**
     * Public method to broadcast notification to all connected users
     */
    public void broadcastNotification(NotificationMessage notification) {
        try {
            log.debug("Broadcasting notification: {}", notification.getTitle());
            messagingTemplate.convertAndSend("/topic/notifications", notification);
        } catch (Exception e) {
            log.error("Error broadcasting notification", e);
        }
    }

    /**
     * Remove user session when they disconnect
     */
    public void removeUserSession(UUID userId) {
        activeSessions.remove(userId);
    }

    /**
     * Check if user is currently connected
     */
    public boolean isUserConnected(UUID userId) {
        return activeSessions.containsKey(userId);
    }

    // Add these methods to your existing WebSocketController class:

    /**
     * Register user session when they connect (called by WebSocketConfig)
     */
    public void registerUserSession(UUID userId, String sessionId) {
        activeSessions.put(userId, sessionId);
        log.debug("Registered user session: {} -> {} (total: {})", userId, sessionId, activeSessions.size());
    }

    /**
     * Send unread notifications to a newly connected user (called by WebSocketConfig)
     */
    public void sendUnreadNotificationsToUser(User user) {
        try {
            log.debug("Sending unread notifications to newly connected user: {}", user.getUsername());
            sendUnreadNotifications(user);
        } catch (Exception e) {
            log.error("Error sending unread notifications to user {}", user.getUsername(), e);
        }
    }
}