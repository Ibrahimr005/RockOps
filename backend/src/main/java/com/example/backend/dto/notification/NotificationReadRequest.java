package com.example.backend.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationReadRequest {
    private UUID notificationId;
    private UUID userId;
}