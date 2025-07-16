import React, { Fragment, useEffect, useState, useCallback } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import warehouseimg1 from "../../../assets/imgs/warehouse1.jpg";
import WarehouseViewItemsTable from "../../warehouse/WarehouseItems/WarehouseViewItemsTable";
import WarehouseViewItemTypesTable from "../../warehouse/WarehouseItemTypes/WarehouseViewItemTypesTable";
import WarehouseViewItemsCategoriesTable from "../../warehouse/WarehouseCategories/WarehouseViewItemsCategoriesTable";
import WarehouseViewTransactionsTable from "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactionsTable";
import WarehouseRequestOrders from "../../warehouse/WarehouseRequestOrders/WarehouseRequestOrders";
import IntroCard from "../../../components/common/IntroCard/IntroCard.jsx";
import "./WarehouseDetails.scss";
import warehouseImg from "../../../assets/imgs/warehouse1.jpg";

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h3>Something went wrong loading this section.</h3>
            <p>Error: {this.state.error?.message}</p>
            <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
            >
              Try Again
            </button>
          </div>
      );
    }

    return this.props.children;
  }
}

const WarehouseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [warehouseData, setWarehouseData] = useState(null);
  const [activeTab, setActiveTab] = useState("items");
  const [userRole, setUserRole] = useState('');
  const [discrepancyCounts, setDiscrepancyCounts] = useState({
    missingCount: 0,
    excessCount: 0,
    totalDiscrepancies: 0
  });
  const [incomingTransactionsCount, setIncomingTransactionsCount] = useState(0);
  const [addFunctions, setAddFunctions] = useState({});
  const [restockItems, setRestockItems] = useState(null);
  const [shouldOpenRestockModal, setShouldOpenRestockModal] = useState(false);

  // Function to fetch incoming transactions count directly - MOVED TO TOP
  const fetchIncomingTransactionsCount = useCallback(async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/v1/transactions/warehouse/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();

        // Filter for incoming transactions (same logic as IncomingTransactionsTable)
        const incomingCount = data.filter(transaction =>
            transaction.status === "PENDING" &&
            (transaction.receiverId === id || transaction.senderId === id) &&
            transaction.sentFirst !== id
        ).length;

        setIncomingTransactionsCount(incomingCount);
      }
    } catch (error) {
      console.error("Failed to fetch incoming transactions count:", error);
    }
  }, [id]);

  useEffect(() => {
    const fetchWarehouseDetails = async () => {
      try {
        const token = localStorage.getItem('token');

        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
          setUserRole(userInfo.role);
        }

        const response = await fetch(`http://localhost:8080/api/v1/warehouses/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setWarehouseData(data);
        console.log("warehouse:", JSON.stringify(data, null, 2));

        // Fetch incoming transactions count immediately after warehouse data is loaded
        fetchIncomingTransactionsCount();

      } catch (error) {
        console.error("Error fetching warehouse details:", error);
      }
    };

    fetchWarehouseDetails();
  }, [id, fetchIncomingTransactionsCount]);

  // FIXED: Simplified registration function
  const registerAddFunction = useCallback((tabName, func) => {
    setAddFunctions(prev => ({
      ...prev,
      [tabName]: func
    }));
  }, []);

  const handleIncomingTransactionsCountChange = useCallback((count) => {
    setIncomingTransactionsCount(count);
  }, []);

  const handleDiscrepancyCountChange = useCallback((counts) => {
    setDiscrepancyCounts(counts);
  }, []);

  // Create individual callback functions for each tab - FIXED dependencies
  const handleItemsAddButtonClick = useCallback((func) => {
    registerAddFunction('items', func);
  }, []); // Remove registerAddFunction dependency to break circular reference

  const handleCategoriesAddButtonClick = useCallback((func) => {
    registerAddFunction('categories', func);
  }, []);

  const handleTypesAddButtonClick = useCallback((func) => {
    registerAddFunction('types', func);
  }, []);

  const handleTransactionsAddButtonClick = useCallback((func) => {
    registerAddFunction('transactions', func);
  }, []);

  const handleRequestOrdersAddButtonClick = useCallback((func) => {
    registerAddFunction('requestOrders', func);
  }, []);

  const handleRestockItems = useCallback((itemsToRestock) => {
    console.log('Restock items requested:', itemsToRestock);

    // Store the restock items
    setRestockItems(itemsToRestock);

    // Switch to request orders tab
    setActiveTab("requestOrders");

    // Trigger modal opening
    setShouldOpenRestockModal(true);

    // Reset the trigger after a delay
    setTimeout(() => {
      setShouldOpenRestockModal(false);
    }, 500);
  }, []);

  // Function to get warehouse stats
  const getWarehouseStats = () => {
    if (!warehouseData) return [];

    return [
      { value: warehouseData.capacity?.toString() || "0", label: "Capacity" },
      { value: warehouseData.employees?.length?.toString() || "0", label: "Employees" },
      { value: warehouseData.site?.name || "No Site", label: "Site Location" }
    ];
  };

  if (!warehouseData) {
    return <div>Loading...</div>;
  }

  const getTabHeader = () => {
    switch (activeTab) {
      case "items":
        return "Inventory";
      case "categories":
        return "Item Categories";
      case "types":
        return "Item Types";
      case "transactions":
        return "Transactions";
      case "requestOrders":
        return "Request Orders";
      default:
        return "Inventory Management";
    }
  };

  const getAddButtonText = () => {
    switch (activeTab) {
      case "items":
        return "Add Item";
      case "categories":
        return "Add Category";
      case "types":
        return "Add Item Type";
      case "transactions":
        return "Add Transaction";
      case "requestOrders":
        return "Add Request Order";
      default:
        return "Add Item";
    }
  };

  const handleAddButtonClick = () => {
    // Call the appropriate add function based on active tab
    if (addFunctions[activeTab]) {
      addFunctions[activeTab]();
    } else {
      console.log(`Add functionality not yet connected for ${activeTab}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "items":
        return (
            <ErrorBoundary>
              <WarehouseViewItemsTable
                  warehouseId={id}
                  onAddButtonClick={handleItemsAddButtonClick}
                  onRestockItems={handleRestockItems}
                  onDiscrepancyCountChange={handleDiscrepancyCountChange}
              />
            </ErrorBoundary>
        );
      case "categories":
        return (
            <ErrorBoundary>
              <WarehouseViewItemsCategoriesTable
                  warehouseId={id}
                  onAddButtonClick={handleCategoriesAddButtonClick}
              />
            </ErrorBoundary>
        );
      case "types":
        return (
            <ErrorBoundary>
              <WarehouseViewItemTypesTable
                  warehouseId={id}
                  onAddButtonClick={handleTypesAddButtonClick}
              />
            </ErrorBoundary>
        );
      case "transactions":
        return (
            <ErrorBoundary>
              <WarehouseViewTransactionsTable
                  warehouseId={id}
                  onAddButtonClick={handleTransactionsAddButtonClick}
                  onIncomingTransactionsCountChange={handleIncomingTransactionsCountChange}
              />
            </ErrorBoundary>
        );
      case "requestOrders":
        return (
            <ErrorBoundary>
              <WarehouseRequestOrders
                  warehouseId={id}
                  onAddButtonClick={handleRequestOrdersAddButtonClick}
                  restockItems={restockItems}
                  shouldOpenRestockModal={shouldOpenRestockModal}
              />
            </ErrorBoundary>
        );
      default:
        return (
            <ErrorBoundary>
              <WarehouseViewItemsTable
                  warehouseId={id}
                  onAddButtonClick={handleItemsAddButtonClick}
                  onRestockItems={handleRestockItems}
              />
            </ErrorBoundary>
        );
    }
  };

  // FIXED: Simplified navigation handler
  const handleInfoClick = (e) => {
    e.stopPropagation();
    navigate(`/warehouses/warehouse-details/${id}`);
  };

  return (
      <Fragment>
        <div className="WarehouseDetailsContainer">
          <IntroCard
              title={warehouseData.name}
              label="WAREHOUSE MANAGEMENT"
              lightModeImage={warehouseData?.photoUrl || warehouseImg}
              darkModeImage={warehouseData?.photoUrl || warehouseImg}
              stats={getWarehouseStats()}
              onInfoClick={handleInfoClick}
              className="warehouse-intro-card"
          />

          {/* Show tabs only for warehouse managers */}
          {userRole === 'WAREHOUSE_MANAGER' && (
              <div className="new-tabs-container">
                <div className="new-tabs-header">
                  <button
                      className={`new-tab-button ${activeTab === "items" ? "active" : ""}`}
                      onClick={() => setActiveTab("items")}
                  >
                    Inventory
                    {discrepancyCounts.totalDiscrepancies > 0 && (
                        <span className="notification-dot"></span>
                    )}
                  </button>

                  <button
                      className={`new-tab-button ${activeTab === "transactions" ? "active" : ""}`}
                      onClick={() => setActiveTab("transactions")}
                  >
                    Transactions
                    {incomingTransactionsCount > 0 && (
                        <span className="notification-dot"></span>
                    )}
                  </button>

                  <button
                      className={`new-tab-button ${activeTab === "requestOrders" ? "active" : ""}`}
                      onClick={() => setActiveTab("requestOrders")}
                  >
                    Request Orders
                  </button>
                </div>

                {/* Unified container for all tab content */}
                <div className="unified-tab-content-container">
                  {/* Dynamic Header */}
                  <div className="tab-content-header">
                    <h2 className="tab-title">{getTabHeader()}</h2>
                    <div className="tab-header-line"></div>
                  </div>

                  {/* Tab Content */}
                  <div className="tab-content-body">
                    {renderTabContent()}
                  </div>
                </div>
              </div>
          )}

          {/* For non-warehouse managers, show inventory with same structure but no top tabs */}
          {userRole !== 'WAREHOUSE_MANAGER' && (
              <div className="new-tabs-container">
                <div className="unified-tab-content-container">
                  <div className="tab-content-header">
                    <h2 className="tab-title">
                      Inventory
                      {discrepancyCounts.totalDiscrepancies > 0 && (
                          <span className="notification-dot-title"></span>
                      )}
                    </h2>
                    <div className="tab-header-line"></div>
                  </div>

                  <div className="tab-content-body">
                    <ErrorBoundary>
                      <WarehouseViewItemsTable
                          warehouseId={id}
                          onAddButtonClick={handleItemsAddButtonClick}
                          onRestockItems={handleRestockItems}
                          onDiscrepancyCountChange={handleDiscrepancyCountChange}
                      />
                    </ErrorBoundary>
                  </div>
                </div>
              </div>
          )}
        </div>
      </Fragment>
  );
};

export default WarehouseDetails;