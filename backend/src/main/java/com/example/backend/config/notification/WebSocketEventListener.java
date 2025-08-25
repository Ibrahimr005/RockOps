package com.example.backend.config.notification;

import com.example.backend.controllers.notification.WebSocketController;
import com.example.backend.models.user.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    @Autowired
    private WebSocketController webSocketController;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        try {
            if (headerAccessor.getUser() instanceof UsernamePasswordAuthenticationToken) {
                UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) headerAccessor.getUser();
                User user = (User) auth.getPrincipal();

                System.out.println("🔌 User connected: " + user.getUsername() + " (ID: " + user.getId() + ")");
                System.out.println("🔍 Session ID: " + headerAccessor.getSessionId());

                // Register the user session for real-time notifications
                webSocketController.registerUserSession(user.getId(), headerAccessor.getSessionId());

                // Send unread notifications to newly connected user
                webSocketController.sendUnreadNotificationsToUser(user);
            } else {
                System.out.println("🔌 Anonymous WebSocket connection established");
                System.out.println("🔍 Session ID: " + headerAccessor.getSessionId());
            }
        } catch (Exception e) {
            System.err.println("❌ Error handling WebSocket connection: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        try {
            if (headerAccessor.getUser() instanceof UsernamePasswordAuthenticationToken) {
                UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) headerAccessor.getUser();
                User user = (User) auth.getPrincipal();

                // Remove user session from WebSocketController
                webSocketController.removeUserSession(user.getId());

                System.out.println("🔌 User disconnected: " + user.getUsername() + " (ID: " + user.getId() + ")");
                System.out.println("🔍 Session ID: " + headerAccessor.getSessionId());
            } else {
                System.out.println("🔌 Anonymous WebSocket connection disconnected");
                System.out.println("🔍 Session ID: " + headerAccessor.getSessionId());
            }
        } catch (Exception e) {
            System.err.println("❌ Error handling WebSocket disconnection: " + e.getMessage());
            e.printStackTrace();
        }
    }
}