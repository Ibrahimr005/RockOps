package com.example.backend.services.notification;

import com.example.backend.controllers.notification.WebSocketController;
import com.example.backend.dto.notification.NotificationMessage;
import com.example.backend.models.notification.Notification;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.User;
import com.example.backend.repositories.notification.NotificationRepository;
import com.example.backend.repositories.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private WebSocketController webSocketController;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("testuser");
        user.setFirstName("John");
        user.setLastName("Doe");
    }

    // ==================== getNotificationsForUser ====================

    @Test
    public void getNotificationsForUser_onlyUserNotifications_shouldReturnAll() {
        Notification n1 = makeUserNotification("Title1", user);
        Notification n2 = makeUserNotification("Title2", user);

        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(n1, n2));
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of());

        List<NotificationMessage> result = notificationService.getNotificationsForUser(user);

        assertEquals(2, result.size());
    }

    @Test
    public void getNotificationsForUser_broadcastNotVisible_shouldFilterHidden() {
        Notification broadcast = makeBroadcastNotification("Broadcast");
        broadcast.hideForUser(user.getId()); // hidden for this user

        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(broadcast));

        List<NotificationMessage> result = notificationService.getNotificationsForUser(user);

        assertEquals(0, result.size());
    }

    @Test
    public void getNotificationsForUser_broadcastVisible_shouldInclude() {
        Notification broadcast = makeBroadcastNotification("Broadcast");
        // not hidden for this user

        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(broadcast));

        List<NotificationMessage> result = notificationService.getNotificationsForUser(user);

        assertEquals(1, result.size());
    }

    @Test
    public void getNotificationsForUser_mixedUserAndBroadcast_shouldCombineAndSort() {
        Notification userNotif = makeUserNotification("User", user);
        userNotif.setCreatedAt(LocalDateTime.now().minusMinutes(1));

        Notification broadcast = makeBroadcastNotification("Broadcast");
        broadcast.setCreatedAt(LocalDateTime.now()); // newer

        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(userNotif));
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(broadcast));

        List<NotificationMessage> result = notificationService.getNotificationsForUser(user);

        assertEquals(2, result.size());
        // broadcast is newer, should be first
        assertEquals("Broadcast", result.get(0).getTitle());
    }

    @Test
    public void getNotificationsForUser_broadcastReadByUser_shouldSetReadTrue() {
        Notification broadcast = makeBroadcastNotification("Broadcast");
        broadcast.markAsReadByUser(user.getId());

        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(broadcast));

        List<NotificationMessage> result = notificationService.getNotificationsForUser(user);

        assertEquals(1, result.size());
        assertTrue(result.get(0).isRead());
    }

    @Test
    public void getNotificationsForUser_broadcastNotReadByUser_shouldSetReadFalse() {
        Notification broadcast = makeBroadcastNotification("Broadcast");
        // not read by user

        when(notificationRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(broadcast));

        List<NotificationMessage> result = notificationService.getNotificationsForUser(user);

        assertEquals(1, result.size());
        assertFalse(result.get(0).isRead());
    }

    // ==================== getUnreadCountForUser ====================

    @Test
    public void getUnreadCountForUser_noNotifications_shouldReturnZero() {
        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(0L);
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of());

        long count = notificationService.getUnreadCountForUser(user);

        assertEquals(0, count);
    }

    @Test
    public void getUnreadCountForUser_onlyUserUnread_shouldCountCorrectly() {
        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(3L);
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of());

        long count = notificationService.getUnreadCountForUser(user);

        assertEquals(3, count);
    }

    @Test
    public void getUnreadCountForUser_unreadBroadcast_shouldAddToCounts() {
        Notification unreadBroadcast = makeBroadcastNotification("Broadcast");
        // not read, not hidden

        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(2L);
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(unreadBroadcast));

        long count = notificationService.getUnreadCountForUser(user);

        assertEquals(3, count);
    }

    @Test
    public void getUnreadCountForUser_broadcastAlreadyRead_shouldNotCount() {
        Notification readBroadcast = makeBroadcastNotification("Broadcast");
        readBroadcast.markAsReadByUser(user.getId());

        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(0L);
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(readBroadcast));

        long count = notificationService.getUnreadCountForUser(user);

        assertEquals(0, count);
    }

    @Test
    public void getUnreadCountForUser_broadcastHiddenByUser_shouldNotCount() {
        Notification hiddenBroadcast = makeBroadcastNotification("Broadcast");
        hiddenBroadcast.hideForUser(user.getId());

        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(0L);
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc()).thenReturn(List.of(hiddenBroadcast));

        long count = notificationService.getUnreadCountForUser(user);

        assertEquals(0, count);
    }

    @Test
    public void getUnreadCountForUser_multipleBroadcasts_mixedReadState() {
        Notification unread1 = makeBroadcastNotification("A");
        Notification unread2 = makeBroadcastNotification("B");
        Notification read = makeBroadcastNotification("C");
        read.markAsReadByUser(user.getId());
        Notification hidden = makeBroadcastNotification("D");
        hidden.hideForUser(user.getId());

        when(notificationRepository.countByUserAndReadFalse(user)).thenReturn(1L);
        when(notificationRepository.findByUserIsNullOrderByCreatedAtDesc())
                .thenReturn(List.of(unread1, unread2, read, hidden));

        long count = notificationService.getUnreadCountForUser(user);

        assertEquals(3, count); // 1 user + 2 unread broadcasts
    }

    // ==================== markAsRead ====================

    @Test
    public void markAsRead_notificationExists_shouldReturnTrue() {
        UUID notifId = UUID.randomUUID();
        when(notificationRepository.markAsRead(notifId, user)).thenReturn(1);

        boolean result = notificationService.markAsRead(notifId, user);

        assertTrue(result);
    }

    @Test
    public void markAsRead_notificationNotFound_shouldReturnFalse() {
        UUID notifId = UUID.randomUUID();
        when(notificationRepository.markAsRead(notifId, user)).thenReturn(0);

        boolean result = notificationService.markAsRead(notifId, user);

        assertFalse(result);
    }

    // ==================== markAllAsReadForUser ====================

    @Test
    public void markAllAsReadForUser_shouldReturnUpdatedCount() {
        when(notificationRepository.markAllAsReadForUser(user)).thenReturn(5);

        int result = notificationService.markAllAsReadForUser(user);

        assertEquals(5, result);
        verify(notificationRepository).markAllAsReadForUser(user);
    }

    @Test
    public void markAllAsReadForUser_noNotifications_shouldReturnZero() {
        when(notificationRepository.markAllAsReadForUser(user)).thenReturn(0);

        int result = notificationService.markAllAsReadForUser(user);

        assertEquals(0, result);
    }

    // ==================== getNotificationById ====================

    @Test
    public void getNotificationById_userOwnsNotification_shouldReturn() {
        UUID notifId = UUID.randomUUID();
        Notification n = makeUserNotification("Test", user);
        n.setId(notifId);

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));

        Optional<Notification> result = notificationService.getNotificationById(notifId, user);

        assertTrue(result.isPresent());
    }

    @Test
    public void getNotificationById_broadcastNotification_shouldReturn() {
        UUID notifId = UUID.randomUUID();
        Notification n = makeBroadcastNotification("Broadcast");
        n.setId(notifId);
        // user is null = broadcast, accessible to all

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));

        Optional<Notification> result = notificationService.getNotificationById(notifId, user);

        assertTrue(result.isPresent());
    }

    @Test
    public void getNotificationById_belongsToOtherUser_shouldReturnEmpty() {
        UUID notifId = UUID.randomUUID();
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());

        Notification n = makeUserNotification("Test", otherUser);
        n.setId(notifId);

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));

        Optional<Notification> result = notificationService.getNotificationById(notifId, user);

        assertFalse(result.isPresent());
    }

    @Test
    public void getNotificationById_notFound_shouldReturnEmpty() {
        UUID notifId = UUID.randomUUID();
        when(notificationRepository.findById(notifId)).thenReturn(Optional.empty());

        Optional<Notification> result = notificationService.getNotificationById(notifId, user);

        assertFalse(result.isPresent());
    }

    // ==================== deleteNotification ====================

    @Test
    public void deleteNotification_userSpecific_shouldDeleteAndReturnTrue() {
        UUID notifId = UUID.randomUUID();
        Notification n = makeUserNotification("Test", user);
        n.setId(notifId);

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));

        boolean result = notificationService.deleteNotification(notifId, user);

        assertTrue(result);
        verify(notificationRepository).deleteById(notifId);
        verify(notificationRepository, never()).save(any());
    }

    @Test
    public void deleteNotification_broadcast_shouldHideNotDelete() {
        UUID notifId = UUID.randomUUID();
        Notification n = makeBroadcastNotification("Broadcast");
        n.setId(notifId);

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        boolean result = notificationService.deleteNotification(notifId, user);

        assertTrue(result);
        verify(notificationRepository, never()).deleteById(any());
        verify(notificationRepository).save(n);
        assertTrue(n.isHiddenByUser(user.getId()));
    }

    @Test
    public void deleteNotification_notFound_shouldReturnFalse() {
        UUID notifId = UUID.randomUUID();
        // notification belongs to another user — getNotificationById returns empty
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());

        Notification n = makeUserNotification("Test", otherUser);
        n.setId(notifId);
        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));

        boolean result = notificationService.deleteNotification(notifId, user);

        assertFalse(result);
        verify(notificationRepository, never()).deleteById(any());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    public void deleteNotification_repositoryThrows_shouldReturnFalse() {
        UUID notifId = UUID.randomUUID();
        Notification n = makeUserNotification("Test", user);
        n.setId(notifId);

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(n));
        doThrow(new RuntimeException("DB error")).when(notificationRepository).deleteById(notifId);

        boolean result = notificationService.deleteNotification(notifId, user);

        assertFalse(result);
    }

    // ==================== sendNotificationToUser (key behaviors) ====================

    @Test
    public void sendNotificationToUser_userConnected_shouldSaveAndPushWebSocket() {
        Notification saved = makeUserNotification("Title", user);
        saved.setId(UUID.randomUUID());

        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);
        when(webSocketController.isUserConnected(user.getId())).thenReturn(true);

        Notification result = notificationService.sendNotificationToUser(user, "Title", "Message", NotificationType.INFO);

        assertNotNull(result);
        verify(notificationRepository).save(any(Notification.class));
        verify(webSocketController).sendNotificationToUser(eq(user), any(NotificationMessage.class));
    }

    @Test
    public void sendNotificationToUser_userNotConnected_shouldSaveWithoutWebSocket() {
        Notification saved = makeUserNotification("Title", user);
        saved.setId(UUID.randomUUID());

        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);
        when(webSocketController.isUserConnected(user.getId())).thenReturn(false);

        notificationService.sendNotificationToUser(user, "Title", "Message", NotificationType.INFO);

        verify(notificationRepository).save(any(Notification.class));
        verify(webSocketController, never()).sendNotificationToUser(any(), any());
    }

    // ==================== broadcastNotification ====================

    @Test
    public void broadcastNotification_shouldSaveAndBroadcast() {
        Notification saved = makeBroadcastNotification("Alert");
        saved.setId(UUID.randomUUID());

        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        Notification result = notificationService.broadcastNotification("Alert", "All users", NotificationType.INFO);

        assertNotNull(result);
        verify(notificationRepository).save(any(Notification.class));
        verify(webSocketController).broadcastNotification(any(NotificationMessage.class));
    }

    @Test
    public void broadcastNotification_withActionUrl_shouldSetActionUrl() {
        Notification saved = makeBroadcastNotification("Alert");
        saved.setId(UUID.randomUUID());
        saved.setActionUrl("/dashboard");

        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        Notification result = notificationService.broadcastNotification("Alert", "All users", NotificationType.INFO, "/dashboard");

        verify(notificationRepository).save(any(Notification.class));
        verify(webSocketController).broadcastNotification(any(NotificationMessage.class));
    }

    // ==================== getUnreadNotificationsForUser ====================

    @Test
    public void getUnreadNotificationsForUser_shouldReturnUnreadOnly() {
        Notification unread = makeUserNotification("Unread", user);
        unread.setRead(false);

        when(notificationRepository.findByUserAndReadFalseOrderByCreatedAtDesc(user))
                .thenReturn(List.of(unread));

        List<NotificationMessage> result = notificationService.getUnreadNotificationsForUser(user);

        assertEquals(1, result.size());
        assertFalse(result.get(0).isRead());
    }

    @Test
    public void getUnreadNotificationsForUser_empty_shouldReturnEmptyList() {
        when(notificationRepository.findByUserAndReadFalseOrderByCreatedAtDesc(user))
                .thenReturn(List.of());

        List<NotificationMessage> result = notificationService.getUnreadNotificationsForUser(user);

        assertTrue(result.isEmpty());
    }

    // ==================== Helpers ====================

    private Notification makeUserNotification(String title, User owner) {
        Notification n = new Notification(title, "Message", NotificationType.INFO, owner);
        n.setId(UUID.randomUUID());
        n.setCreatedAt(LocalDateTime.now());
        return n;
    }

    private Notification makeBroadcastNotification(String title) {
        Notification n = new Notification(title, "Broadcast message", NotificationType.INFO);
        n.setId(UUID.randomUUID());
        n.setCreatedAt(LocalDateTime.now());
        return n;
    }
}