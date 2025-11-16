import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService.js';
import PendingPurchaseOrders from './PendingPurchaseOrders/PendingPurchaseOrders.jsx';
import CompletedPurchaseOrders from './CompletedPurchaseOrders/CompletedPurchaseOrders.jsx';
import DisputedPurchaseOrders from './DisputedPurchaseOrders/DisputedPurchaseOrders.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import "./PurchaseOrders.scss";

const PurchaseOrders = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');
    const [allPurchaseOrders, setAllPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPurchaseOrders();
    }, []);

    const fetchPurchaseOrders = async () => {
        try {
            setLoading(true);
            const data = await purchaseOrderService.getAll();
            setAllPurchaseOrders(data);
        } catch (err) {
            console.error('Error fetching purchase orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const stats = purchaseOrderService.utils.getStatistics(allPurchaseOrders);

    const handleDataChange = () => {
        fetchPurchaseOrders();
    };

    // Filter orders by tab
    const getPendingOrders = () => {
        return allPurchaseOrders.filter(order =>
            order.status === 'PENDING' ||
            order.status === 'CREATED' ||
            order.status === 'PARTIALLY_RECEIVED'
        );
    };

    const getDisputedOrders = () => {
        return allPurchaseOrders.filter(order =>
            order.status === 'DISPUTED'
        );
    };

    const getCompletedOrders = () => {
        return allPurchaseOrders.filter(order =>
            order.status === 'COMPLETED' ||
            order.status === 'CANCELLED'
        );
    };

    const getTabStats = () => {
        if (activeTab === 'pending') {
            const pendingOrders = getPendingOrders();
            return [
                {
                    value: pendingOrders.length,
                    label: 'Pending Orders'
                }
            ];
        } else if (activeTab === 'completed') {
            const completedOrders = getCompletedOrders();
            return [
                {
                    value: completedOrders.length,
                    label: 'Completed Orders'
                }
            ];
        } else if (activeTab === 'disputed') {
            const disputedOrders = getDisputedOrders();
            return [
                {
                    value: disputedOrders.length,
                    label: 'Disputed Orders'
                }
            ];
        }

        return [
            {
                value: stats.total,
                label: 'Total Orders'
            }
        ];
    };

    const pendingCount = getPendingOrders().length;
    const disputedCount = getDisputedOrders().length;
    const completedCount = getCompletedOrders().length;

    return (
        <div className="purchase-orders-container">
            <PageHeader
                title="Purchase Orders"
                subtitle="Manage and track all purchase orders across your procurement workflow"
            />

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Orders
                    {pendingCount > 0 && (
                        <span className="tab-badge">{pendingCount}</span>
                    )}
                </button>
                <button
                    className={`tab ${activeTab === 'disputed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('disputed')}
                >
                    Disputed Orders
                    {disputedCount > 0 && (
                        <span className="tab-badge disputed">{disputedCount}</span>
                    )}
                </button>
                <button
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed Orders
                    {completedCount > 0 && (
                        <span className="tab-badge completed">{completedCount}</span>
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content-po">
                {activeTab === 'pending' && (
                    <PendingPurchaseOrders
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
                {activeTab === 'disputed' && (
                    <DisputedPurchaseOrders
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
                {activeTab === 'completed' && (
                    <CompletedPurchaseOrders
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};

export default PurchaseOrders;