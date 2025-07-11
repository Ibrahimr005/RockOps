package com.example.backend.repositories.notification;

import com.example.backend.models.notification.Notification;
import com.example.backend.models.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // Find all notifications for a specific user
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    // Find unread notifications for a specific user
    List<Notification> findByUserAndReadFalseOrderByCreatedAtDesc(User user);

    // Find broadcast notifications (user is null)
    List<Notification> findByUserIsNullOrderByCreatedAtDesc();

    // Count unread notifications for a user
    long countByUserAndReadFalse(User user);

    // Mark notification as read
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.id = :notificationId AND n.user = :user")
    int markAsRead(@Param("notificationId") UUID notificationId, @Param("user") User user);

    // Mark all notifications as read for a user
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user = :user AND n.read = false")
    int markAllAsReadForUser(@Param("user") User user);

    // Add this method to your existing repository interface
    @Query("SELECT n FROM Notification n WHERE n.id = :notificationId AND (n.user = :user OR n.user IS NULL)")
    Optional<Notification> findByIdAndUserOrBroadcast(@Param("notificationId") UUID notificationId,
                                                      @Param("user") User user);
}