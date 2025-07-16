package com.example.backend.config.notification;

import com.example.backend.config.JwtService;
import com.example.backend.models.user.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Get JWT token from connection headers
                    List<String> authorizationHeaders = accessor.getNativeHeader("Authorization");

                    if (authorizationHeaders != null && !authorizationHeaders.isEmpty()) {
                        String authorizationHeader = authorizationHeaders.get(0);

                        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                            String token = authorizationHeader.substring(7);

                            try {
                                // Extract username from JWT token
                                String username = jwtService.extractUsername(token);

                                if (username != null) {
                                    // Load user details
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                                    // Validate token
                                    if (jwtService.isTokenValid(token, (User) userDetails)) {
                                        // Create authentication
                                        UsernamePasswordAuthenticationToken authentication =
                                                new UsernamePasswordAuthenticationToken(
                                                        userDetails,
                                                        null,
                                                        userDetails.getAuthorities()
                                                );

                                        // Set user in session
                                        accessor.setUser(authentication);

                                        System.out.println("WebSocket authentication successful for user: " + username);
                                    } else {
                                        System.out.println("WebSocket authentication failed: Invalid token");
                                        throw new IllegalArgumentException("Invalid JWT token");
                                    }
                                }
                            } catch (Exception e) {
                                throw new IllegalArgumentException("Authentication failed: " + e.getMessage());
                            }
                        } else {
                            throw new IllegalArgumentException("Missing or invalid Authorization header");
                        }
                    } else {
                        throw new IllegalArgumentException("Missing Authorization header");
                    }
                }

                return message;
            }
        });
    }
}