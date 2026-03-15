package com.example.backend.controllers.notification;

import com.example.backend.config.JwtService;
import com.example.backend.controllers.notification.NotificationController.BroadcastNotificationRequest;
import com.example.backend.controllers.notification.NotificationController.SendNotificationRequest;
import com.example.backend.dto.notification.NotificationMessage;
import com.example.backend.models.notification.Notification;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.services.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
public class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationService notificationService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private User mockUser;
    private UUID notificationId;
    private NotificationMessage sampleMessage;
    private Notification sampleNotification;
    private UsernamePasswordAuthenticationToken authToken;

    @BeforeEach
    void setUp() {
        notificationId = UUID.randomUUID();

        mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("test.user")
                .password("password")
                .firstName("Test")
                .lastName("User")
                .role(Role.ADMIN)
                .build();

        // This is the correct way to inject a domain User as Authentication principal
        authToken = new UsernamePasswordAuthenticationToken(
                mockUser, null, mockUser.getAuthorities());

        sampleMessage = new NotificationMessage();
        sampleMessage.setId(notificationId);
        sampleMessage.setTitle("Test Notification");
        sampleMessage.setMessage("This is a test message");
        sampleMessage.setType(NotificationType.INFO);
        sampleMessage.setUserId(mockUser.getId());
        sampleMessage.setCreatedAt(LocalDateTime.now());
        sampleMessage.setRead(false);

        sampleNotification = new Notification(
                "Test Notification", "This is a test message", NotificationType.INFO, mockUser);
        sampleNotification.setId(notificationId);
    }

    // ==================== GET /api/notifications ====================

    @Test
    void getMyNotifications_shouldReturn200WithList() throws Exception {
        given(notificationService.getNotificationsForUser(any(User.class)))
                .willReturn(List.of(sampleMessage));

        mockMvc.perform(get("/api/notifications")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].title").value("Test Notification"))
                .andExpect(jsonPath("$[0].type").value("INFO"));
    }

    @Test
    void getMyNotifications_emptyList_shouldReturn200() throws Exception {
        given(notificationService.getNotificationsForUser(any(User.class)))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/notifications")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/notifications/unread ====================

    @Test
    void getUnreadNotifications_shouldReturn200WithList() throws Exception {
        NotificationMessage unread = new NotificationMessage();
        unread.setId(UUID.randomUUID());
        unread.setTitle("Unread");
        unread.setType(NotificationType.WARNING);
        unread.setRead(false);

        given(notificationService.getUnreadNotificationsForUser(any(User.class)))
                .willReturn(List.of(unread));

        mockMvc.perform(get("/api/notifications/unread")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].title").value("Unread"))
                .andExpect(jsonPath("$[0].read").value(false));
    }

    @Test
    void getUnreadNotifications_emptyList_shouldReturn200() throws Exception {
        given(notificationService.getUnreadNotificationsForUser(any(User.class)))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/notifications/unread")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/notifications/unread/count ====================

    @Test
    void getUnreadCount_shouldReturn200WithCountAndUserId() throws Exception {
        given(notificationService.getUnreadCountForUser(any(User.class)))
                .willReturn(5L);

        mockMvc.perform(get("/api/notifications/unread/count")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(5))
                .andExpect(jsonPath("$.userId").value(mockUser.getId().toString()));
    }

    @Test
    void getUnreadCount_zeroUnread_shouldReturn200() throws Exception {
        given(notificationService.getUnreadCountForUser(any(User.class)))
                .willReturn(0L);

        mockMvc.perform(get("/api/notifications/unread/count")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    // ==================== PUT /api/notifications/{id}/read ====================

    @Test
    void markAsRead_success_shouldReturn200WithSuccessTrue() throws Exception {
        given(notificationService.markAsRead(eq(notificationId), any(User.class)))
                .willReturn(true);

        mockMvc.perform(put("/api/notifications/{id}/read", notificationId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Notification marked as read"));
    }

    @Test
    void markAsRead_notFound_shouldReturn400WithSuccessFalse() throws Exception {
        given(notificationService.markAsRead(eq(notificationId), any(User.class)))
                .willReturn(false);

        mockMvc.perform(put("/api/notifications/{id}/read", notificationId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Notification not found or access denied"));
    }

    // ==================== PUT /api/notifications/read-all ====================

    @Test
    void markAllAsRead_shouldReturn200WithUpdatedCount() throws Exception {
        given(notificationService.markAllAsReadForUser(any(User.class)))
                .willReturn(7);

        mockMvc.perform(put("/api/notifications/read-all")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("All notifications marked as read"))
                .andExpect(jsonPath("$.updatedCount").value(7));
    }

    @Test
    void markAllAsRead_noneToUpdate_shouldReturn200WithZeroCount() throws Exception {
        given(notificationService.markAllAsReadForUser(any(User.class)))
                .willReturn(0);

        mockMvc.perform(put("/api/notifications/read-all")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.updatedCount").value(0));
    }

    // ==================== DELETE /api/notifications/{id} ====================

    @Test
    void deleteNotification_success_shouldReturn200() throws Exception {
        given(notificationService.deleteNotification(eq(notificationId), any(User.class)))
                .willReturn(true);

        mockMvc.perform(delete("/api/notifications/{id}", notificationId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Notification deleted successfully"));
    }

    @Test
    void deleteNotification_notFound_shouldReturn400() throws Exception {
        given(notificationService.deleteNotification(eq(notificationId), any(User.class)))
                .willReturn(false);

        mockMvc.perform(delete("/api/notifications/{id}", notificationId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(authToken))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Notification not found or access denied"));
    }

    // ==================== POST /api/notifications/send ====================

    @Test
    void sendNotification_success_shouldReturn200WithNotificationId() throws Exception {
        given(notificationService.sendNotificationToUser(
                any(User.class), any(), any(), any(NotificationType.class), any()))
                .willReturn(sampleNotification);

        SendNotificationRequest request = new SendNotificationRequest();
        request.setUserId(UUID.randomUUID());
        request.setTitle("Alert");
        request.setMessage("Approved");
        request.setType(NotificationType.SUCCESS);
        request.setActionUrl("/orders/123");

        mockMvc.perform(post("/api/notifications/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Notification sent successfully"))
                .andExpect(jsonPath("$.notificationId").value(notificationId.toString()));
    }

    @Test
    void sendNotification_serviceThrows_shouldReturn400() throws Exception {
        given(notificationService.sendNotificationToUser(
                any(User.class), any(), any(), any(NotificationType.class), any()))
                .willThrow(new RuntimeException("User not found"));

        SendNotificationRequest request = new SendNotificationRequest();
        request.setUserId(UUID.randomUUID());
        request.setTitle("Alert");
        request.setMessage("Message");
        request.setType(NotificationType.INFO);

        mockMvc.perform(post("/api/notifications/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Failed to send notification: User not found"));
    }

    // ==================== POST /api/notifications/broadcast ====================

    @Test
    void broadcastNotification_success_shouldReturn200WithNotificationId() throws Exception {
        Notification broadcast = new Notification(
                "Maintenance", "Downtime at midnight", NotificationType.WARNING);
        broadcast.setId(notificationId);

        given(notificationService.broadcastNotification(
                any(), any(), any(NotificationType.class), any()))
                .willReturn(broadcast);

        BroadcastNotificationRequest request = new BroadcastNotificationRequest();
        request.setTitle("Maintenance");
        request.setMessage("Downtime at midnight");
        request.setType(NotificationType.WARNING);
        request.setActionUrl("/system/status");

        mockMvc.perform(post("/api/notifications/broadcast")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Notification broadcasted successfully"))
                .andExpect(jsonPath("$.notificationId").value(notificationId.toString()));
    }

    @Test
    void broadcastNotification_serviceThrows_shouldReturn400() throws Exception {
        given(notificationService.broadcastNotification(
                any(), any(), any(NotificationType.class), any()))
                .willThrow(new RuntimeException("WebSocket unavailable"));

        BroadcastNotificationRequest request = new BroadcastNotificationRequest();
        request.setTitle("Alert");
        request.setMessage("Critical alert");
        request.setType(NotificationType.ERROR);

        mockMvc.perform(post("/api/notifications/broadcast")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Failed to broadcast notification: WebSocket unavailable"));
    }
}