package com.example.backend.config.notification;

import com.example.backend.controllers.notification.WebSocketController;
import com.example.backend.models.user.User;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.security.Principal;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple message broker for sending messages to clients
        // "/topic" - for broadcasting to multiple users (like "all users in chat room")
        // "/queue" - for sending to specific users (like "personal notifications")
        config.enableSimpleBroker("/topic", "/queue");

        // Set prefix for messages FROM client TO server
        // When client sends message, it must start with "/app"
        // Example: client sends to "/app/notify" -> goes to @MessageMapping("/notify")
        config.setApplicationDestinationPrefixes("/app");

        // Set prefix for user-specific destinations
        // Allows sending to specific users like "/user/john/queue/notifications"
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // This is the URL where clients connect to establish WebSocket connection
        // Your frontend will connect to: ws://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow connections from any origin (for development)
                .withSockJS(); // Enable SockJS fallback for browsers that don't support WebSockets

        // Alternative endpoint without SockJS (for modern browsers)
        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns("*");
    }
}