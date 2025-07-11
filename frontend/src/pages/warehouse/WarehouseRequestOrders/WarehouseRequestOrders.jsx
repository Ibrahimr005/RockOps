import React, { useState, useEffect, useRef } from 'react';
import PendingRequestOrders from './PendingRequestOrders/PendingRequestOrders';
import ValidatedRequestOrders from './ValidatedRequestOrders/ValidatedRequestOrders';
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import './WarehouseRequestOrders.scss';

const WarehouseRequestOrders = ({ warehouseId, onAddButtonClick, restockItems, shouldOpenRestockModal }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [userRole, setUserRole] = useState("");
    const pendingOrdersRef = useRef(null);

    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Tab configuration
    const tabs = [
        { id: "pending", label: "Pending Requests", component: PendingRequestOrders },
        { id: "validated", label: "Validated Requests", component: ValidatedRequestOrders }
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

    // Handle restock modal opening
    // REPLACE the restock modal useEffect:
    useEffect(() => {
        if (shouldOpenRestockModal && restockItems && pendingOrdersRef.current) {
            // Switch to pending tab first
            setActiveTab('pending');

            // Small delay to ensure tab switch is complete
            setTimeout(() => {
                if (pendingOrdersRef.current && pendingOrdersRef.current.openRestockModal) {
                    pendingOrdersRef.current.openRestockModal(restockItems);
                }
            }, 100);
        }
    }, [shouldOpenRestockModal, restockItems]);

// REPLACE the add function useEffect:
    useEffect(() => {
        if (onAddButtonClick && pendingOrdersRef.current) {
            onAddButtonClick(() => {
                setActiveTab('pending');
                setTimeout(() => {
                    if (pendingOrdersRef.current && pendingOrdersRef.current.handleAddRequest) {
                        pendingOrdersRef.current.handleAddRequest();
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

// FINAL VERSION of renderActiveTabContent:
    const renderActiveTabContent = () => {
        if (activeTab === 'pending') {
            return (
                <PendingRequestOrders
                    ref={pendingOrdersRef}
                    warehouseId={warehouseId}
                    refreshTrigger={refreshTrigger}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        if (activeTab === 'validated') {
            return (
                <ValidatedRequestOrders
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
        <div className="warehouse-request-orders-container">


            {/* Tab navigation */}
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
            <div className="request-orders-tab-content">
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

export default WarehouseRequestOrders;