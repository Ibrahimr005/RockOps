package com.example.backend.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketAuthMessage {
    private String token;       // JWT token
    private UUID userId;        // User ID
    private String sessionId;   // Optional session ID
}