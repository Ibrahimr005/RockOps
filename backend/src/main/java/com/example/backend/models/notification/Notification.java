package com.example.backend.models.notification;

import com.example.backend.models.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // null for broadcast notifications

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "action_url")
    private String actionUrl;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "related_entity")
    private String relatedEntity;

    @Column(name = "read_by_users", columnDefinition = "TEXT")
    private String readByUsers = "";

    @Column(name = "hidden_by_users", columnDefinition = "TEXT")
    private String hiddenByUsers = "";

    // Constructors
    public Notification() {}

    public Notification(String title, String message, NotificationType type) {
        this.title = title;
        this.message = message;
        this.type = type;
    }

    public Notification(String title, String message, NotificationType type, User user) {
        this.title = title;
        this.message = message;
        this.type = type;
        this.user = user;
    }

    public Notification(String title, String message, NotificationType type, User user, String actionUrl) {
        this.title = title;
        this.message = message;
        this.type = type;
        this.user = user;
        this.actionUrl = actionUrl;
    }

    public Notification(String title, String message, NotificationType type, User user, String actionUrl, String relatedEntity) {
        this.title = title;
        this.message = message;
        this.type = type;
        this.user = user;
        this.actionUrl = actionUrl;
        this.relatedEntity = relatedEntity;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public String getRelatedEntity() {
        return relatedEntity;
    }

    public void setRelatedEntity(String relatedEntity) {
        this.relatedEntity = relatedEntity;
    }

    public String getReadByUsers() {
        return readByUsers;
    }

    public void setReadByUsers(String readByUsers) {
        this.readByUsers = readByUsers;
    }

    // Helper methods to check and manage read status for broadcast notifications
    public boolean isReadByUser(UUID userId) {
        if (readByUsers == null || readByUsers.isEmpty()) return false;
        return readByUsers.contains(userId.toString());
    }

    public void markAsReadByUser(UUID userId) {
        if (readByUsers == null) readByUsers = "";
        if (!isReadByUser(userId)) {
            readByUsers += (readByUsers.isEmpty() ? "" : ",") + userId.toString();
        }
    }

    public void markAsUnreadByUser(UUID userId) {
        if (readByUsers == null) return;
        readByUsers = readByUsers.replace(userId.toString(), "");
        readByUsers = readByUsers.replace(",,", ",");
        if (readByUsers.startsWith(",")) readByUsers = readByUsers.substring(1);
        if (readByUsers.endsWith(",")) readByUsers = readByUsers.substring(0, readByUsers.length() - 1);
    }

    public String getHiddenByUsers() {
        return hiddenByUsers;
    }

    public void setHiddenByUsers(String hiddenByUsers) {
        this.hiddenByUsers = hiddenByUsers;
    }

    // Helper methods for hiding notifications
    public boolean isHiddenByUser(UUID userId) {
        if (hiddenByUsers == null || hiddenByUsers.isEmpty()) return false;
        return hiddenByUsers.contains(userId.toString());
    }

    public void hideForUser(UUID userId) {
        if (hiddenByUsers == null) hiddenByUsers = "";
        if (!isHiddenByUser(userId)) {
            hiddenByUsers += (hiddenByUsers.isEmpty() ? "" : ",") + userId.toString();
        }
    }

    public void unhideForUser(UUID userId) {
        if (hiddenByUsers == null) return;
        hiddenByUsers = hiddenByUsers.replace(userId.toString(), "");
        hiddenByUsers = hiddenByUsers.replace(",,", ",");
        if (hiddenByUsers.startsWith(",")) hiddenByUsers = hiddenByUsers.substring(1);
        if (hiddenByUsers.endsWith(",")) hiddenByUsers = hiddenByUsers.substring(0, hiddenByUsers.length() - 1);
    }
}