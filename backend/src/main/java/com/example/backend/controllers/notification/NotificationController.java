package com.example.backend.controllers.notification;

import com.example.backend.dto.notification.NotificationMessage;
import com.example.backend.models.notification.Notification;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.User;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /**
     * Get all notifications for the authenticated user
     */
    @GetMapping
    public ResponseEntity<List<NotificationMessage>> getMyNotifications(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<NotificationMessage> notifications = notificationService.getNotificationsForUser(user);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Get unread notifications for the authenticated user
     */
    @GetMapping("/unread")
    public ResponseEntity<List<NotificationMessage>> getUnreadNotifications(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<NotificationMessage> notifications = notificationService.getUnreadNotificationsForUser(user);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Get unread notification count for the authenticated user
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        long count = notificationService.getUnreadCountForUser(user);
        return ResponseEntity.ok(Map.of(
                "unreadCount", count,
                "userId", user.getId()
        ));
    }

    /**
     * Mark a notification as read
     */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable UUID notificationId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        boolean success = notificationService.markAsRead(notificationId, user);

        if (success) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification marked as read"
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Notification not found or access denied"
            ));
        }
    }

    /**
     * Mark all notifications as read for the authenticated user
     */
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        int updated = notificationService.markAllAsReadForUser(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All notifications marked as read",
                "updatedCount", updated
        ));
    }

    // ================= ADMIN/TESTING ENDPOINTS =================

    /**
     * Send notification to specific user (Admin only)
     * POST /api/notifications/send
     */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendNotification(@RequestBody SendNotificationRequest request) {
        try {
            // For testing - you might want to add admin role check here
            User targetUser = new User();
            targetUser.setId(request.getUserId());

            Notification notification = notificationService.sendNotificationToUser(
                    targetUser,
                    request.getTitle(),
                    request.getMessage(),
                    request.getType(),
                    request.getActionUrl()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification sent successfully",
                    "notificationId", notification.getId()
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to send notification: " + e.getMessage()
            ));
        }
    }

    /**
     * Delete a specific notification
     * DELETE /api/notifications/{notificationId}
     */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Map<String, Object>> deleteNotification(
            @PathVariable UUID notificationId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        boolean success = notificationService.deleteNotification(notificationId, user);

        if (success) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification deleted successfully"
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Notification not found or access denied"
            ));
        }
    }

    /**
     * Broadcast notification to all users (Admin only)
     * POST /api/notifications/broadcast
     */
    @PostMapping("/broadcast")
    public ResponseEntity<Map<String, Object>> broadcastNotification(@RequestBody BroadcastNotificationRequest request) {
        try {
            Notification notification = notificationService.broadcastNotification(
                    request.getTitle(),
                    request.getMessage(),
                    request.getType(),
                    request.getActionUrl()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification broadcasted successfully",
                    "notificationId", notification.getId()
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to broadcast notification: " + e.getMessage()
            ));
        }
    }

    // ================= REQUEST DTOs =================

    public static class SendNotificationRequest {
        private UUID userId;
        private String title;
        private String message;
        private NotificationType type;
        private String actionUrl;

        // Getters and setters
        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public NotificationType getType() { return type; }
        public void setType(NotificationType type) { this.type = type; }

        public String getActionUrl() { return actionUrl; }
        public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }
    }

    public static class BroadcastNotificationRequest {
        private String title;
        private String message;
        private NotificationType type;
        private String actionUrl;

        // Getters and setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public NotificationType getType() { return type; }
        public void setType(NotificationType type) { this.type = type; }

        public String getActionUrl() { return actionUrl; }
        public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }
    }
}