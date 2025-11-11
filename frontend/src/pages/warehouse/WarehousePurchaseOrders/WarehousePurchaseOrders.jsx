import React, { useState, useEffect, useRef } from 'react';
// You will need to create these components
import PendingPurchaseOrders from './PendingPurchaseOrders/PendingPurchaseOrders';
import PartialPurchaseOrders from './PartialPurchaseOrders/PartialPurchaseOrders';
import DisputedPurchaseOrders from './DisputedPurchaseOrders/DisputedPurchaseOrders';
import CompletedPurchaseOrders from './CompletedPurchaseOrders/CompletedPurchaseOrders';
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import './WarehousePurchaseOrders.scss';

const WarehousePurchaseOrders = ({ warehouseId, onAddButtonClick }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [userRole, setUserRole] = useState("");
    const pendingOrdersRef = useRef(null);

    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Tab configuration with the NEW "disputed" tab
    const tabs = [
        { id: "pending", label: "Pending Orders", component: PendingPurchaseOrders },
        { id: "partial", label: "Partial Orders", component: PartialPurchaseOrders },
        { id: "disputed", label: "Disputed Orders", component: DisputedPurchaseOrders }, // NEW TAB
        { id: "completed", label: "Completed Orders", component: CompletedPurchaseOrders }
    ];

    // Get user role from localStorage
    useEffect(() => {
        try {
            const userInfoString = localStorage.getItem("userInfo");
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                setUserRole(userInfo.role);
            }
        } catch (error) {
            console.error("Error parsing user info:", error);
        }
    }, []);

    // Function to trigger refresh across components
    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        if (onAddButtonClick && pendingOrdersRef.current) {
            onAddButtonClick(() => {
                setActiveTab('pending');
                setTimeout(() => {
                    if (pendingOrdersRef.current && pendingOrdersRef.current.handleAddPurchaseOrder) {
                        pendingOrdersRef.current.handleAddPurchaseOrder();
                    }
                }, 100);
            });
        }
    }, [onAddButtonClick]);

    // Function to show snackbar
    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // Function to hide snackbar
    const hideSnackbar = () => {
        setShowNotification(false);
    };

    // Render the active tab content
    const renderActiveTabContent = () => {
        if (activeTab === 'pending') {
            return (
                <PendingPurchaseOrders
                    ref={pendingOrdersRef}
                    warehouseId={warehouseId}
                    refreshTrigger={refreshTrigger}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        if (activeTab === 'partial') {
            return (
                <PartialPurchaseOrders
                    warehouseId={warehouseId}
                    refreshTrigger={refreshTrigger}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        if (activeTab === 'disputed') {
            return (
                <DisputedPurchaseOrders
                    warehouseId={warehouseId}
                    refreshTrigger={refreshTrigger}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        if (activeTab === 'completed') {
            return (
                <CompletedPurchaseOrders
                    warehouseId={warehouseId}
                    refreshTrigger={refreshTrigger}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        return null;
    };

    return (
        <div className="warehouse-purchase-orders-container">
            {/* Tab navigation with the correct class names */}
            <div className="inventory-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`inventory-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="purchase-orders-tab-content">
                {renderActiveTabContent()}
            </div>

            {/* Snackbar Notification */}
            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={hideSnackbar}
                duration={3000}
            />
        </div>
    );
};

export default WarehousePurchaseOrders;