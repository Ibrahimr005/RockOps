import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactions.scss";
import EquipmentPendingTransactionsTable from "./EquipmentPendingTransactionsTable.jsx";
import EquipmentValidatedTransactionsTable from "./EquipmentValidatedTransactionsTable.jsx";
import EquipmentIncomingTransactionsTable from "./EquipmentIncomingTransactionsTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2";
import { equipmentService } from "../../../services/equipmentService";
import { siteService } from "../../../services/siteService";
import { warehouseService } from "../../../services/warehouseService";

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
            const response = await equipmentService.getEquipmentTransactions(entityId);
            const data = response.data;
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
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEntitiesByType = async (entityType) => {
        if (!entityType) return [];

        try {
            let response;

            if (entityType === "WAREHOUSE") {
                response = await warehouseService.getAll();
            } else if (entityType === "SITE") {
                response = await siteService.getAllSites();
            } else if (entityType === "EQUIPMENT") {
                response = await equipmentService.getAllEquipment();
            } else {
                // For other entity types, we'll need to add specific services
                console.warn(`No service found for entity type: ${entityType}`);
                return [];
            }

            return response.data;
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