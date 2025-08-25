import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService.js';
import PendingPurchaseOrders from './PendingPurchaseOrders/PendingPurchaseOrders.jsx';
import ValidatedPurchaseOrders from './ValidatedPurchaseOrders/ValidatedPurchaseOrders.jsx';
import IntroCard from '../../../components/common/IntroCard/IntroCard.jsx';
import "./PurchaseOrders.scss";
import offersImage from "../../../assets/imgs/pro_icon.png";
// Import dark mode image if available
 import offersImageDark from "../../../assets/imgs/pro_icon_dark.png";

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

    // Prepare stats for IntroCard
    const introStats = [
        {
            value: stats.total,
            label: 'Total Orders'
        },

    ];

    return (
        <div className="purchase-orders-container">
            {/* Updated Intro Card */}
            <IntroCard
                title="Purchase Orders"
                label="PROCUREMENT CENTER"
                lightModeImage={offersImage}
                darkModeImage={offersImageDark} // Uncomment if dark mode image is available
                stats={introStats}
                icon={false}
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
                    Validated Orders
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
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