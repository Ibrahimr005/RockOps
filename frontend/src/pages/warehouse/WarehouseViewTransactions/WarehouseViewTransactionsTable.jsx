import React, {useState, useEffect} from "react";
import "./WarehouseViewTransactions.scss";
import PendingTransactionsTable from "./PendingTransactions/PendingTransactionsTable.jsx";
import ValidatedTransactionsTable from "./ValidatedTransactions/ValidatedTransactionsTable.jsx";
import IncomingTransactionsTable from "./IncomingTransactions/IncomingTransactionsTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2"; // Import the Snackbar component

const WarehouseViewTransactionsTable = ({
                                          warehouseId,
                                          onAddButtonClick,
                                          onIncomingTransactionsCountChange // Add this line
                                        }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState("pending");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Snackbar states
  const [snackbar, setSnackbar] = useState({
    isVisible: false,
    type: 'success',
    text: ''
  });

  // Badge counts for incoming and validated transactions
  const [badgeCounts, setBadgeCounts] = useState({
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


  const updateBadgeCount = (tabType, count) => {
    setBadgeCounts(prev => ({
      ...prev,
      [tabType]: count
    }));

    // If it's incoming transactions, notify the parent component
    if (tabType === 'incoming' && onIncomingTransactionsCountChange) {
      onIncomingTransactionsCountChange(count);
    }
  };

  // Tab configuration with badge counts for incoming and validated
  const tabs = [
    {
      id: "pending",
      label: "Pending Transactions",
      component: PendingTransactionsTable,
      showBadge: false
    },
    {
      id: "incoming",
      label: "Incoming Transactions",
      component: IncomingTransactionsTable,
      showBadge: true,
      count: badgeCounts.incoming
    },
    {
      id: "validated",
      label: "Validated Transactions",
      component: ValidatedTransactionsTable,
      showBadge: true,
      count: badgeCounts.validated
    }
  ];

  // Render the active tab content
  const renderActiveTabContent = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;

    const TabComponent = activeTabConfig.component;

    // Pass onCountUpdate for incoming and validated transactions
    const props = {
      warehouseId: warehouseId,
      refreshTrigger: refreshTrigger,
      onTransactionUpdate: triggerRefresh
    };

    if (activeTab === 'incoming' || activeTab === 'validated') {
      props.onCountUpdate = (count) => updateBadgeCount(activeTab, count);
    }

    return <TabComponent {...props} />;
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

        {/* Hidden components to get badge counts for incoming and validated */}
        <div style={{ display: 'none' }}>
          <IncomingTransactionsTable
              warehouseId={warehouseId}
              refreshTrigger={refreshTrigger}
              onCountUpdate={(count) => updateBadgeCount('incoming', count)} // This will now notify parent
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
                {tab.showBadge && tab.count > 0 && (
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