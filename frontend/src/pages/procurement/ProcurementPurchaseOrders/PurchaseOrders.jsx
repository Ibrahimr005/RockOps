import React, { useState, useEffect } from 'react';
import { useNavigate,useLocation } from 'react-router-dom';

import { FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService.js';
import PendingPurchaseOrders from './PendingPurchaseOrders/PendingPurchaseOrders.jsx';
import CompletedPurchaseOrders from './CompletedPurchaseOrders/CompletedPurchaseOrders.jsx';
import DisputedPurchaseOrders from './DisputedPurchaseOrders/DisputedPurchaseOrders.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
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

            // ADD THESE LOGS
            console.log('=== ALL PURCHASE ORDERS FROM API ===');
            console.log(data);
            console.log('Purchase Order Statuses:', data.map(po => ({
                poNumber: po.poNumber,
                status: po.status
            })));

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

    const getPendingOrders = () => {
        const pending = allPurchaseOrders.filter(order =>
            order.status !== 'DISPUTED' &&
            order.status !== 'COMPLETED' &&
            order.status !== 'CANCELLED'
        );

        // ADD THIS LOG
        console.log('=== PENDING ORDERS ===', pending.map(o => ({ poNumber: o.poNumber, status: o.status })));
        return pending;
    };

    const getDisputedOrders = () => {
        const disputed = allPurchaseOrders.filter(order =>
            order.status === 'DISPUTED'
        );

        // ADD THIS LOG
        console.log('=== DISPUTED ORDERS ===', disputed.map(o => ({ poNumber: o.poNumber, status: o.status })));
        return disputed;
    };

    const getCompletedOrders = () => {
        return allPurchaseOrders.filter(order =>
            order.status === 'COMPLETED' ||
            order.status === 'CANCELLED'
        );
    };

    const pendingCount = getPendingOrders().length;
    const disputedCount = getDisputedOrders().length;
    const completedCount = getCompletedOrders().length;

    // Tabs configuration
    const tabsConfig = [
        {
            id: 'pending',
            label: 'Awaiting Delivery',
            icon: <FiClock />,
            badge: 0
        },
        {
            id: 'disputed',
            label: 'Issues to Resolve',
            icon: <FiAlertCircle />,
            badge: disputedCount,
            badgeVariant: 'disputed'
        },
        {
            id: 'completed',
            label: 'Completed',
            icon: <FiCheckCircle />,
            badge: 0
        }
    ];

    return (
        <div className="purchase-orders-container">
            <PageHeader
                title="Purchase Orders"
                subtitle="Manage and track all purchase orders across your procurement workflow"
            />

            {/* Tabs */}
            <Tabs
                tabs={tabsConfig}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <div className="tab-content-po">
                {activeTab === 'pending' && (
                    <PendingPurchaseOrders
                        purchaseOrders={getPendingOrders()} // Pass filtered data
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
                {activeTab === 'disputed' && (
                    <DisputedPurchaseOrders
                        purchaseOrders={getDisputedOrders()} // Pass filtered data
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
                {activeTab === 'completed' && (
                    <CompletedPurchaseOrders
                        purchaseOrders={getCompletedOrders()} // Pass filtered data
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};

export default PurchaseOrders;