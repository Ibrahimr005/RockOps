import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
    constructor() {
        this.client = null;
        this.connected = false;
        this.subscriptions = new Map();
        this.notificationCallback = null;
        this.unreadCountCallback = null;
        this.connectionStatusCallback = null;
        this.token = null;
    }

    connect(token) {
        return new Promise((resolve, reject) => {
            if (this.connected) {
                console.log('🔌 Already connected to WebSocket');
                resolve();
                return;
            }

            this.token = token;

            // Create STOMP client with SockJS
            this.client = new Client({
                webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
                connectHeaders: {
                    'Authorization': `Bearer ${token}`
                },
                debug: () => {
                    // Debug disabled for production
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
            });

            // Connection established
            this.client.onConnect = (frame) => {
                this.connected = true;

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(true);
                }

                // Small delay to ensure connection is fully established
                setTimeout(() => {
                    this.setupSubscriptions();
                    resolve();
                }, 100);
            };

            // Connection error
            this.client.onStompError = (frame) => {
                this.connected = false;

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }

                reject(new Error('WebSocket connection failed'));
            };

            // Connection closed
            this.client.onDisconnect = () => {
                this.connected = false;
                this.subscriptions.clear();

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }
            };

            // Start the connection
            this.client.activate();
        });
    }

    setupSubscriptions() {
        if (!this.connected || !this.client) {
            return;
        }

        // Subscribe to user-specific notifications
        const notificationSub = this.client.subscribe('/user/queue/notifications', (message) => {
            const notifications = JSON.parse(message.body);

            if (this.notificationCallback) {
                // Handle both single notification and array of notifications
                const notificationArray = Array.isArray(notifications) ? notifications : [notifications];
                this.notificationCallback(notificationArray);
            }
        });

        // Subscribe to unread count updates
        const unreadCountSub = this.client.subscribe('/user/queue/unread-count', (message) => {
            const response = JSON.parse(message.body);

            if (this.unreadCountCallback && response.data !== undefined) {
                this.unreadCountCallback(response.data);
            }
        });

        // Subscribe to general responses
        const responsesSub = this.client.subscribe('/user/queue/responses', (message) => {
            const response = JSON.parse(message.body);
        });

        // Subscribe to broadcast notifications (optional)
        const broadcastSub = this.client.subscribe('/topic/notifications', (message) => {
            const notification = JSON.parse(message.body);

            if (this.notificationCallback) {
                this.notificationCallback([notification]);
            }
        });

        // Store subscriptions for cleanup
        this.subscriptions.set('notifications', notificationSub);
        this.subscriptions.set('unread-count', unreadCountSub);
        this.subscriptions.set('responses', responsesSub);
        this.subscriptions.set('broadcast', broadcastSub);

        // Request notification history after connecting
        this.requestNotificationHistory();
    }

    requestNotificationHistory() {
        if (!this.connected || !this.client) {
            return;
        }

        this.client.publish({
            destination: '/app/getNotifications',
            body: JSON.stringify({})
        });
    }

    markAsRead(notificationId) {
        if (!this.connected || !this.client) {
            return Promise.reject(new Error('Not connected'));
        }

        return new Promise((resolve, reject) => {
            try {
                this.client.publish({
                    destination: '/app/markAsRead',
                    body: JSON.stringify({ notificationId })
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    markAllAsRead() {
        if (!this.connected || !this.client) {
            return Promise.reject(new Error('Not connected'));
        }

        return new Promise((resolve, reject) => {
            try {
                this.client.publish({
                    destination: '/app/markAllAsRead',
                    body: JSON.stringify({})
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.client && this.connected) {
            // Unsubscribe from all subscriptions
            this.subscriptions.forEach((subscription) => {
                subscription.unsubscribe();
            });
            this.subscriptions.clear();

            // Deactivate client
            this.client.deactivate();
            this.connected = false;
        }
    }

    // Callback setters
    onNotification(callback) {
        this.notificationCallback = callback;
    }

    onUnreadCount(callback) {
        this.unreadCountCallback = callback;
    }

    onConnectionStatus(callback) {
        this.connectionStatusCallback = callback;
    }

    // Getters
    isConnected() {
        return this.connected;
    }
}

// Export singleton instance
export const webSocketService = new WebSocketService();