import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService.js';
import PendingPurchaseOrders from './PendingPurchaseOrders/PendingPurchaseOrders.jsx';
import ValidatedPurchaseOrders from './ValidatedPurchaseOrders/ValidatedPurchaseOrders.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import "./PurchaseOrders.scss";

const PurchaseOrders = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending'); // Default to pending tab
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

    // Calculate statistics
    const stats = purchaseOrderService.utils.getStatistics(allPurchaseOrders);

    // Function to refresh data (passed to child components)
    const handleDataChange = () => {
        fetchPurchaseOrders();
    };

    // Calculate tab-specific stats
    const getTabStats = () => {
        if (activeTab === 'pending') {
            // Filter pending orders (adjust status values based on your data)
            const pendingOrders = allPurchaseOrders.filter(order =>
                order.status === 'PENDING' ||
                order.status === 'CREATED' ||
                order.status === 'DRAFT'
            );

            const totalValue = pendingOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            return [
                {
                    value: pendingOrders.length,
                    label: 'Pending Orders'
                }
            ];
        } else if (activeTab === 'validated') {
            // Filter validated orders
            const validatedOrders = allPurchaseOrders.filter(order =>
                order.status === 'VALIDATED' ||
                order.status === 'APPROVED' ||
                order.status === 'DELIVERED'
            );

            const totalValue = validatedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            return [
                {
                    value: validatedOrders.length,
                    label: 'Validated Orders'
                }
            ];
        }

        // Default fallback
        return [
            {
                value: stats.total,
                label: 'Total Orders'
            }
        ];
    };

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
                </button>
                <button
                    className={`tab ${activeTab === 'validated' ? 'active' : ''}`}
                    onClick={() => setActiveTab('validated')}
                >
                    Completed Orders
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
                {activeTab === 'validated' && (
                    <ValidatedPurchaseOrders
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};

export default PurchaseOrders;