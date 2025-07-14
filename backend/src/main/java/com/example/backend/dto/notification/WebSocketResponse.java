package com.example.backend.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketResponse {
    private String type;        // "SUCCESS", "ERROR", "ACK", etc.
    private String message;     // Human-readable message
    private Object data;        // Optional additional data
    private LocalDateTime timestamp;

    // Constructor without data field - for simple responses
    public WebSocketResponse(String type, String message) {
        this.type = type;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    // Constructor with data field - for responses that include additional data
    public WebSocketResponse(String type, String message, Object data) {
        this.type = type;
        this.message = message;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }
}