import React, { Fragment, useEffect, useState, useCallback } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import warehouseimg1 from "../../../assets/imgs/warehouse1.jpg";
import WarehouseViewItemsTable from "../../warehouse/WarehouseItems/WarehouseViewItemsTable";
import WarehouseViewItemTypesTable from "../../warehouse/WarehouseItemTypes/WarehouseViewItemTypesTable";
import WarehouseViewItemsCategoriesTable from "../../warehouse/WarehouseCategories/WarehouseViewItemsCategoriesTable";
import WarehouseViewTransactionsTable from "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactionsTable";
import WarehouseRequestOrders from "../../warehouse/WarehouseRequestOrders/WarehouseRequestOrders";
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

  // Store functions from child components
  const [addFunctions, setAddFunctions] = useState({});

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

      } catch (error) {
        console.error("Error fetching warehouse details:", error);
      }
    };

    fetchWarehouseDetails();
  }, [id]);

  // FIXED: Simplified registration function
  const registerAddFunction = useCallback((tabName, func) => {
    setAddFunctions(prev => ({
      ...prev,
      [tabName]: func
    }));
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

  if (!warehouseData) {
    return <div>Loading...</div>;
  }

  const getTabHeader = () => {
    switch (activeTab) {
      case "items":
        return "Inventory Management";
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
              />
            </ErrorBoundary>
        );
      case "requestOrders":
        return (
            <ErrorBoundary>
              <WarehouseRequestOrders
                  warehouseId={id}
                  onAddButtonClick={handleRequestOrdersAddButtonClick}
              />
            </ErrorBoundary>
        );
      default:
        return (
            <ErrorBoundary>
              <WarehouseViewItemsTable
                  warehouseId={id}
                  onAddButtonClick={handleItemsAddButtonClick}
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
          <div className="warehouse-card">
            <div className="left-side">
              <img
                  className="warehouse-image"
                  src={warehouseData?.photoUrl || warehouseImg}
                  alt="Warehouse"
                  onError={(e) => {
                    e.target.src = warehouseImg;
                  }}
              />
            </div>
            <div className="center-content">
              <div className="label">WAREHOUSE NAME</div>
              <div className="value">{warehouseData.name}</div>
            </div>
            <div className="right-side">
              <button className="info-button" onClick={handleInfoClick}>
                <FaInfoCircle />
              </button>
            </div>
          </div>

          {/* Updated tabs to include Request Orders */}
          <div className="new-tabs-container">
            <div className="new-tabs-header">
              <button
                  className={`new-tab-button ${activeTab === "items" ? "active" : ""}`}
                  onClick={() => setActiveTab("items")}
              >
                Inventory
              </button>
              <button
                  className={`new-tab-button ${activeTab === "categories" ? "active" : ""}`}
                  onClick={() => setActiveTab("categories")}
              >
                Categories
              </button>
              <button
                  className={`new-tab-button ${activeTab === "types" ? "active" : ""}`}
                  onClick={() => setActiveTab("types")}
              >
                Item Types
              </button>



              {userRole === 'WAREHOUSE_MANAGER' && (
                  <button
                      className={`new-tab-button ${activeTab === "transactions" ? "active" : ""}`}
                      onClick={() => setActiveTab("transactions")}
                  >
                    Transactions
                  </button>
              )}

              {userRole === 'WAREHOUSE_MANAGER' && (
                  <button
                      className={`new-tab-button ${activeTab === "requestOrders" ? "active" : ""}`}
                      onClick={() => setActiveTab("requestOrders")}
                  >
                    Request Orders
                  </button>
              )}
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

              {/* Footer with Add Button */}
              {userRole === "WAREHOUSE_MANAGER" && (
                  <div className="tab-content-footer">
                    <button
                        className="add-entity-button"
                        onClick={handleAddButtonClick}
                        title={getAddButtonText()}
                    >
                      <svg className="add-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
              )}

            </div>
          </div>
        </div>
      </Fragment>
  );
};

export default WarehouseDetails;