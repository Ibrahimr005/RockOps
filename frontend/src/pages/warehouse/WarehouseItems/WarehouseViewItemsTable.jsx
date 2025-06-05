import React, { useState, useEffect } from "react";
import "./WarehouseViewItems.scss";
import { useParams } from 'react-router-dom';
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";

const WarehouseViewItemsTable = ({ warehouseId, onAddButtonClick }) => {
  const [tableData, setTableData] = useState([]);
  const [resolutionHistory, setResolutionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isTransactionDetailsModalOpen, setIsTransactionDetailsModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState([]);
  const [transactionDetailsLoading, setTransactionDetailsLoading] = useState(false);
  const [addItemData, setAddItemData] = useState({
    itemCategoryId: "",
    itemTypeId: "",
    initialQuantity: ""
  });

  const [addItemLoading, setAddItemLoading] = useState(false);
  const [itemCategories, setItemCategories] = useState([]);
  const [resolutionData, setResolutionData] = useState({
    resolutionType: "",
    notes: "",
    transactionId: ""
  });
  const [newItem, setNewItem] = useState({
    itemType: { id: "" },
    quantity: "",
    status: "AVAILABLE",
    comment: "",
  });
  const [itemTypes, setItemTypes] = useState([]);

  // Snackbar states
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  const [activeTab, setActiveTab] = useState('inWarehouse');
  const [warehouseData, setWarehouseData] = useState({
    site: {},
    name: "",
    id: "",
    employees: []
  });

  // Helper function to show snackbar
  const showSnackbar = (message, type = "success") => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  // Helper function to close snackbar
  const closeSnackbar = () => {
    setShowNotification(false);
  };

  // Helper function to check if item is low stock
  const isLowStock = (item) => {
    if (!item.itemType?.minQuantity) return false;
    return item.quantity < item.itemType.minQuantity;
  };

  // Helper function to get low stock items count
  const getLowStockCount = (items) => {
    return items.filter(item => isLowStock(item)).length;
  };

  useEffect(() => {
    if (onAddButtonClick) {
      onAddButtonClick(handleOpenAddItemModal);
    }
  }, [onAddButtonClick]);

  // Helper function to aggregate items by type for "In Warehouse" tab
  const aggregateItemsByType = (items) => {
    const aggregated = {};

    items.forEach(item => {
      const key = item.itemType?.id;
      if (!key) return;

      if (aggregated[key]) {
        // Add quantity and keep track of individual items for details
        aggregated[key].quantity += item.quantity;
        aggregated[key].individualItems.push(item);
      } else {
        // Create new aggregated entry
        aggregated[key] = {
          ...item,
          quantity: item.quantity,
          individualItems: [item], // Store individual items for potential detail view
          // Use the first item's data as base, but aggregate quantities
          id: `aggregated_${key}`, // Use a different ID to avoid conflicts
          isAggregated: true
        };
      }
    });

    return Object.values(aggregated);
  };

  // Function to fetch warehouse name by ID
  const fetchWarehouseName = async (warehouseId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/warehouses/${warehouseId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const warehouse = await response.json();
        return warehouse.name;
      }
    } catch (error) {
      console.error("Error fetching warehouse name:", error);
    }
    return "Unknown Warehouse";
  };

  const fetchItems = async () => {
    if (!warehouseId) {
      console.error("Warehouse ID is not available");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/items/warehouse/${warehouseId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTableData(data);
      } else {
        console.error("Failed to fetch items, status:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResolutionHistory = async () => {
    if (!warehouseId) {
      console.error("Warehouse ID is not available");
      return;
    }
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/items/resolution-history/warehouse/${warehouseId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setResolutionHistory(data);
      } else {
        console.error("Failed to fetch resolution history, status:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch resolution history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchItemTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/itemTypes`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItemTypes(data);
      } else {
        console.error("Failed to fetch item types, status:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch item types:", error);
    }
  };

  const fetchItemCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/itemCategories/children`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItemCategories(data);
      } else {
        console.error("Failed to fetch item categories, status:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch item categories:", error);
    }
  };

  const fetchWarehouseDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/warehouses/${warehouseId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setWarehouseData({
        site: data.site || {},
        name: data.name || "",
        id: data.id || "",
        employees: data.employees || []
      });
    } catch (error) {
      console.error("Error fetching warehouse details:", error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchItemTypes();
    fetchItemCategories();
    fetchWarehouseDetails();
  }, [warehouseId]);

  useEffect(() => {
    if (activeTab === 'resolvedHistory') {
      fetchResolutionHistory();
    }
  }, [activeTab, warehouseId]);

  const handleDeleteItem = async (itemId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setTableData((prev) => prev.filter(item => item.id !== itemId));
        showSnackbar("Item deleted successfully", "success");
      } else {
        const errorText = await response.text();
        console.error("Failed to delete item:", response.status, errorText);
        showSnackbar("Failed to delete item", "error");
      }
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar("Error deleting item", "error");
    }
  };

  const handleOpenResolutionModal = (item) => {
    setSelectedItem(item);
    setResolutionData({
      resolutionType: "",
      notes: "",
      transactionId: item.relatedTransactionId || ""
    });
    setIsResolutionModalOpen(true);
  };

  const handleOpenAddItemModal = () => {
    setAddItemData({
      itemCategoryId: "",
      itemTypeId: "",
      initialQuantity: ""
    });
    setIsAddItemModalOpen(true);
  };

  const handleAddItemInputChange = (e) => {
    const { name, value } = e.target;

    // If category is changed, reset item type selection
    if (name === 'itemCategoryId') {
      setAddItemData({
        ...addItemData,
        itemCategoryId: value,
        itemTypeId: "" // Reset item type when category changes
      });
    } else {
      setAddItemData({
        ...addItemData,
        [name]: value,
      });
    }
  };

  // Filter item types based on selected category
  const getFilteredItemTypes = () => {
    if (!addItemData.itemCategoryId) {
      return itemTypes; // Show all if no category selected
    }
    return itemTypes.filter(itemType =>
        itemType.itemCategory?.id === addItemData.itemCategoryId
    );
  };

  const handleAddItemSubmit = async (e) => {
    e.preventDefault();

    if (!addItemData.itemTypeId || !addItemData.initialQuantity) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    if (parseInt(addItemData.initialQuantity) <= 0) {
      showSnackbar("Quantity must be greater than 0", "error");
      return;
    }

    let username = "system"; // Default fallback
    const userInfoString = localStorage.getItem('userInfo');

    if (userInfoString) {
      try {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo.username) {
          username = userInfo.username;
        }
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }

    setAddItemLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemTypeId: addItemData.itemTypeId,
          warehouseId: warehouseId,
          initialQuantity: parseInt(addItemData.initialQuantity),
          username: username
        }),
      });

      if (response.ok) {
        fetchItems(); // Refresh the items list
        setIsAddItemModalOpen(false);
        showSnackbar("Item added successfully", "success");
      } else {
        const errorText = await response.text();
        console.error("Failed to add item:", response.status, errorText);
        showSnackbar("Failed to add item", "error");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      showSnackbar("Error adding item", "error");
    } finally {
      setAddItemLoading(false);
    }
  };

  const handleOpenTransactionDetailsModal = async (item) => {
    setSelectedItem(item);
    setIsTransactionDetailsModalOpen(true);
    setTransactionDetailsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
          `http://localhost:8080/api/v1/items/transaction-details/${warehouseId}/${item.itemType.id}`,
          {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          }
      );

      if (response.ok) {
        const details = await response.json();

        // Fetch warehouse names for transactions
        const detailsWithWarehouseNames = await Promise.all(
            details.map(async (detail) => {
              if (detail.transactionItem?.transaction) {
                const transaction = detail.transactionItem.transaction;
                let senderName = "Unknown";
                let receiverName = "Unknown";

                // Fetch sender warehouse name
                if (transaction.senderType === 'WAREHOUSE' && transaction.senderId) {
                  senderName = await fetchWarehouseName(transaction.senderId);
                }

                // Fetch receiver warehouse name
                if (transaction.receiverType === 'WAREHOUSE' && transaction.receiverId) {
                  receiverName = await fetchWarehouseName(transaction.receiverId);
                }

                return {
                  ...detail,
                  senderWarehouseName: senderName,
                  receiverWarehouseName: receiverName
                };
              }
              return detail;
            })
        );

        // Sort by createdAt in ascending order (oldest first)
        const sortedDetails = detailsWithWarehouseNames.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA - dateB;
        });

        setTransactionDetails(sortedDetails);
      } else {
        console.error("Failed to fetch transaction details:", response.status);
        showSnackbar("Failed to load transaction details", "error");
      }
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      showSnackbar("Error loading transaction details", "error");
    } finally {
      setTransactionDetailsLoading(false);
    }
  };

  const handleResolutionSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) return;

    try {
      const token = localStorage.getItem("token");

      const resolution = {
        itemId: selectedItem.id,
        resolutionType: resolutionData.resolutionType,
        notes: resolutionData.notes,
        transactionId: resolutionData.transactionId,
        resolvedBy: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')).username : "system"
      };

      const response = await fetch(`http://localhost:8080/api/v1/items/resolve-discrepancy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(resolution),
      });

      if (response.ok) {
        fetchItems();
        setIsResolutionModalOpen(false);
        showSnackbar("Discrepancy resolved successfully", "success");
      } else {
        const errorText = await response.text();
        console.error("Failed to resolve item:", response.status, errorText);
        showSnackbar("Failed to resolve discrepancy", "error");
      }
    } catch (error) {
      console.error("Failed to resolve item:", error);
      showSnackbar("Error resolving discrepancy", "error");
    }
  };

  const handleResolutionInputChange = (e) => {
    const { name, value } = e.target;
    setResolutionData({
      ...resolutionData,
      [name]: value,
    });
  };

  // Updated filtered data logic to handle aggregation for "In Warehouse" tab
  const getFilteredData = () => {
    let baseFilteredData = tableData.filter((item) => {
      if (activeTab === 'inWarehouse') {
        return item.itemStatus === 'IN_WAREHOUSE' && !item.resolved;
      }
      if (activeTab === 'missingItems') {
        return item.itemStatus === 'MISSING' && !item.resolved;
      }
      if (activeTab === 'excessItems') {
        return item.itemStatus === 'OVERRECEIVED' && !item.resolved;
      }
      if (activeTab === 'resolvedHistory') {
        return item.resolved;
      }

      return true;
    });

    // Only aggregate for "In Warehouse" tab
    if (activeTab === 'inWarehouse') {
      return aggregateItemsByType(baseFilteredData);
    }

    return baseFilteredData;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'IN_WAREHOUSE':
        return 'In Warehouse';
      case 'DELIVERING':
        return 'Delivering';
      case 'PENDING':
        return 'Pending';
      case 'MISSING':
        return 'Missing Items';
      case 'OVERRECEIVED':
        return 'Excess Items';
      default:
        return status;
    }
  };

  const getResolutionTypeLabel = (resolutionType) => {
    switch (resolutionType) {
      case 'ACKNOWLEDGE_LOSS':
        return 'Acknowledge Loss';
      case 'FOUND_ITEMS':
        return 'Items Found';
      case 'REPORT_THEFT':
        return 'Report Theft';
      case 'ACCEPT_SURPLUS':
        return 'Accept Surplus';
      case 'RETURN_TO_SENDER':
        return 'Return to Sender';
      default:
        return resolutionType;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Define columns for regular items table (In Warehouse - aggregated)
  const itemColumns = [
    {
      accessor: 'itemType.itemCategory.name',
      header: 'CATEGORY',
      width: '255px',
      render: (row) => (
          <span className="category-tag">
            {row.itemType?.itemCategory?.name || "No Category"}
          </span>
      )
    },
    {
      accessor: 'itemType.name',
      header: 'ITEM',
      width: '250px'
    },
    {
      accessor: 'quantity',
      header: 'QUANTITY',
      width: '250px',
      render: (row) => {
        // Show aggregated quantity for "In Warehouse" tab
        if (activeTab === 'inWarehouse' && row.isAggregated) {
          const lowStock = isLowStock(row);
          return (
              <div className="quantity-cell">
                <div className="quantity-main">
                  <span className={`total-quantity ${lowStock ? 'low-stock' : ''}`}>
                    {row.quantity}
                  </span>

                </div>
                {row.individualItems && row.individualItems.length > 1 && (
                    <span className="quantity-breakdown" title={`From ${row.individualItems.length} transactions`}>
                      {` (${row.individualItems.length} entries)`}
                    </span>
                )}

              </div>
          );
        }
        return row.quantity || 0;
      }
    },
    {
      accessor: 'itemType.measuringUnit',
      header: 'UNIT',
      width: '230px',
      render: (row) => row.itemType?.measuringUnit || "N/A"
    }
  ];

  // Define columns for discrepancy items (Missing/Excess Items - WITH batch number)
  const discrepancyItemColumns = [
    {
      accessor: 'itemType.itemCategory.name',
      header: 'CATEGORY',
      width: '200px',
      render: (row) => (
          <span className="category-tag">
            {row.itemType?.itemCategory?.name || "No Category"}
          </span>
      )
    },
    {
      accessor: 'itemType.name',
      header: 'ITEM',
      width: '210px'
    },
    {
      accessor: 'quantity',
      header: 'QUANTITY',
      width: '210px'
    },
    {
      accessor: 'itemType.measuringUnit',
      header: 'UNIT',
      width: '210px',
      render: (row) => row.itemType?.measuringUnit || "N/A"
    },
    {
      accessor: 'transaction.batchNumber',
      header: 'BATCH #',
      width: '200px',
      render: (row) => (
          <span className="batch-number">
            {row.transaction?.batchNumber || row.batchNumber || 'N/A'}
          </span>
      )
    }
  ];

  // Define columns for resolution history table
  const historyColumns = [
    {
      accessor: 'item.itemType.itemCategory.name',
      header: 'CATEGORY',
      width: '210px',
      render: (row) => (
          <span className="category-tag">
            {row.item?.itemType?.itemCategory?.name || "No Category"}
          </span>
      )
    },
    {
      accessor: 'item.itemType.name',
      header: 'ITEM',
      width: '210px'
    },
    {
      accessor: 'originalQuantity',
      header: 'QUANTITY',
      width: '210px'
    },
    {
      accessor: 'item.transaction.batchNumber',
      header: 'BATCH #',
      width: '210px',
      render: (row) => (
          <span className="batch-number">
            {row.item?.transaction?.batchNumber || row.item?.batchNumber || 'N/A'}
          </span>
      )
    },
    {
      accessor: 'resolutionType',
      header: 'RESOLUTION',
      width: '180px',
      render: (row) => (
          <span className={`resolution-badge ${row.resolutionType?.toLowerCase().replace('_', '-')}`}>
            {getResolutionTypeLabel(row.resolutionType)}
          </span>
      )
    },
    {
      accessor: 'resolvedBy',
      header: 'RESOLVED BY',
      width: '210px',
      render: (row) => row.resolvedBy || "System"
    },
    {
      accessor: 'resolvedAt',
      header: 'RESOLVED AT',
      width: '250px',
      render: (row) => (
          <span className="date-cell">
            {formatDate(row.resolvedAt)}
          </span>
      )
    }
  ];

  // Define actions for different tabs
  const getActions = () => {
    if (activeTab === 'resolvedHistory') {
      return []; // No actions for resolved history
    }

    const actions = [];

    if (activeTab === 'inWarehouse') {
      // For aggregated items, only show view details
      actions.push({
        label: 'View Details',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
        ),
        onClick: (row) => handleOpenTransactionDetailsModal(row),
        className: 'view',
        isDisabled: (row) => !row.isAggregated
      });

      // Only show delete for non-aggregated items
      actions.push({
        label: 'Delete',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
        ),
        onClick: (row) => handleDeleteItem(row.id),
        className: 'delete',
        // isDisabled: (row) => row.isAggregated
      });
    } else {
      // For discrepancy items
      if (activeTab === 'missingItems' || activeTab === 'excessItems') {
        actions.push({
          label: 'Resolve',
          icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
          ),
          onClick: (row) => handleOpenResolutionModal(row),
          className: 'resolve'
        });
      }

      actions.push({
        label: 'Delete',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
        ),
        onClick: (row) => handleDeleteItem(row.id),
        className: 'delete'
      });
    }

    return actions;
  };

  const filteredData = getFilteredData();

  // Get low stock items for "In Warehouse" tab
  const lowStockItems = activeTab === 'inWarehouse' ? filteredData.filter(item => isLowStock(item)) : [];

  return (
      <div className="warehouse-view4">
        {/* Header with count and search */}
        <div className="header-container4">
          <div className="left-section4">
            <div className="item-count4">
              {activeTab === 'resolvedHistory'
                  ? `${resolutionHistory.length} resolutions`
                  : activeTab === 'inWarehouse'
                      ? `${filteredData.length} item types (${tableData.filter(item => item.itemStatus === 'IN_WAREHOUSE' && !item.resolved).length} total items)`
                      : `${tableData.length} items`}
            </div>
          </div>
        </div>

        {/* Low Stock Warning Banner - Only show for "In Warehouse" tab */}


        {/* Tab navigation */}
        <div className="inventory-tabs">
          <button
              className={`inventory-tab ${activeTab === 'inWarehouse' ? 'active' : ''}`}
              onClick={() => setActiveTab('inWarehouse')}
          >
            In Warehouse

          </button>
          <button
              className={`inventory-tab ${activeTab === 'missingItems' ? 'active' : ''}`}
              onClick={() => setActiveTab('missingItems')}
          >
            Missing Items
            {tableData.filter(item => item.itemStatus === 'MISSING' && !item.resolved).length > 0 && (
                <span className="tab-badge">
                  {tableData.filter(item => item.itemStatus === 'MISSING' && !item.resolved).length}
                </span>
            )}
          </button>
          <button
              className={`inventory-tab ${activeTab === 'excessItems' ? 'active' : ''}`}
              onClick={() => setActiveTab('excessItems')}
          >
            Excess Items
            {tableData.filter(item => item.itemStatus === 'OVERRECEIVED' && !item.resolved).length > 0 && (
                <span className="tab-badge">
                  {tableData.filter(item => item.itemStatus === 'OVERRECEIVED' && !item.resolved).length}
                </span>
            )}
          </button>
          <button
              className={`inventory-tab ${activeTab === 'resolvedHistory' ? 'active' : ''}`}
              onClick={() => setActiveTab('resolvedHistory')}
          >
            Resolution History
          </button>
        </div>

        {activeTab === 'inWarehouse' && lowStockItems.length > 0 && (
            <div className="low-stock-warning-banner">
              <div className="warning-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="warning-content">
                <h3 className="warning-title">Low Stock Alert</h3>
                <p className="warning-message">
                  {lowStockItems.length} item{lowStockItems.length > 1 ? 's are' : ' is'} below minimum quantity threshold:
                </p>
                <div className="low-stock-items-list">
                  {lowStockItems.slice(0, 3).map((item, index) => (
                      <span key={index} className="low-stock-item">
                        {item.itemType?.name} ({item.quantity}/{item.itemType?.minQuantity})
                      </span>
                  ))}
                  {lowStockItems.length > 3 && (
                      <span className="low-stock-more">
                        +{lowStockItems.length - 3} more
                      </span>
                  )}
                </div>
              </div>
              <div className="warning-actions">
                <button
                    className="restock-button"
                    onClick={handleOpenAddItemModal}
                    title="Add items to restock"
                >
                  Restock Items
                </button>
              </div>
            </div>
        )}

        {/* Resolution info cards */}
        {(activeTab === 'missingItems' || activeTab === 'excessItems') && (
            <div className="resolution-info-card">
              <div className="resolution-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="resolution-info-content">
                <h3>Inventory Discrepancy Resolution</h3>
                <p>
                  {activeTab === 'missingItems'
                      ? 'Items marked as "Missing" represent inventory shortages identified during transactions. These items were expected to be received but were not found. Review and resolve these discrepancies to maintain accurate inventory records.'
                      : 'Items marked as "Excess" represent inventory surpluses identified during transactions. These are items that were received beyond expected quantities. Review and resolve these discrepancies to determine appropriate action.'}
                </p>
              </div>
            </div>
        )}

        {activeTab === 'resolvedHistory' && (
            <div className="resolution-info-card">
              <div className="resolution-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="resolution-info-content">
                <h3>Resolution History</h3>
                <p>
                  This tab shows the complete history of all resolved inventory discrepancies. Each entry includes details about the original issue, the resolution action taken, and who resolved it.
                </p>
              </div>
            </div>
        )}

        {/* DataTable Component - Different column sets for different tabs */}
        {activeTab === 'resolvedHistory' ? (
            <DataTable
                data={resolutionHistory}
                columns={historyColumns}
                loading={historyLoading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                  { accessor: 'item.itemType.name', header: 'Item' },
                  { accessor: 'item.itemType.itemCategory.name', header: 'Category' },
                  { accessor: 'resolutionType', header: 'Resolution Type' },
                  { accessor: 'resolvedBy', header: 'Resolved By' }
                ]}
                actions={getActions()}
                className="resolution-history-table"
            />
        ) : activeTab === 'inWarehouse' ? (
            <DataTable
                data={filteredData}
                columns={itemColumns}
                loading={loading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                  { accessor: 'itemType.name', header: 'Item' },
                  { accessor: 'itemType.itemCategory.name', header: 'Category' },
                  { accessor: 'itemType.measuringUnit', header: 'Unit' }
                ]}
                actions={getActions()}
                className="inventory-items-table"
            />
        ) : (
            <DataTable
                data={filteredData}
                columns={discrepancyItemColumns}
                loading={loading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                  { accessor: 'itemType.name', header: 'Item' },
                  { accessor: 'itemType.itemCategory.name', header: 'Category' },
                  { accessor: 'transaction.batchNumber', header: 'Batch Number' }
                ]}
                actions={getActions()}
                className="discrepancy-items-table"
            />
        )}

        {/* Resolution Modal */}
        {isResolutionModalOpen && selectedItem && (
            <div className="resolution-modal-backdrop">
              <div className="resolution-modal">
                <div className="resolution-modal-header">
                  <h2>Resolve Inventory Discrepancy</h2>
                  <button
                      className="close-modal-button"
                      onClick={() => setIsResolutionModalOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="resolution-modal-body">
                  <div className="resolution-item-details">
                    <div className="resolution-detail">
                      <span className="resolution-label">Item:</span>
                      <span className="resolution-value">{selectedItem.itemType?.name}</span>
                    </div>

                    <div className="resolution-detail">
                      <span className="resolution-label">Quantity:</span>
                      <span className="resolution-value">{selectedItem.quantity} {selectedItem.itemType?.measuringUnit || ''}</span>
                    </div>

                    <div className="resolution-detail">
                      <span className="resolution-label">Status:</span>
                      <span className="resolution-value">{getStatusLabel(selectedItem.itemStatus)}</span>
                    </div>

                    <div className="resolution-detail">
                      <span className="resolution-label">Batch Number:</span>
                      <span className="resolution-value">{selectedItem.transaction?.batchNumber || selectedItem.batchNumber || 'N/A'}</span>
                    </div>
                  </div>

                  <form onSubmit={handleResolutionSubmit} className="resolution-form">
                    <div className="resolution-form-group">
                      <label htmlFor="resolutionType">Resolution Type</label>
                      <select
                          id="resolutionType"
                          name="resolutionType"
                          value={resolutionData.resolutionType}
                          onChange={handleResolutionInputChange}
                          required
                      >
                        <option value="">Select Resolution Type</option>
                        {selectedItem.itemStatus === 'MISSING' ? (
                            <>
                              <option value="ACKNOWLEDGE_LOSS">Acknowledge Loss</option>
                              <option value="FOUND_ITEMS">Items Found</option>
                              <option value="REPORT_THEFT">Report Theft</option>
                            </>
                        ) : (
                            <>
                              <option value="ACCEPT_SURPLUS">Accept Surplus</option>
                              <option value="COUNTING_ERROR">Counting Error</option>
                            </>
                        )}
                      </select>
                    </div>

                    <div className="resolution-form-group">
                      <label htmlFor="notes">Resolution Notes</label>
                      <textarea
                          id="notes"
                          name="notes"
                          value={resolutionData.notes}
                          onChange={handleResolutionInputChange}
                          placeholder="Provide details about this resolution"
                          rows={4}
                          required
                      />
                    </div>

                    <div className="resolution-confirmation">
                      <p className="resolution-confirmation-text">
                        {resolutionData.resolutionType === 'ACKNOWLEDGE_LOSS' &&
                            "You are confirming that these items are lost and will be removed from inventory."}

                        {resolutionData.resolutionType === 'FOUND_ITEMS' &&
                            "You are confirming items were found and will be returned to regular inventory."}
                        {resolutionData.resolutionType === 'REPORT_THEFT' &&
                            "You are reporting theft. This will be logged and items will be written off."}
                        {resolutionData.resolutionType === 'ACCEPT_SURPLUS' &&
                            "You are accepting the surplus items into regular inventory."}
                        {resolutionData.resolutionType === 'RETURN_TO_SENDER' &&
                            "You are initiating a return of these items to the sender."}
                      </p>
                    </div>

                    <div className="resolution-modal-footer">
                      <button
                          type="button"
                          className="cancel-button"
                          onClick={() => setIsResolutionModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                          type="submit"
                          className="resolve-submit-button"
                          disabled={!resolutionData.resolutionType || !resolutionData.notes}
                      >
                        Resolve Discrepancy
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}

        {/* Transaction Details Modal */}
        {isTransactionDetailsModalOpen && selectedItem && (
            <div className="resolution-modal-backdrop">
              <div className="transaction-details-modal">
                <div className="transaction-modal-header">
                  <div className="header-content">
                    <div className="item-info">
                      <h2 className="item-name">{selectedItem.itemType?.name}</h2>
                      <span className="item-category">{selectedItem.itemType?.itemCategory?.name}</span>
                    </div>
                    <div className="summary-stats">
                      <div className="stat-item">
                        <span className="stat-value">{selectedItem.quantity}</span>
                        <span className="stat-label">{selectedItem.itemType?.measuringUnit}</span>
                      </div>
                      <div className="stat-divider"></div>
                      <div className="stat-item">
                        <span className="stat-value">{transactionDetails.length}</span>
                        <span className="stat-label">Entries</span>
                      </div>
                    </div>
                  </div>
                  <button
                      className="close-modal-button"
                      onClick={() => setIsTransactionDetailsModalOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="transaction-details-modal-body">
                  {transactionDetailsLoading ? (
                      <div className="transaction-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading transaction details...</p>
                      </div>
                  ) : (
                      <div className="transaction-details-list">
                        {transactionDetails.length > 0 ? (
                            <div className="transaction-items">
                              {transactionDetails.map((item, index) => (
                                  <div key={item.id} className="transaction-detail-card">
                                    {/* Check if item has transaction details */}
                                    {item.transactionItem?.transaction ? (
                                        <>
                                          <div className="transaction-card-header">
                                            <div className="transaction-batch">
                                              <span className="batch-label">Batch #</span>
                                              <span className="batch-number">
                                                {item.batchNumber || item.transactionItem.transaction.batchNumber || 'N/A'}
                                              </span>
                                            </div>
                                            <div className="transaction-date">
                                              {item.createdAt ? formatDate(item.createdAt) : 'N/A'}
                                            </div>
                                          </div>

                                          <div className="transaction-card-body">
                                            <div className="quantity-info">
                                              <span className="quantity-value">{item.quantity}</span>
                                              <span className="quantity-unit">{item.itemType?.measuringUnit}</span>
                                            </div>

                                            <div className="transaction-flow">
                                              <div className="flow-info">
                                                <span className="flow-label">From:</span>
                                                <span className="flow-value">
                                                  {item.senderWarehouseName || 'Unknown Warehouse'}
                                                </span>
                                              </div>
                                              <div className="flow-arrow">→</div>
                                              <div className="flow-info">
                                                <span className="flow-label">To:</span>
                                                <span className="flow-value">
                                                  {item.receiverWarehouseName || warehouseData.name || 'This Warehouse'}
                                                </span>
                                              </div>
                                            </div>

                                            {item.transactionItem.transaction.addedBy && (
                                                <div className="transaction-user">
                                                  <span className="user-label">Added by:</span>
                                                  <span className="user-value">{item.transactionItem.transaction.addedBy}</span>
                                                </div>
                                            )}

                                            {item.transactionItem.transaction.acceptanceComment && (
                                                <div className="transaction-comment">
                                                  <span className="comment-label">Note:</span>
                                                  <span className="comment-value">{item.transactionItem.transaction.acceptanceComment}</span>
                                                </div>
                                            )}
                                          </div>
                                        </>
                                    ) : (
                                        // Manual entry card
                                        <>
                                          <div className="transaction-card-header manual-entry">
                                            <div className="manual-entry-badge">
                                              <span className="manual-label">Manual Entry</span>
                                            </div>
                                            <div className="entry-date">
                                              {item.createdAt ? formatDate(item.createdAt) : 'Date unknown'}
                                            </div>
                                          </div>

                                          <div className="transaction-card-body">
                                            <div className="quantity-info">
                                              <span className="quantity-value">{item.quantity}</span>
                                              <span className="quantity-unit">{item.itemType?.measuringUnit}</span>
                                            </div>

                                            <div className="manual-entry-info">
                                              <div className="manual-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                              </div>
                                              <div className="manual-text">
                                                <p className="manual-title">This item was manually added</p>
                                                <p className="manual-description">
                                                  No transaction record available - item was directly added to inventory
                                                </p>
                                              </div>
                                            </div>

                                            {item.addedBy && (
                                                <div className="transaction-user">
                                                  <span className="user-label">Added by:</span>
                                                  <span className="user-value">{item.createdBy}</span>
                                                </div>
                                            )}

                                            {item.comment && (
                                                <div className="transaction-comment">
                                                  <span className="comment-label">Note:</span>
                                                  <span className="comment-value">{item.comment}</span>
                                                </div>
                                            )}
                                          </div>
                                        </>
                                    )}
                                  </div>
                              ))}
                            </div>
                        ) : (
                            <div className="no-transactions">
                              <div className="empty-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <h3>No Transaction History</h3>
                              <p>No transaction details found for this item.</p>
                            </div>
                        )}
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* Add Item Modal */}
        {isAddItemModalOpen && (
            <div className="resolution-modal-backdrop">
              <div className="add-item-modal">
                <div className="resolution-modal-header">
                  <h2>Add New Item</h2>
                  <button
                      className="close-modal-button"
                      onClick={() => setIsAddItemModalOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="add-item-modal-body">
                  <form onSubmit={handleAddItemSubmit} className="add-item-form">
                    <div className="add-item-form-group">
                      <label htmlFor="itemCategoryId">Item Category</label>
                      <select
                          id="itemCategoryId"
                          name="itemCategoryId"
                          value={addItemData.itemCategoryId}
                          onChange={handleAddItemInputChange}
                      >
                        <option value="">All Categories</option>
                        {itemCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                        ))}
                      </select>
                    </div>

                    <div className="add-item-form-group">
                      <label htmlFor="itemTypeId">Item Type</label>
                      <select
                          id="itemTypeId"
                          name="itemTypeId"
                          value={addItemData.itemTypeId}
                          onChange={handleAddItemInputChange}
                          required
                      >
                        <option value="">Select Item Type</option>
                        {getFilteredItemTypes().map((itemType) => (
                            <option key={itemType.id} value={itemType.id}>
                              {itemType.name}
                            </option>
                        ))}
                      </select>
                      {getFilteredItemTypes().length === 0 && addItemData.itemCategoryId && (
                          <span className="form-error-text">
                            No item types found for the selected category
                          </span>
                      )}
                    </div>

                    <div className="add-item-form-group">
                      <label htmlFor="initialQuantity">Initial Quantity</label>
                      <input
                          type="number"
                          id="initialQuantity"
                          name="initialQuantity"
                          value={addItemData.initialQuantity}
                          onChange={handleAddItemInputChange}
                          placeholder="Enter quantity"
                          min="1"
                          required
                      />
                    </div>

                    <div className="add-item-info">
                      <div className="info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                      </div>
                      <div className="info-text">
                        <p className="info-title">Adding Items to Inventory</p>
                        <p className="info-description">
                          If an item of this type already exists in the warehouse, the quantities will be merged.
                          Otherwise, a new inventory entry will be created.
                        </p>
                      </div>
                    </div>

                    <div className="add-item-modal-footer">
                      <button
                          type="button"
                          className="cancel-button"
                          onClick={() => setIsAddItemModalOpen(false)}
                          disabled={addItemLoading}
                      >
                        Cancel
                      </button>
                      <button
                          type="submit"
                          className="add-item-submit-button"
                          disabled={!addItemData.itemTypeId || !addItemData.initialQuantity || addItemLoading}
                      >
                        {addItemLoading ? (
                            <>
                              <div className="button-spinner"></div>
                              Adding...
                            </>
                        ) : (
                            "Add Item"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}



        {/* Snackbar Component */}
        <Snackbar
            type={notificationType}
            text={notificationMessage}
            isVisible={showNotification}
            onClose={closeSnackbar}
            duration={3000}
        />
      </div>
  );
};

export default WarehouseViewItemsTable;