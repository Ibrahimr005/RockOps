import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService.js';
import PendingPurchaseOrders from './PendingPurchaseOrders/PendingPurchaseOrders.jsx';
import ValidatedPurchaseOrders from './CompletedPurchaseOrders/ValidatedPurchaseOrders.jsx';
import DisputedPurchaseOrders from './DisputedPurchaseOrders/DisputedPurchaseOrders.jsx'; // NEW
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

    const getTabStats = () => {
        if (activeTab === 'pending') {
            const pendingOrders = allPurchaseOrders.filter(order =>
                order.status === 'PENDING' ||
                order.status === 'CREATED' ||
                order.status === 'DRAFT'
            );

            return [
                {
                    value: pendingOrders.length,
                    label: 'Pending Orders'
                }
            ];
        } else if (activeTab === 'validated') {
            const validatedOrders = allPurchaseOrders.filter(order =>
                order.status === 'VALIDATED' ||
                order.status === 'APPROVED' ||
                order.status === 'DELIVERED'
            );

            return [
                {
                    value: validatedOrders.length,
                    label: 'Validated Orders'
                }
            ];
        } else if (activeTab === 'disputed') { // NEW
            const disputedOrders = allPurchaseOrders.filter(order =>
                order.status === 'DISPUTED'
            );

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

    return (
        <div className="purchase-orders-container">
            <PageHeader
                title="Purchase Orders"
                subtitle="Manage and track all purchase orders across your procurement workflow"
            />

            {/* Tabs - UPDATED with Disputed tab */}
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
                <button
                    className={`tab ${activeTab === 'disputed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('disputed')}
                >
                    Disputed Orders
                    {allPurchaseOrders.filter(order => order.status === 'DISPUTED').length > 0 && (
                        <span className="tab-badge">
                            {allPurchaseOrders.filter(order => order.status === 'DISPUTED').length}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab Content - UPDATED */}
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
                {activeTab === 'disputed' && (
                    <DisputedPurchaseOrders
                        onDataChange={handleDataChange}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};

export default PurchaseOrders;