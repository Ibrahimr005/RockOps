import React, {useState, useEffect} from "react";
import "./WarehouseViewTransactions.scss";
import PendingTransactionsTable from "./PendingTransactions/PendingTransactionsTable.jsx";
import ValidatedTransactionsTable from "./ValidatedTransactions/ValidatedTransactionsTable.jsx";
import IncomingTransactionsTable from "./IncomingTransactions/IncomingTransactionsTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2"; // Import the Snackbar component

const WarehouseViewTransactionsTable = ({ warehouseId, onAddButtonClick }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState("pending");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Snackbar states
  const [snackbar, setSnackbar] = useState({
    isVisible: false,
    type: 'success',
    text: ''
  });

  // Badge counts from child components
  const [badgeCounts, setBadgeCounts] = useState({
    pending: 0,
    incoming: 0,
    validated: 0
  });

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

  // Function to update badge counts from child components
  const updateBadgeCount = (tabType, count) => {
    setBadgeCounts(prev => ({
      ...prev,
      [tabType]: count
    }));
  };

  // Tab configuration with dynamic badge counts from child components
  const tabs = [
    {
      id: "pending",
      label: "Pending Transactions",
      component: PendingTransactionsTable,
      count: badgeCounts.pending
    },
    {
      id: "incoming",
      label: "Incoming Transactions",
      component: IncomingTransactionsTable,
      count: badgeCounts.incoming
    },
    {
      id: "validated",
      label: "Validated Transactions",
      component: ValidatedTransactionsTable,
      count: badgeCounts.validated
    }
  ];

  // Render the active tab content
  const renderActiveTabContent = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;

    const TabComponent = activeTabConfig.component;
    return (
        <TabComponent
            warehouseId={warehouseId}
            refreshTrigger={refreshTrigger}
            onCountUpdate={(count) => updateBadgeCount(activeTab, count)}
            onTransactionUpdate={triggerRefresh}
        />
    );
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

        {/* Hidden components to get badge counts */}
        <div style={{ display: 'none' }}>
          <PendingTransactionsTable
              warehouseId={warehouseId}
              refreshTrigger={refreshTrigger}
              onCountUpdate={(count) => updateBadgeCount('pending', count)}
          />
          <IncomingTransactionsTable
              warehouseId={warehouseId}
              refreshTrigger={refreshTrigger}
              onCountUpdate={(count) => updateBadgeCount('incoming', count)}
          />
          <ValidatedTransactionsTable
              warehouseId={warehouseId}
              refreshTrigger={refreshTrigger}
              onCountUpdate={(count) => updateBadgeCount('validated', count)}
          />
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
                {tab.count > 0 && (
                    <span className="tab-badge">
                        {tab.count}
                    </span>
                )}
              </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="transaction-tab-content">
          {renderActiveTabContent()}
        </div>
      </div>
  );
};

export default WarehouseViewTransactionsTable;