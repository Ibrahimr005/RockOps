package com.example.backend.config.notification;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Bean
    public TaskScheduler heartBeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("websocket-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker with proper configuration and heartbeat
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000}) // Server sends every 10s, expects client every 10s
                .setTaskScheduler(heartBeatScheduler()); // Use our custom scheduler

        // Set application destination prefix
        config.setApplicationDestinationPrefixes("/app");

        // Set user destination prefix
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register STOMP endpoint with proper CORS configuration
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:*")
                .withSockJS()
                .setHeartbeatTime(25000); // SockJS heartbeat (backup to STOMP heartbeat)

        // Native WebSocket endpoint (without SockJS)
        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:*");
    }
}