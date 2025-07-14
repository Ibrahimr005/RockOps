import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactions.scss";
import EquipmentPendingTransactionsTable from "./EquipmentPendingTransactionsTable.jsx";
import EquipmentValidatedTransactionsTable from "./EquipmentValidatedTransactionsTable.jsx";
import EquipmentIncomingTransactionsTable from "./EquipmentIncomingTransactionsTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2";

const UnifiedTransactionsView = forwardRef(({ 
    entityId, // equipmentId
    entityType = 'EQUIPMENT',
    onAcceptTransaction,
    onRejectTransaction,
    onUpdateTransaction
}, ref) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [allTransactions, setAllTransactions] = useState([]);
    const [pendingTransactions, setPendingTransactions] = useState([]);

    // Tab state
    const [activeTab, setActiveTab] = useState("pending");
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Snackbar states
    const [snackbar, setSnackbar] = useState({
        isVisible: false,
        type: 'success',
        text: ''
    });

    // Tab configuration - exactly like warehouse
    const tabs = [
        { id: "pending", label: "Pending Transactions", component: EquipmentPendingTransactionsTable },
        { id: "incoming", label: "Incoming Transactions", component: EquipmentIncomingTransactionsTable },
        { id: "validated", label: "Validated Transactions", component: EquipmentValidatedTransactionsTable }
    ];

    // Function to show snackbar
    const showSnackbar = (type, text) => {
        setSnackbar({
            isVisible: true,
            type,
            text
        });
    };

    // Function to hide snackbar
    const hideSnackbar = () => {
        setSnackbar(prev => ({
            ...prev,
            isVisible: false
        }));
    };

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Expose refresh methods to parent
    useImperativeHandle(ref, () => ({
        refreshTransactions: fetchTransactions,
        refreshLogs: fetchTransactions
    }));

    useEffect(() => {
        fetchTransactions();
    }, [entityId]);

    // Process and categorize transactions after data is loaded
    useEffect(() => {
        if (allTransactions.length > 0) {
            const pending = allTransactions.filter(
                transaction =>
                    transaction.status === "PENDING" &&
                    transaction.receiverId === entityId
            );

            setPendingTransactions(pending);
        }
    }, [allTransactions, entityId]);

    const fetchTransactions = async () => {
        if (!entityId) {
            console.error("Equipment ID is not available");
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/equipment/${entityId}/transactions`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const updatedData = await Promise.all(
                    data.map(async (transaction) => {
                        const sender = await fetchEntitiesByType(transaction.senderType);
                        const receiver = await fetchEntitiesByType(transaction.receiverType);
                        return {
                            ...transaction,
                            sender: sender.find(item => item.id === transaction.senderId),
                            receiver: receiver.find(item => item.id === transaction.receiverId)
                        };
                    })
                );
                setAllTransactions(updatedData);
            } else {
                console.error("Failed to fetch transactions, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEntitiesByType = async (entityType) => {
        if (!entityType) return [];

        try {
            const token = localStorage.getItem("token");
            let endpoint;

            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses`;
            } else if (entityType === "SITE") {
                endpoint = `http://localhost:8080/api/v1/sites`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/api/equipment`;
            } else {
                endpoint = `http://localhost:8080/api/v1/${entityType.toLowerCase()}s`;
            }

            const response = await fetch(endpoint, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                console.error(`Failed to fetch ${entityType}, status:`, response.status);
                return [];
            }
        } catch (error) {
            console.error(`Failed to fetch ${entityType}:`, error);
            return [];
        }
    };

    // Render the active tab content
    const renderActiveTabContent = () => {
        const activeTabConfig = tabs.find(tab => tab.id === activeTab);
        if (!activeTabConfig) return null;

        const TabComponent = activeTabConfig.component;
        return <TabComponent equipmentId={entityId} refreshTrigger={refreshTrigger} />;
    };

    return (
        <div className="warehouse-view3">
            {/* Snackbar Component */}
            <Snackbar
                type={snackbar.type}
                text={snackbar.text}
                isVisible={snackbar.isVisible}
                onClose={hideSnackbar}
                duration={4000}
            />

            {/* Header with count and search */}
            <div className="header-container4">
                <div className="left-section4">
                </div>
            </div>

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
            <div className="transaction-tab-content">
                {renderActiveTabContent()}
            </div>
        </div>
    );
});

export default UnifiedTransactionsView;