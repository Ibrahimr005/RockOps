package com.example.backend.controllers.notification;

import com.example.backend.dto.notification.*;
import com.example.backend.models.notification.Notification;
import com.example.backend.models.user.User;
import com.example.backend.repositories.notification.NotificationRepository;
import com.example.backend.services.notification.NotificationService;
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
            // Get user from Spring Security context (from JWT)
            if (principal instanceof UsernamePasswordAuthenticationToken) {
                UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
                User user = (User) auth.getPrincipal();

                // Store session mapping
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

            System.out.println("🔍 DEBUG: Marking notification as read");
            System.out.println("🔍 DEBUG: NotificationId: " + request.getNotificationId());
            System.out.println("🔍 DEBUG: UserId: " + user.getId());

            // Find the notification
            Optional<Notification> notificationOpt = notificationRepository.findByIdAndUserOrBroadcast(request.getNotificationId(), user);

            if (!notificationOpt.isPresent()) {
                System.out.println("❌ DEBUG: Notification not found");
                WebSocketResponse response = new WebSocketResponse("ERROR", "Notification not found or access denied");
                messagingTemplate.convertAndSendToUser(user.getUsername(), "/queue/responses", response);
                return;
            }

            Notification notification = notificationOpt.get();
            boolean newReadStatus;

            if (notification.getUser() != null) {
                // User-specific notification (GREEN notifications)
                System.out.println("🔍 DEBUG: User-specific notification");
                newReadStatus = !notification.isRead();
                notification.setRead(newReadStatus);
                System.out.println("🔍 DEBUG: Set read status to: " + newReadStatus);
            } else {
                // Broadcast notification (BLUE notifications)
                System.out.println("🔍 DEBUG: Broadcast notification");
                System.out.println("🔍 DEBUG: Current readByUsers: " + notification.getReadByUsers());

                if (notification.isReadByUser(user.getId())) {
                    System.out.println("🔍 DEBUG: User has read this, marking as unread");
                    notification.markAsUnreadByUser(user.getId());
                    newReadStatus = false;
                } else {
                    System.out.println("🔍 DEBUG: User hasn't read this, marking as read");
                    notification.markAsReadByUser(user.getId());
                    newReadStatus = true;
                }
                System.out.println("🔍 DEBUG: New readByUsers: " + notification.getReadByUsers());
            }

            // Save the notification
            notificationRepository.save(notification);
            System.out.println("🔍 DEBUG: Notification saved");

            // Send success response
            WebSocketResponse response = new WebSocketResponse("SUCCESS",
                    newReadStatus ? "Notification marked as read" : "Notification marked as unread");
            messagingTemplate.convertAndSendToUser(user.getUsername(), "/queue/responses", response);

            // Send updated unread count
            sendUnreadCount(user);
            System.out.println("✅ DEBUG: Success response sent");

        } catch (Exception e) {
            System.err.println("❌ DEBUG: Exception in markAsRead: " + e.getMessage());
            e.printStackTrace();

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
            System.err.println("Error sending unread notifications: " + e.getMessage());
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

            System.out.println("📊 DEBUG: Sent unread count " + unreadCount + " to user " + user.getUsername());

        } catch (Exception e) {
            System.err.println("Error sending unread count: " + e.getMessage());
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
            System.out.println("🔍 DEBUG: Attempting to send notification to user: " + user.getUsername() + " (ID: " + user.getId() + ")");
            System.out.println("🔍 DEBUG: User connected? " + isUserConnected(user.getId()));
            System.out.println("🔍 DEBUG: Active sessions: " + activeSessions.keySet());
            System.out.println("🔍 DEBUG: Notification: " + notification.getTitle());

            // Try sending by USERNAME instead of UUID
            System.out.println("🔍 DEBUG: Sending to destination: /user/" + user.getUsername() + "/queue/notifications");

            // Send to user-specific queue using USERNAME
            messagingTemplate.convertAndSendToUser(user.getUsername(),
                    "/queue/notifications", notification);

            System.out.println("✅ DEBUG: Notification sent successfully via WebSocket");

        } catch (Exception e) {
            System.err.println("❌ Error sending notification to user: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Public method to broadcast notification to all connected users
     */
    public void broadcastNotification(NotificationMessage notification) {
        try {
            System.out.println("📢 DEBUG: Broadcasting notification: " + notification.getTitle());
            messagingTemplate.convertAndSend("/topic/notifications", notification);
            System.out.println("✅ DEBUG: Broadcast notification sent successfully");
        } catch (Exception e) {
            System.err.println("❌ Error broadcasting notification: " + e.getMessage());
            e.printStackTrace();
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
        System.out.println("✅ Registered user session: " + userId + " -> " + sessionId);
        System.out.println("🔍 Active sessions now: " + activeSessions.size());
    }

    /**
     * Send unread notifications to a newly connected user (called by WebSocketConfig)
     */
    public void sendUnreadNotificationsToUser(User user) {
        try {
            System.out.println("📬 Sending unread notifications to newly connected user: " + user.getUsername());
            sendUnreadNotifications(user);
        } catch (Exception e) {
            System.err.println("❌ Error sending unread notifications to user: " + e.getMessage());
            e.printStackTrace();
        }
    }
}