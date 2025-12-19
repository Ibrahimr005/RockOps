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

    getWebSocketURL() {
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local development
            return 'http://localhost:8080/ws';
        } else if (hostname.includes('dev-rock-ops.vercel.app')) {
            // Development deployment
            return 'https://rockops.onrender.com/ws';
        } else if (hostname.includes('rock-ops.vercel.app')) {
            // Test deployment (with hyphen)
            return 'https://rockops-backend.onrender.com/ws';
        } else if (hostname === 'rockops.vercel.app') {
            // NEW Production deployment (no hyphen)
            return 'https://rockops-production-backend.onrender.com/ws';
        } else {
            // Fallback to localhost
            return 'http://localhost:8080/ws';
        }
    }

    connect(token) {
        return new Promise((resolve, reject) => {
            if (this.connected) {
                console.log('🔌 Already connected to WebSocket');
                resolve();
                return;
            }

            this.token = token;
            const wsUrl = this.getWebSocketURL();

            console.log('🔌 Connecting to WebSocket:', wsUrl);

            // Create STOMP client with SockJS
            this.client = new Client({
                webSocketFactory: () => new SockJS(wsUrl),
                connectHeaders: {
                    'Authorization': `Bearer ${token}`
                },
                debug: (str) => {
                    console.log('🔍 STOMP Debug:', str);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
            });

            // Connection established
            this.client.onConnect = (frame) => {
                console.log('✅ WebSocket Connected:', frame);
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
                console.error('❌ STOMP Error:', frame);
                this.connected = false;

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }

                reject(new Error(`WebSocket connection failed: ${frame.headers['message'] || 'Unknown error'}`));
            };

            // WebSocket error
            this.client.onWebSocketError = (error) => {
                console.error('❌ WebSocket Error:', error);
                this.connected = false;

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }

                reject(new Error(`WebSocket error: ${error.message}`));
            };

            // Connection closed
            this.client.onDisconnect = () => {
                console.log('🔌 WebSocket Disconnected');
                this.connected = false;
                this.subscriptions.clear();

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }
            };

            // Start the connection
            try {
                this.client.activate();
            } catch (error) {
                console.error('❌ Failed to activate WebSocket client:', error);
                reject(error);
            }
        });
    }

    setupSubscriptions() {
        if (!this.connected || !this.client) {
            console.warn('⚠️ Cannot setup subscriptions: not connected');
            return;
        }

        console.log('📡 Setting up WebSocket subscriptions...');

        try {
            // Subscribe to user-specific notifications
            const notificationSub = this.client.subscribe('/user/queue/notifications', (message) => {
                console.log('📬 Received notification message:', message.body);
                const notifications = JSON.parse(message.body);

                if (this.notificationCallback) {
                    // Handle both single notification and array of notifications
                    const notificationArray = Array.isArray(notifications) ? notifications : [notifications];
                    this.notificationCallback(notificationArray);
                }
            });

            // Subscribe to unread count updates
            const unreadCountSub = this.client.subscribe('/user/queue/unread-count', (message) => {
                console.log('📊 Received unread count:', message.body);
                const response = JSON.parse(message.body);

                if (this.unreadCountCallback && response.data !== undefined) {
                    this.unreadCountCallback(response.data);
                }
            });

            // Subscribe to general responses
            const responsesSub = this.client.subscribe('/user/queue/responses', (message) => {
                console.log('📝 Received response:', message.body);
                const response = JSON.parse(message.body);
            });

            // Subscribe to broadcast notifications (optional)
            const broadcastSub = this.client.subscribe('/topic/notifications', (message) => {
                console.log('📢 Received broadcast notification:', message.body);
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

            console.log('✅ WebSocket subscriptions established');

            // Request notification history after connecting
            this.requestNotificationHistory();
        } catch (error) {
            console.error('❌ Error setting up subscriptions:', error);
        }
    }

    requestNotificationHistory() {
        if (!this.connected || !this.client) {
            console.warn('⚠️ Cannot request history: not connected');
            return;
        }

        try {
            this.client.publish({
                destination: '/app/getNotifications',
                body: JSON.stringify({})
            });
            console.log('📜 Requested notification history');
        } catch (error) {
            console.error('❌ Error requesting notification history:', error);
        }
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
                console.log('✅ Mark as read request sent:', notificationId);
                resolve();
            } catch (error) {
                console.error('❌ Error marking as read:', error);
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
                console.log('✅ Mark all as read request sent');
                resolve();
            } catch (error) {
                console.error('❌ Error marking all as read:', error);
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.client && this.connected) {
            console.log('🔌 Disconnecting WebSocket...');

            // Unsubscribe from all subscriptions
            this.subscriptions.forEach((subscription) => {
                subscription.unsubscribe();
            });
            this.subscriptions.clear();

            // Deactivate client
            this.client.deactivate();
            this.connected = false;

            console.log('✅ WebSocket disconnected');
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