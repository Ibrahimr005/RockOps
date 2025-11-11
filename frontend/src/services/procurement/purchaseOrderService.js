// src/services/procurement/purchaseOrderService.js
import apiClient from '../../utils/apiClient.js';
import { PURCHASE_ORDER_ENDPOINTS } from '../../config/api.config.js';

export const purchaseOrderService = {
    // Get all purchase orders
    getAll: async () => {
        try {
            const response = await apiClient.get(PURCHASE_ORDER_ENDPOINTS.BASE);
            return response.data || response;
        } catch (error) {
            console.error('Error fetching all purchase orders:', error);
            throw error;
        }
    },

    // Get purchase order by ID
    getById: async (id) => {
        try {
            const response = await apiClient.get(PURCHASE_ORDER_ENDPOINTS.BY_ID(id));
            return response.data || response;
        } catch (error) {
            console.error('Error fetching purchase order by ID:', error);
            throw error;
        }
    },

    // Get all offers pending finance review
    getPendingOffers: async () => {
        try {
            const response = await apiClient.get(PURCHASE_ORDER_ENDPOINTS.PENDING_OFFERS);
            return response.data || response;
        } catch (error) {
            console.error('Error fetching pending offers:', error);
            throw error;
        }
    },

    // Get purchase order for an offer
    getPurchaseOrderForOffer: async (offerId) => {
        try {
            const response = await apiClient.get(PURCHASE_ORDER_ENDPOINTS.BY_OFFER(offerId));
            return response.data || response;
        } catch (error) {
            console.error('Error fetching purchase order for offer:', error);
            throw error;
        }
    },

    // Update purchase order status
    updateStatus: async (id, status) => {
        try {
            const response = await apiClient.put(PURCHASE_ORDER_ENDPOINTS.UPDATE_STATUS(id), null, {
                params: { status }
            });
            return response.data || response;
        } catch (error) {
            console.error('Error updating purchase order status:', error);
            throw error;
        }
    },

    // Finalize offer and create purchase order
    finalizeOffer: async (offerId, finalizedItemIds) => {
        try {
            const response = await apiClient.post(PURCHASE_ORDER_ENDPOINTS.FINALIZE_OFFER(offerId), {
                finalizedItemIds: finalizedItemIds
            });
            return response.data || response;
        } catch (error) {
            console.error('Error finalizing offer:', error);
            throw error;
        }
    },

    // Process delivery with received items and issues
    processDelivery: async (purchaseOrderId, deliveryData) => {
        try {
            console.log('Processing delivery for PO:', purchaseOrderId);
            console.log('Delivery data:', deliveryData);

            const response = await apiClient.post(
                `${PURCHASE_ORDER_ENDPOINTS.BASE}/${purchaseOrderId}/process-delivery`,
                deliveryData
            );

            console.log('Process delivery response:', response);
            return response.data || response;
        } catch (error) {
            console.error('Error processing delivery:', error);
            throw error;
        }
    },

    // Resolve issues for purchase order - NEW VERSION (supports multiple resolutions)
    resolveIssues: async (purchaseOrderId, resolutions) => {
        try {
            console.log('Resolving issues for PO:', purchaseOrderId);
            console.log('Resolutions:', resolutions);

            const response = await apiClient.post(
                `${PURCHASE_ORDER_ENDPOINTS.BASE}/${purchaseOrderId}/resolve-issues`,
                { resolutions }
            );

            console.log('Resolve issues response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error resolving issues:', error);
            throw error.response?.data || error;
        }
    },

    // Get all issues for a purchase order
    getIssues: async (purchaseOrderId) => {
        try {
            const response = await apiClient.get(
                PURCHASE_ORDER_ENDPOINTS.GET_ISSUES(purchaseOrderId)
            );
            return response.data || response;
        } catch (error) {
            console.error('Error fetching issues:', error);
            throw error;
        }
    },

    // Get active (unresolved) issues for a purchase order
    getActiveIssues: async (purchaseOrderId) => {
        try {
            const response = await apiClient.get(
                PURCHASE_ORDER_ENDPOINTS.GET_ACTIVE_ISSUES(purchaseOrderId)
            );
            return response.data || response;
        } catch (error) {
            console.error('Error fetching active issues:', error);
            throw error;
        }
    },

    // ← ADD THIS NEW METHOD HERE
    // Get delivery history for a purchase order item
    getDeliveryHistory: async (purchaseOrderItemId) => {
        try {
            const response = await apiClient.get(
                PURCHASE_ORDER_ENDPOINTS.GET_DELIVERY_HISTORY(purchaseOrderItemId)
            );
            return response.data || response;
        } catch (error) {
            console.error('Error fetching delivery history:', error);
            throw error;
        }
    },

    // Get pending purchase orders (client-side filtering)
    getPending: async () => {
        try {
            const allOrders = await purchaseOrderService.getAll();
            return allOrders.filter(po => po.status !== 'COMPLETED' && po.status !== 'VALIDATED');
        } catch (error) {
            console.error('Error fetching pending purchase orders:', error);
            throw error;
        }
    },

    // Get validated purchase orders (client-side filtering)
    getValidated: async () => {
        try {
            const allOrders = await purchaseOrderService.getAll();
            return allOrders.filter(po => po.status === 'VALIDATED');
        } catch (error) {
            console.error('Error fetching validated purchase orders:', error);
            throw error;
        }
    },

    // Get completed purchase orders (client-side filtering)
    getCompleted: async () => {
        try {
            const allOrders = await purchaseOrderService.getAll();
            return allOrders.filter(po => po.status === 'COMPLETED');
        } catch (error) {
            console.error('Error fetching completed purchase orders:', error);
            throw error;
        }
    },

    // Utility functions
    utils: {
        // Get status display name
        getStatusDisplay: (status) => {
            const statusMap = {
                'CREATED': 'Created',
                'PENDING': 'Pending',
                'VALIDATED': 'Validated',
                'PARTIALLY_RECEIVED': 'Partially Received',
                'COMPLETED': 'Completed',
                'CANCELLED': 'Cancelled',
                'DISPUTED': 'Disputed' // ← ADD THIS
            };
            return statusMap[status] || status;
        },

        // Get status color for UI
        getStatusColor: (status) => {
            const colorMap = {
                'CREATED': '#6b7280',      // Gray
                'PENDING': '#f59e0b',      // Amber
                'VALIDATED': '#3b82f6',    // Blue
                'PARTIAL': '#f97316',      // Orange
                'PARTIALLY_RECEIVED': '#f97316', // Orange
                'COMPLETED': '#10b981',    // Green
                'CANCELLED': '#ef4444',    // Red
                'DISPUTED': '#ef4444'      // Red ← ADD THIS
            };
            return colorMap[status] || '#6b7280';
        },

        // Get total price from purchase order
        getTotalPrice: (purchaseOrder) => {
            return purchaseOrder.totalAmount || 0;
        },

        // Format date for display
        formatDate: (dateString) => {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleDateString('en-GB');
        },

        // Format currency
        formatCurrency: (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount || 0);
        },

        // Filter purchase orders by search query
        filterBySearch: (purchaseOrders, searchQuery) => {
            if (!searchQuery) return purchaseOrders;

            const query = searchQuery.toLowerCase();
            return purchaseOrders.filter(po => {
                const poNumber = (po.poNumber || '').toLowerCase();
                const requester = (po.requestOrder?.requesterName || '').toLowerCase();
                const title = (po.requestOrder?.title || '').toLowerCase();
                const createdBy = (po.createdBy || '').toLowerCase();

                return poNumber.includes(query) ||
                    requester.includes(query) ||
                    title.includes(query) ||
                    createdBy.includes(query);
            });
        },

        // Sort purchase orders
        sortPurchaseOrders: (purchaseOrders, sortBy, direction = 'desc') => {
            return [...purchaseOrders].sort((a, b) => {
                let aValue = a[sortBy];
                let bValue = b[sortBy];

                // Handle nested properties
                if (sortBy.includes('.')) {
                    const keys = sortBy.split('.');
                    aValue = keys.reduce((obj, key) => obj?.[key], a);
                    bValue = keys.reduce((obj, key) => obj?.[key], b);
                }

                // Handle null/undefined values
                if (aValue == null) aValue = '';
                if (bValue == null) bValue = '';

                // Handle dates
                if (sortBy.includes('At') || sortBy.includes('Date')) {
                    aValue = new Date(aValue).getTime() || 0;
                    bValue = new Date(bValue).getTime() || 0;
                }

                // Handle numbers
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return direction === 'desc' ? bValue - aValue : aValue - bValue;
                }

                // Handle strings
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (direction === 'desc') {
                    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
                } else {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                }
            });
        },

        // Get purchase order statistics
        getStatistics: (purchaseOrders) => {
            const stats = {
                total: purchaseOrders.length,
                totalValue: 0,
                byStatus: {},
                averageValue: 0
            };

            purchaseOrders.forEach(po => {
                // Calculate total value
                stats.totalValue += purchaseOrderService.utils.getTotalPrice(po);

                // Count by status
                const status = po.status || 'UNKNOWN';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            });

            // Calculate average
            stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

            return stats;
        }
    },
    // Get items pending redelivery
    getItemsPendingRedelivery: async (purchaseOrderId) => {
        try {
            const response = await api.get(PURCHASE_ORDER_ENDPOINTS.GET_PENDING_REDELIVERY(purchaseOrderId));
            return response.data;
        } catch (error) {
            console.error('Error fetching pending redeliveries:', error);
            throw error;
        }
    },

// Process a redelivery
    processRedelivery: async (purchaseOrderId, issueIds, deliveryData) => {
        try {
            const response = await api.post(
                PURCHASE_ORDER_ENDPOINTS.PROCESS_REDELIVERY(purchaseOrderId),
                {
                    issueIds: issueIds,
                    items: deliveryData.items,
                    generalNotes: deliveryData.generalNotes
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error processing redelivery:', error);
            throw error;
        }
    },
};