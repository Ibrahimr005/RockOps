import React, { useState, useEffect, useRef } from 'react';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService';
import PendingPurchaseOrders from './PendingPurchaseOrders/PendingPurchaseOrders';
import DisputedPurchaseOrders from './DisputedPurchaseOrders/DisputedPurchaseOrders';
import CompletedPurchaseOrders from './CompletedPurchaseOrders/CompletedPurchaseOrders';
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import './WarehousePurchaseOrders.scss';

const WarehousePurchaseOrders = ({ warehouseId, onAddButtonClick }) => {
    const [activeTab, setActiveTab] = useState('awaiting');
    const [allOrders, setAllOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userRole, setUserRole] = useState("");
    const pendingOrdersRef = useRef(null);

    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Tab configuration
    const tabs = [
        { id: "awaiting", label: "Awaiting Delivery", component: PendingPurchaseOrders },
        { id: "disputed", label: "Issues Reported", component: DisputedPurchaseOrders },
        { id: "completed", label: "Completed", component: CompletedPurchaseOrders }
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

    // Fetch all purchase orders for this warehouse
    useEffect(() => {
        if (warehouseId) {
            fetchPurchaseOrders();
        }
    }, [warehouseId]);

    const fetchPurchaseOrders = async () => {
        setIsLoading(true);
        try {
            const allPOs = await purchaseOrderService.getAll();

            // Filter only orders for this warehouse
            const warehouseOrders = allPOs.filter(order =>
                order.requestOrder?.requesterId === warehouseId

            );
            console.log('All poooooooososooss:', JSON.stringify(allPOs, null, 2));

            setAllOrders(warehouseOrders);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            setAllOrders([]);
            showSnackbar('Failed to fetch purchase orders.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

// Filter orders by status for each tab
    const awaitingOrders = allOrders.filter(order =>
        order.status === 'PENDING' ||
        order.status === 'PROCESSING' ||
        order.status === 'SHIPPED' ||
        order.status === 'PARTIAL' ||
        order.status === 'PARTIAL_DISPUTED' // ADD THIS LINE
    );

    const disputedOrders = allOrders.filter(order =>
        order.status === 'DISPUTED' ||
        order.status === 'PARTIAL_DISPUTED' // ADD THIS LINE
    );

    const completedOrders = allOrders.filter(order =>
        order.status === 'COMPLETED'
    );

    console.log('=== WAREHOUSE PURCHASE ORDERS ===');
    console.log('All Orders:', JSON.stringify(allOrders, null, 2));
    console.log('Awaiting Orders (PENDING + DISPUTED):', JSON.stringify(awaitingOrders, null, 2));
    console.log('Disputed Orders (DISPUTED only):', JSON.stringify(disputedOrders, null, 2));
    console.log('Completed Orders:', JSON.stringify(completedOrders, null, 2));
    console.log('================================');


    useEffect(() => {
        if (onAddButtonClick && pendingOrdersRef.current) {
            onAddButtonClick(() => {
                setActiveTab('awaiting');
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
        if (activeTab === 'awaiting') {
            return (
                <PendingPurchaseOrders
                    ref={pendingOrdersRef}
                    orders={awaitingOrders}
                    isLoading={isLoading}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        if (activeTab === 'disputed') {
            return (
                <DisputedPurchaseOrders
                    orders={disputedOrders}
                    isLoading={isLoading}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        if (activeTab === 'completed') {
            return (
                <CompletedPurchaseOrders
                    orders={completedOrders}
                    isLoading={isLoading}
                    onShowSnackbar={showSnackbar}
                    userRole={userRole}
                />
            );
        }

        return null;
    };

    return (
        <div className="warehouse-purchase-orders-container">
            {/* Tab navigation */}
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

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