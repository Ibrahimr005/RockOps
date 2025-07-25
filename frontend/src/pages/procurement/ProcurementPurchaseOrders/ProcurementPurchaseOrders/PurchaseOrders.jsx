import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiSearch, FiCheckCircle } from 'react-icons/fi';
import "./PurchaseOrders.scss";
import offersImage from "../../../../assets/imgs/pro_icon.png";
import { purchaseOrderService } from '../../../../services/purchaseOrderService';

const PurchaseOrders = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // Default to pending tab
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchPurchaseOrders();
    }, [activeTab]);

    const fetchPurchaseOrders = async () => {
        try {
            setLoading(true);

            // Using the service to get all purchase orders
            const response = await purchaseOrderService.getAll();
            const data = response.data;

            // Filter the purchase orders based on status in the client side
            let filteredData;
            if (activeTab === 'pending') {
                // Filter for pending orders (status is not COMPLETED)
                filteredData = data.filter(po => po.status !== 'COMPLETED');
            } else {
                // Filter for completed orders
                filteredData = data.filter(po => po.status === 'COMPLETED');
            }

            setPurchaseOrders(filteredData);
        } catch (err) {
            console.error('Error fetching purchase orders:', err);
            setError('Failed to load purchase orders. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const getTotalPrice = (po) => {
        return po.totalAmount || 0;
    };

    const renderStatusBadge = (status) => {
        let statusClass = '';

        switch (status) {
            case 'CREATED':
                statusClass = 'status-created';
                break;
            case 'PENDING':
                statusClass = 'status-pending';
                break;
            case 'PARTIALLY_RECEIVED':
                statusClass = 'status-partially_received';
                break;
            case 'COMPLETED':
                statusClass = 'status-completed';
                break;
            case 'CANCELLED':
                statusClass = 'status-cancelled';
                break;
            default:
                statusClass = 'status-default';
        }

        return <span className={`status-badge ${statusClass}`}>{status.replace(/_/g, ' ')}</span>;
    };

    const getTabLabel = () => {
        return activeTab === 'pending' ? 'Pending Purchase Orders' : 'Completed Purchase Orders';
    };

    const getTabDescription = () => {
        return activeTab === 'pending'
            ? '(Purchase orders with items not yet received)'
            : '(Purchase orders with all items received)';
    };

    // Function to format date without date-fns dependency
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    };

    // Navigate to purchase order details page
    const handleRowClick = (purchaseOrderId) => {
        navigate(`/procurement/purchase-orders/${purchaseOrderId}`);
    };

    // Filter purchase orders based on search query
    const filteredPurchaseOrders = purchaseOrders.filter(po => {
        const poNumber = po.poNumber?.toLowerCase() || '';
        const requester = po.requestOrder?.requesterName?.toLowerCase() || '';
        const title = po.requestOrder?.title?.toLowerCase() || '';
        const searchText = searchQuery.toLowerCase();

        return poNumber.includes(searchText) ||
            requester.includes(searchText) ||
            title.includes(searchText);
    });

    // Calculate min-height for table card based on whether there are any orders
    const tableMinHeight = filteredPurchaseOrders.length === 0 ? '300px' : 'auto';

    return (
        <div className="purchase-orders-container">
            {/* Procurement Intro Card */}
            <div className="procurement-intro-card">
                <div className="procurement-intro-left">
                    <img
                        src={offersImage}
                        alt="Purchase Orders"
                        className="procurement-intro-image"
                    />
                </div>

                <div className="procurement-intro-content">
                    <div className="procurement-intro-header">
                        <span className="procurement-label">PROCUREMENT CENTER</span>
                        <h2 className="procurement-intro-title">Purchase Orders</h2>
                    </div>

                    <div className="procurement-stats">
                        <div className="procurement-stat-item">
                            <span className="procurement-stat-value">{purchaseOrders.length}</span>
                            <span className="procurement-stat-label">{getTabLabel()}</span>
                        </div>
                        <div className="procurement-stat-item">
                            <span className="procurement-stat-value">
                                ${purchaseOrders.reduce((total, po) => total + getTotalPrice(po), 0).toFixed(2)}
                            </span>
                            <span className="procurement-stat-label">Total Value</span>
                        </div>
                    </div>
                </div>

                <div className="procurement-intro-right">
                    <button
                        className="procurement-back-button"
                        onClick={() => navigate('/procurement/offers')}
                    >
                        <FiChevronRight className="icon-rotate-180" /> Back to Offers
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Orders
                </button>
                <button
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed Orders
                </button>
            </div>

            {/* Search and Table Header */}
            <div className="purchase-orders-section-description">
                <div className="purchase-orders-left-section">
                    <p>{getTabDescription()}</p>
                </div>
                <div className="purchase-orders-right-section">
                    <div style={{ position: 'relative' }}>
                        <FiSearch className="purchase-orders-search-icon" />
                        <input
                            type="text"
                            placeholder="Search purchase orders..."
                            className="purchase-orders-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table with conditional min-height */}
            <div
                className="purchase-orders-table-card"
                style={{ minHeight: tableMinHeight, position: 'relative' }}
            >
                {loading ? (
                    <div className="purchase-orders-loading-container">
                        <div className="purchase-orders-loading-spinner"></div>
                        <p>Loading purchase orders...</p>
                    </div>
                ) : error ? (
                    <div className="purchase-orders-error-container">
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="purchase-orders-table-body">
                        {/* Table Header - Always shown */}
                        <div className="purchase-orders-header-row">
                            <div className="purchase-orders-header-cell">PO NUMBER</div>
                            <div className="purchase-orders-header-cell">REQUESTER</div>
                            <div className="purchase-orders-header-cell">DEADLINE</div>
                            <div className="purchase-orders-header-cell">EXPECTED DELIVERY</div>
                            <div className="purchase-orders-header-cell">CREATED AT</div>
                        </div>

                        {/* Table Rows or Empty State */}
                        {filteredPurchaseOrders.length > 0 ? (
                            /* Table Rows - when data exists */
                            filteredPurchaseOrders.map((po) => (
                                <div
                                    className="purchase-orders-table-row clickable-row"
                                    key={po.id}
                                    onClick={() => handleRowClick(po.id)}
                                >
                                    <div className="purchase-orders-table-cell">{po.poNumber || '-'}</div>
                                    <div className="purchase-orders-table-cell">{po.requestOrder?.requesterName || '-'}</div>
                                    <div className="purchase-orders-table-cell">{formatDate(po.requestOrder?.deadline) || '-'}</div>
                                    <div className="purchase-orders-table-cell">{formatDate(po.expectedDeliveryDate)}</div>
                                    <div className="purchase-orders-table-cell">{formatDate(po.createdAt)}</div>
                                </div>
                            ))
                        ) : (
                            /* Empty state positioned absolutely for proper centering */
                            <div className="purchase-orders-empty-state">
                                <div className="purchase-orders-empty-icon">
                                    <FiCheckCircle />
                                </div>
                                <h3>No purchase orders found</h3>
                                <p>
                                    {activeTab === 'pending'
                                        ? 'No pending purchase orders. All items have been received.'
                                        : 'No completed purchase orders found.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrders;