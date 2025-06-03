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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [allItemTypes, setAllItemTypes] = useState([]);
  const [senderOptions, setSenderOptions] = useState([]);
  const [receiverOptions, setReceiverOptions] = useState([]);
  const [warehouseData, setWarehouseData] = useState({
    name: "",
    id: "",
  });

  // Tab state
  const [activeTab, setActiveTab] = useState("pending");

  // Snackbar states
  const [snackbar, setSnackbar] = useState({
    isVisible: false,
    type: 'success',
    text: ''
  });

  const [transactionRole, setTransactionRole] = useState("sender");

  // Site data and selections
  const [allSites, setAllSites] = useState([]);
  const [selectedSenderSite, setSelectedSenderSite] = useState("");
  const [selectedReceiverSite, setSelectedReceiverSite] = useState("");

  // Updated transaction state for multiple items
  const [newTransaction, setNewTransaction] = useState({
    transactionDate: "",
    items: [{ itemType: { id: "" }, quantity: "1" }],
    senderType: "WAREHOUSE",
    senderId: warehouseId,
    receiverType: "",
    receiverId: "",
    batchNumber: "",
  });

  const entityTypes = ["WAREHOUSE", "MERCHANT", "EQUIPMENT"];
  const [userRole, setUserRole] = useState("");

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

  useEffect(() => {
    fetchTransactions();
    fetchItems();
    fetchAllItemTypes();
    fetchWarehouseDetails();
    fetchAllSites();
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

  useEffect(() => {
    try {
      const userInfoString = localStorage.getItem("userInfo");
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        console.log("userrrrifnooo" + userInfo);
        setUserRole(userInfo.role);
        console.log("roleee" + userInfo.role);
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
    }
  }, []);

  // Update sender options when sender site and type changes
  useEffect(() => {
    const updateSenderOptions = async () => {
      if (newTransaction.senderType && selectedSenderSite && transactionRole === "receiver") {
        let senderData = await fetchEntitiesByTypeAndSite(newTransaction.senderType, selectedSenderSite);

        if (newTransaction.senderType === "WAREHOUSE") {
          senderData = senderData.filter((entity) => entity.id !== warehouseId);
        }

        setSenderOptions(senderData);
      } else {
        setSenderOptions([]);
      }
    };

    updateSenderOptions();
  }, [newTransaction.senderType, selectedSenderSite, warehouseId, transactionRole]);

  useEffect(() => {
    if (onAddButtonClick) {
      onAddButtonClick(() => setIsCreateModalOpen(true));
    }
  }, [onAddButtonClick]);

  // Update receiver options when receiver site and type changes
  useEffect(() => {
    const updateReceiverOptions = async () => {
      if (newTransaction.receiverType && selectedReceiverSite && transactionRole === "sender") {
        let receiverData = await fetchEntitiesByTypeAndSite(newTransaction.receiverType, selectedReceiverSite);

        if (newTransaction.receiverType === "WAREHOUSE") {
          receiverData = receiverData.filter((entity) => entity.id !== warehouseId);
        }

        setReceiverOptions(receiverData);
      } else {
        setReceiverOptions([]);
      }
    };

    updateReceiverOptions();
  }, [newTransaction.receiverType, selectedReceiverSite, warehouseId, transactionRole]);

  // Reset form when modal is opened
  useEffect(() => {
    if (isCreateModalOpen) {
      setTransactionRole("sender");
      setNewTransaction({
        transactionDate: "",
        items: [{ itemType: { id: "" }, quantity: "1" }],
        senderType: "WAREHOUSE",
        senderId: warehouseId,
        receiverType: "",
        receiverId: "",
        batchNumber: "",
      });
      setSelectedSenderSite("");
      setSelectedReceiverSite("");
    }
  }, [isCreateModalOpen, warehouseId]);

  // Update transaction data when role changes
  useEffect(() => {
    if (transactionRole === "sender") {
      setNewTransaction(prev => ({
        ...prev,
        senderType: "WAREHOUSE",
        senderId: warehouseId,
        receiverType: "",
        receiverId: "",
      }));
      setSelectedSenderSite("");
      setSelectedReceiverSite("");
    } else if (transactionRole === "receiver") {
      setNewTransaction(prev => ({
        ...prev,
        senderType: "",
        senderId: "",
        receiverType: "WAREHOUSE",
        receiverId: warehouseId,
      }));
      setSelectedSenderSite("");
      setSelectedReceiverSite("");
    }
  }, [transactionRole, warehouseId]);

  const fetchAllSites = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/site`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllSites(data);
      } else {
        console.error("Failed to fetch sites, status:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch sites:", error);
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setWarehouseData({
        name: data.name || "",
        id: data.id || "",
      });
    } catch (error) {
      console.error("Error fetching warehouse details:", error);
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/items/warehouse/${warehouseId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch item types:", error);
    }
  };

  const fetchAllItemTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/itemTypes`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllItemTypes(data);
      }
    } catch (error) {
      console.error("Failed to fetch all item types:", error);
    }
  };

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

  const fetchEntitiesByTypeAndSite = async (entityType, siteId) => {
    if (!entityType || !siteId) return [];

    try {
      const token = localStorage.getItem("token");
      let endpoint;

      if (entityType === "WAREHOUSE") {
        endpoint = `http://localhost:8080/api/v1/warehouses/site/${siteId}`;
      } else if (entityType === "EQUIPMENT") {
        endpoint = `http://localhost:8080/api/v1/site/${siteId}/equipment`;
      } else if (entityType === "MERCHANT") {
        endpoint = `http://localhost:8080/api/v1/merchants/site/${siteId}`;
      } else {
        console.error(`Unsupported entity type: ${entityType}`);
        return [];
      }

      const response = await fetch(endpoint, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`${entityType} for site ${siteId}:`, data);
        return data;
      } else {
        console.error(`Failed to fetch ${entityType} for site ${siteId}, status:`, response.status);
        return [];
      }
    } catch (error) {
      console.error(`Failed to fetch ${entityType} for site ${siteId}:`, error);
      return [];
    }
  };

  const handleInputChange = (e) => {
    const {name, value} = e.target;
    setNewTransaction({
      ...newTransaction,
      [name]: value,
    });
  };

  // Enhanced handleItemChange with quantity validation
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newTransaction.items];

    if (field === 'itemTypeId') {
      updatedItems[index] = {
        ...updatedItems[index],
        itemType: { id: value }
      };
    } else if (field === 'quantity') {
      // Validate quantity for sender role
      if (transactionRole === "sender" && value && updatedItems[index].itemType.id) {
        const warehouseItemsOfType = items.filter(warehouseItem =>
            warehouseItem.itemStatus === "IN_WAREHOUSE" &&
            warehouseItem.itemType.id === updatedItems[index].itemType.id
        );

        if (warehouseItemsOfType.length > 0) {
          const aggregatedItems = aggregateWarehouseItems(warehouseItemsOfType);
          const aggregatedItem = aggregatedItems.find(aggItem => aggItem.itemType.id === updatedItems[index].itemType.id);

          if (aggregatedItem) {
            const totalAvailableQuantity = aggregatedItem.quantity;
            const requestedQuantity = parseInt(value);

            if (requestedQuantity > totalAvailableQuantity) {
              showSnackbar('error', `Not enough quantity available for ${aggregatedItem.itemType.name}. Only ${totalAvailableQuantity} items in stock.`);
              // Don't update the value if it exceeds available quantity
              return;
            }
          }
        }
      }

      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    }

    setNewTransaction({
      ...newTransaction,
      items: updatedItems
    });
  };

  const addItem = () => {
    setNewTransaction({
      ...newTransaction,
      items: [...newTransaction.items, { itemType: { id: "" }, quantity: "1" }]
    });
  };

  const removeItem = (index) => {
    if (newTransaction.items.length <= 1) {
      return;
    }

    const updatedItems = newTransaction.items.filter((_, i) => i !== index);
    setNewTransaction({
      ...newTransaction,
      items: updatedItems
    });
  };

  const handleSenderTypeChange = (e) => {
    setNewTransaction({
      ...newTransaction,
      senderType: e.target.value,
      senderId: "",
    });
  };

  const handleReceiverTypeChange = (e) => {
    setNewTransaction({
      ...newTransaction,
      receiverType: e.target.value,
      receiverId: "",
    });
  };

  const handleSenderSiteChange = (e) => {
    setSelectedSenderSite(e.target.value);
    setNewTransaction({
      ...newTransaction,
      senderType: "",
      senderId: "",
    });
  };

  const handleReceiverSiteChange = (e) => {
    setSelectedReceiverSite(e.target.value);
    setNewTransaction({
      ...newTransaction,
      receiverType: "",
      receiverId: "",
    });
  };

  const handleRoleChange = (e) => {
    setTransactionRole(e.target.value);
  };

  const getAvailableItemTypes = (currentIndex) => {
    const selectedItemTypeIds = newTransaction.items
        .filter((_, idx) => idx !== currentIndex && !!_.itemType.id)
        .map(item => item.itemType.id);

    if (transactionRole === "receiver") {
      return allItemTypes.filter(itemType =>
          !selectedItemTypeIds.includes(itemType.id)
      );
    } else {
      const aggregatedItems = aggregateWarehouseItems(
          items.filter(warehouseItem => warehouseItem.itemStatus === "IN_WAREHOUSE")
      );

      return aggregatedItems.filter(aggregatedItem =>
          !selectedItemTypeIds.includes(aggregatedItem.itemType.id)
      );
    }
  };

  const renderItemOptions = (currentIndex) => {
    const availableItems = getAvailableItemTypes(currentIndex);

    if (transactionRole === "receiver") {
      return availableItems.map((itemType) => (
          <option key={itemType.id} value={itemType.id}>
            {itemType.name}
          </option>
      ));

    } else {
      return availableItems.map((aggregatedItem) => (
          <option key={aggregatedItem.itemType.id} value={aggregatedItem.itemType.id}>
            {aggregatedItem.itemType.name} {aggregatedItem.itemType.measuringUnit ? `(${aggregatedItem.itemType.measuringUnit})` : ""} ({aggregatedItem.quantity} available)
          </option>
      ));
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();

    // Validate items
    for (const item of newTransaction.items) {
      if (!item.itemType.id || !item.quantity) {
        showSnackbar('error', 'Please complete all item fields');
        return;
      }

      // Check if the warehouse is the sender and verify inventory
      if (transactionRole === "sender") {
        const warehouseItemsOfType = items.filter(warehouseItem =>
            warehouseItem.itemStatus === "IN_WAREHOUSE" &&
            warehouseItem.itemType.id === item.itemType.id
        );

        if (warehouseItemsOfType.length === 0) {
          showSnackbar('error', 'Item not found in the warehouse inventory or not available (IN_WAREHOUSE status)');
          return;
        }

        const aggregatedItems = aggregateWarehouseItems(warehouseItemsOfType);
        const aggregatedItem = aggregatedItems.find(aggItem => aggItem.itemType.id === item.itemType.id);

        if (!aggregatedItem) {
          showSnackbar('error', 'Item not found in the warehouse inventory');
          return;
        }

        const totalAvailableQuantity = aggregatedItem.quantity;
        const itemTypeName = aggregatedItem.itemType.name;

        if (totalAvailableQuantity < parseInt(item.quantity)) {
          showSnackbar('error', `Not enough quantity available for ${itemTypeName}. Only ${totalAvailableQuantity} items in stock.`);
          return;
        }
      }
    }

    let username = "system";
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

    const transactionData = {
      transactionDate: newTransaction.transactionDate,
      senderType: newTransaction.senderType,
      senderId: newTransaction.senderId.toString(),
      receiverType: newTransaction.receiverType,
      receiverId: newTransaction.receiverId.toString(),
      username: username,
      batchNumber: parseInt(newTransaction.batchNumber),
      sentFirst: warehouseId,
      items: newTransaction.items.map(item => ({
        itemTypeId: item.itemType.id,
        quantity: parseInt(item.quantity)
      }))
    };

    console.log("Creating transaction:", JSON.stringify(transactionData));

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8080/api/v1/transactions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        fetchTransactions();
        setIsCreateModalOpen(false);
        showSnackbar('success', 'Transaction created successfully!');
      } else {
        const errorText = await response.text();
        console.error("Failed to create transaction:", response.status, errorText);
        showSnackbar('error', 'Failed to create transaction. Please try again.');
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      showSnackbar('error', 'Failed to create transaction. Please check your connection.');
    }
  };

  const aggregateWarehouseItems = (items) => {
    const aggregated = {};

    items.forEach(item => {
      const key = item.itemType?.id;
      if (!key) return;

      if (aggregated[key]) {
        aggregated[key].quantity += item.quantity;
        aggregated[key].individualItems.push(item);
      } else {
        aggregated[key] = {
          ...item,
          quantity: item.quantity,
          individualItems: [item],
          id: `aggregated_${key}`,
          isAggregated: true
        };
      }
    });

    return Object.values(aggregated);
  };

  // Render the active tab content
  const renderActiveTabContent = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;

    const TabComponent = activeTabConfig.component;
    return <TabComponent warehouseId={warehouseId} />;
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
        <div className="header-container3">
          <div className="left-section3">
          </div>
          <div className="right-section3">
            {/* Global search removed as it seems it's not needed based on the design */}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="transaction-tabs-container">
          <div className="transaction-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`transaction-tab ${activeTab === tab.id ? 'active' : ''}`}
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

        {/* Add Transaction Button */}



        {/* Modal for Creating Transaction */}
        {isCreateModalOpen && (
            <div className="modal-backdrop3">
              <div className="modal3">
                <div className="modal-header3">
                  <h2>Create New Transaction</h2>
                  <button className="close-modal3" onClick={() => setIsCreateModalOpen(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                <form className="form-transaction" onSubmit={handleCreateTransaction}>
                  {/* Warehouse Role Selection - Full Width */}
                  <div className="form-group3 full-width">
                    <label>Warehouse Role</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                            type="radio"
                            name="warehouseRole"
                            value="sender"
                            checked={transactionRole === "sender"}
                            onChange={handleRoleChange}
                        />
                        Sender
                      </label>
                      <label className="radio-label">
                        <input
                            type="radio"
                            name="warehouseRole"
                            value="receiver"
                            checked={transactionRole === "receiver"}
                            onChange={handleRoleChange}
                        />
                        Receiver
                      </label>
                    </div>
                  </div>

                  {/* Transaction Date - Full Width */}
                  <div className="form-group3 full-width">
                    <label htmlFor="transactionDate">Transaction Date</label>
                    <input
                        type="datetime-local"
                        id="transactionDate"
                        name="transactionDate"
                        value={newTransaction.transactionDate}
                        onChange={handleInputChange}
                        required
                    />
                  </div>

                  {/* Items Section - Full Width */}
                  <div className="form-group3 full-width">
                    <div className="items-section-header">
                      <label>Transaction Items</label>
                      <button
                          type="button"
                          className="add-item-button"
                          onClick={addItem}
                      >
                        Add Another Item
                      </button>
                    </div>

                    {newTransaction.items.map((item, index) => (
                        <div key={index} className="transaction-item-container">
                          <div className="transaction-item-header">
                            <span>Item {index + 1}</span>
                            {newTransaction.items.length > 1 && (
                                <button
                                    type="button"
                                    className="remove-item-button"
                                    onClick={() => removeItem(index)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                  </svg>
                                  Remove
                                </button>
                            )}
                          </div>
                          <div className="form-row3">
                            <div className="form-group3">
                              <label>Item Type</label>
                              <select
                                  value={item.itemType.id}
                                  onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                  required
                              >
                                <option value="" disabled>Select Item Type</option>
                                {renderItemOptions(index)}
                              </select>
                            </div>

                            <div className="form-group3">
                              <label>Quantity</label>
                              <div className="ro-quantity-unit-container">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      let value = e.target.value.replace(/[^0-9]/g, '');
                                      handleItemChange(index, 'quantity', value);
                                    }}
                                    onBlur={(e) => {
                                      let value = e.target.value.replace(/[^0-9]/g, '');
                                      if (value === '' || parseInt(value) < 1) {
                                        handleItemChange(index, 'quantity', '1');
                                      }
                                    }}
                                    required
                                    className="ro-quantity-input"
                                />
                                {item.itemType.id && (
                                    <span className="ro-unit-label">
                                      {(() => {
                                        let unit = '';
                                        if (transactionRole === "receiver") {
                                          const itemType = allItemTypes.find(it => it.id === item.itemType.id);
                                          unit = itemType?.measuringUnit || '';
                                        } else {
                                          const warehouseItem = items.find(it => it.itemType.id === item.itemType.id);
                                          unit = warehouseItem?.itemType?.measuringUnit || '';
                                        }
                                        return unit;
                                      })()}
                                    </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>

                  {/* Batch Number - Full Width */}
                  <div className="form-group3 full-width">
                    <label htmlFor="batchNumber">Batch Number</label>
                    <input
                        type="number"
                        id="batchNumber"
                        name="batchNumber"
                        value={newTransaction.batchNumber}
                        onChange={handleInputChange}
                        min="1"
                        placeholder="Enter batch number"
                        required
                    />
                  </div>

                  {/* Conditional based on warehouse role */}
                  {transactionRole === "sender" ? (
                      <>
                        {/* When warehouse is sender */}
                        <div className="form-row3">
                          <div className="form-group3">
                            <label>Source (Fixed)</label>
                            <input
                                type="text"
                                value={warehouseData.name}
                                disabled
                                className="disabled-input"
                            />
                          </div>

                          <div className="form-group3">
                            <label htmlFor="receiverSite">Destination Site</label>
                            <select
                                id="receiverSite"
                                value={selectedReceiverSite}
                                onChange={handleReceiverSiteChange}
                                required
                            >
                              <option value="" disabled>Select Site</option>
                              {allSites.map((site) => (
                                  <option key={site.id} value={site.id}>
                                    {site.name}
                                  </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Entity Type Selection (only shown after site is selected) */}
                        {selectedReceiverSite && (
                            <div className="form-group3 full-width">
                              <label htmlFor="receiverType">Destination Type</label>
                              <select
                                  id="receiverType"
                                  name="receiverType"
                                  value={newTransaction.receiverType}
                                  onChange={handleReceiverTypeChange}
                                  required
                              >
                                <option value="" disabled>Select Type</option>
                                {entityTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                                    </option>
                                ))}
                              </select>
                            </div>
                        )}

                        {/* Entity Selection (only shown after type is selected) */}
                        {selectedReceiverSite && newTransaction.receiverType && (
                            <div className="form-group3 full-width">
                              <label htmlFor="receiverId">
                                Select {newTransaction.receiverType.charAt(0).toUpperCase() + newTransaction.receiverType.slice(1).toLowerCase()}
                              </label>
                              <select
                                  id="receiverId"
                                  name="receiverId"
                                  value={newTransaction.receiverId}
                                  onChange={(e) => setNewTransaction({
                                    ...newTransaction,
                                    receiverId: e.target.value
                                  })}
                                  required
                              >
                                <option value="" disabled>Select {newTransaction.receiverType.charAt(0).toUpperCase() + newTransaction.receiverType.slice(1).toLowerCase()}</option>
                                {receiverOptions.length > 0 ? (
                                    receiverOptions.map((entity) => {
                                      let displayName, entityId;

                                      if (newTransaction.receiverType === "EQUIPMENT") {
                                        displayName = entity ? entity.fullModelName : "No model name available";
                                        entityId = entity ? entity.id : entity.id;
                                      } else {
                                        displayName = entity.name;
                                        entityId = entity.id;
                                      }

                                      return (
                                          <option key={entityId} value={entityId}>
                                            {displayName}
                                          </option>
                                      );
                                    })
                                ) : (
                                    <option value="" disabled>No {newTransaction.receiverType.toLowerCase()}s available at this site</option>
                                )}
                              </select>
                            </div>
                        )}
                      </>
                  ) : (
                      <>
                        {/* When warehouse is receiver */}
                        <div className="form-row3">
                          <div className="form-group3">
                            <label htmlFor="senderSite">Source Site</label>
                            <select
                                id="senderSite"
                                value={selectedSenderSite}
                                onChange={handleSenderSiteChange}
                                required
                            >
                              <option value="" disabled>Select Site</option>
                              {allSites.map((site) => (
                                  <option key={site.id} value={site.id}>
                                    {site.name}
                                  </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group3">
                            <label>Destination (Fixed)</label>
                            <input
                                type="text"
                                value={warehouseData.name}
                                disabled
                                className="disabled-input"
                            />
                          </div>
                        </div>

                        {/* Entity Type Selection (only shown after site is selected) */}
                        {selectedSenderSite && (
                            <div className="form-group3 full-width">
                              <label htmlFor="senderType">Source Type</label>
                              <select
                                  id="senderType"
                                  name="senderType"
                                  value={newTransaction.senderType}
                                  onChange={handleSenderTypeChange}
                                  required
                              >
                                <option value="" disabled>Select Type</option>
                                {entityTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                                    </option>
                                ))}
                              </select>
                            </div>
                        )}

                        {/* Entity Selection (only shown after type is selected) */}
                        {selectedSenderSite && newTransaction.senderType && (
                            <div className="form-group3 full-width">
                              <label htmlFor="senderId">
                                Select {newTransaction.senderType.charAt(0).toUpperCase() + newTransaction.senderType.slice(1).toLowerCase()}
                              </label>
                              <select
                                  id="senderId"
                                  name="senderId"
                                  value={newTransaction.senderId}
                                  onChange={(e) => setNewTransaction({
                                    ...newTransaction,
                                    senderId: e.target.value
                                  })}
                                  required
                              >
                                <option value="" disabled>Select {newTransaction.senderType.charAt(0).toUpperCase() + newTransaction.senderType.slice(1).toLowerCase()}</option>
                                {senderOptions.length > 0 ? (
                                    senderOptions.map((entity) => {
                                      let displayName, entityId;

                                      if (newTransaction.senderType === "EQUIPMENT") {
                                        displayName = entity.equipment ? entity.equipment.fullModelName : "No model name available";
                                        entityId = entity.equipment ? entity.equipment.id : entity.id;
                                      } else{
                                        displayName = entity.name;
                                        entityId = entity.id;
                                      }

                                      return (
                                          <option key={entityId} value={entityId}>
                                            {displayName}
                                          </option>
                                      );
                                    })
                                ) : (
                                    <option value="" disabled>No {newTransaction.senderType.toLowerCase()}s available at this site</option>
                                )}
                              </select>
                            </div>
                        )}
                      </>
                  )}

                  <div className="modal-footer3">
                    <button type="submit" className="submit-button3">Create Transaction</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
};

export default WarehouseViewTransactionsTable;