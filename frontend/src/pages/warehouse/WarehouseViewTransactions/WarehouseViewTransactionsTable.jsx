import React, {useState, useEffect} from "react";
import "./WarehouseViewTransactions.scss";
import PendingTransactionsTable from "./PendingTransactions/PendingTransactionsTable.jsx";
import ValidatedTransactionsTable from "./ValidatedTransactionsTable";
import IncomingTransactionsTable from "./IncomingTransactionsTable";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2"; // Import the Snackbar component

const WarehouseViewTransactionsTable = ({ warehouseId, onAddButtonClick }) => {
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

  // Tab configuration
  const tabs = [
    { id: "pending", label: "Pending Transactions", component: PendingTransactionsTable },
    { id: "incoming", label: "Incoming Transactions", component: IncomingTransactionsTable },
    { id: "validated", label: "Validated Transactions", component: ValidatedTransactionsTable }
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

  useEffect(() => {
    fetchTransactions();
  }, [warehouseId]);

  // Process and categorize transactions after data is loaded
  useEffect(() => {
    if (allTransactions.length > 0) {
      const pending = allTransactions.filter(
          transaction =>
              transaction.status === "PENDING" &&
              transaction.receiverId === warehouseId
      );

      setPendingTransactions(pending);
    }
  }, [allTransactions, warehouseId]);

  const fetchTransactions = async () => {
    if (!warehouseId) {
      console.error("Warehouse ID is not available");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/transactions/warehouse/${warehouseId}`, {
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
    return <TabComponent warehouseId={warehouseId} refreshTrigger={refreshTrigger} />;
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
};

export default WarehouseViewTransactionsTable;