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
            return 'http://localhost:8080/ws';
        } else if (hostname.includes('dev-rock-ops.vercel.app')) {
            return 'https://rockops.onrender.com/ws';
        } else if (hostname.includes('rock-ops.vercel.app')) {
            return 'https://rockops-backend.onrender.com/ws';
        } else if (hostname === 'rockops.vercel.app') {
            return 'https://rockops-production-backend.onrender.com/ws';
        } else {
            return 'http://localhost:8080/ws';
        }
    }

    connect(token) {
        return new Promise((resolve, reject) => {
            if (this.connected) {
                resolve();
                return;
            }

            this.token = token;
            const wsUrl = this.getWebSocketURL();

            this.client = new Client({
                webSocketFactory: () => new SockJS(wsUrl),
                connectHeaders: {
                    'Authorization': `Bearer ${token}`
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
            });

            this.client.onConnect = (frame) => {
                this.connected = true;

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(true);
                }

                setTimeout(() => {
                    this.setupSubscriptions();
                    resolve();
                }, 100);
            };

            this.client.onStompError = (frame) => {
                this.connected = false;

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }

                reject(new Error(`WebSocket connection failed: ${frame.headers['message'] || 'Unknown error'}`));
            };

            this.client.onWebSocketError = (error) => {
                this.connected = false;

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }

                reject(new Error(`WebSocket error: ${error.message}`));
            };

            this.client.onDisconnect = () => {
                this.connected = false;
                this.subscriptions.clear();

                if (this.connectionStatusCallback) {
                    this.connectionStatusCallback(false);
                }
            };

            try {
                this.client.activate();
            } catch (error) {
                reject(error);
            }
        });
    }

    setupSubscriptions() {
        if (!this.connected || !this.client) {
            return;
        }

        try {
            const notificationSub = this.client.subscribe('/user/queue/notifications', (message) => {
                const notifications = JSON.parse(message.body);

                if (this.notificationCallback) {
                    const notificationArray = Array.isArray(notifications) ? notifications : [notifications];
                    this.notificationCallback(notificationArray);
                }
            });

            const unreadCountSub = this.client.subscribe('/user/queue/unread-count', (message) => {
                const response = JSON.parse(message.body);

                if (this.unreadCountCallback && response.data !== undefined) {
                    this.unreadCountCallback(response.data);
                }
            });

            const responsesSub = this.client.subscribe('/user/queue/responses', (message) => {
                const response = JSON.parse(message.body);
            });

            const broadcastSub = this.client.subscribe('/topic/notifications', (message) => {
                const notification = JSON.parse(message.body);

                if (this.notificationCallback) {
                    this.notificationCallback([notification]);
                }
            });

            this.subscriptions.set('notifications', notificationSub);
            this.subscriptions.set('unread-count', unreadCountSub);
            this.subscriptions.set('responses', responsesSub);
            this.subscriptions.set('broadcast', broadcastSub);

            this.requestNotificationHistory();
        } catch (error) {
            // Silent error handling
        }
    }

    requestNotificationHistory() {
        if (!this.connected || !this.client) {
            return;
        }

        try {
            this.client.publish({
                destination: '/app/getNotifications',
                body: JSON.stringify({})
            });
        } catch (error) {
            // Silent error handling
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
            this.subscriptions.forEach((subscription) => {
                subscription.unsubscribe();
            });
            this.subscriptions.clear();

            this.client.deactivate();
            this.connected = false;
        }
    }

    onNotification(callback) {
        this.notificationCallback = callback;
    }

    onUnreadCount(callback) {
        this.unreadCountCallback = callback;
    }

    onConnectionStatus(callback) {
        this.connectionStatusCallback = callback;
    }

    isConnected() {
        return this.connected;
    }
}

export const webSocketService = new WebSocketService();