import React, { useState, useEffect } from "react";
import "./WarehouseViewItems.scss";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import InWarehouseItems from "./InWarehouse/InWarehouseItems.jsx";
import DiscrepancyItems from "./DiscrepancyItems/DiscrepancyItems.jsx";
import ResolutionHistory from "./ResolutionHistory/ResolutionHistory.jsx";
import { itemService } from '../../../services/warehouse/itemService';
import { warehouseService } from '../../../services/warehouse/warehouseService';

const WarehouseViewItemsTable = ({ warehouseId, onAddButtonClick, onRestockItems,onDiscrepancyCountChange }) => {
  // Shared states
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inWarehouse');
  const [warehouseData, setWarehouseData] = useState({
    site: {},
    name: "",
    id: "",
    employees: []
  });

  // Snackbar states
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');

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

  // Fetch items data
  const fetchItems = async () => {
    if (!warehouseId) {
      console.error("Warehouse ID is not available");
      return;
    }
    setLoading(true);
    try {
      const data = await itemService.getItemsByWarehouse(warehouseId);
      setTableData(data);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDiscrepancyCounts = () => {
    const missingCount = tableData.filter(item => item.itemStatus === 'MISSING' && !item.resolved).length;
    const excessCount = tableData.filter(item => item.itemStatus === 'OVERRECEIVED' && !item.resolved).length;
    return { missingCount, excessCount, totalDiscrepancies: missingCount + excessCount };
  };

// Add this useEffect to notify parent component about discrepancy counts
  useEffect(() => {
    if (onDiscrepancyCountChange) {
      const counts = getDiscrepancyCounts();
      onDiscrepancyCountChange(counts);
    }
  }, [tableData, onDiscrepancyCountChange]);

  const fetchWarehouseDetails = async () => {
    try {
      const data = await warehouseService.getById(warehouseId);
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

  // Initialize data
  useEffect(() => {
    fetchItems();
    fetchWarehouseDetails();
  }, [warehouseId]);

  // Refresh data function to pass to child components
  const refreshItems = () => {
    fetchItems();
  };

  // Function to get filtered data for current tab
  const getFilteredData = () => {
    return tableData.filter((item) => {
      if (activeTab === 'inWarehouse') {
        return item.itemStatus === 'IN_WAREHOUSE' && !item.resolved;
      }
      if (activeTab === 'missingItems') {
        return item.itemStatus === 'MISSING' && !item.resolved;
      }
      if (activeTab === 'excessItems') {
        return item.itemStatus === 'OVERRECEIVED' && !item.resolved;
      }
      return true;
    });
  };

  const filteredData = getFilteredData();

  return (
      <div className="warehouse-view4">
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

        {/* Tab Content */}
        {activeTab === 'inWarehouse' && (
            <InWarehouseItems
                warehouseId={warehouseId}
                warehouseData={warehouseData}
                filteredData={filteredData}
                loading={loading}
                isLowStock={isLowStock}
                showSnackbar={showSnackbar}
                refreshItems={refreshItems}
                onRestockItems={onRestockItems}  // ADD THIS LINE
            />
        )}

        {(activeTab === 'missingItems' || activeTab === 'excessItems') && (
            <DiscrepancyItems
                warehouseId={warehouseId}
                activeTab={activeTab}
                filteredData={filteredData}
                loading={loading}
                showSnackbar={showSnackbar}
                refreshItems={refreshItems}
            />
        )}

        {activeTab === 'resolvedHistory' && (
            <ResolutionHistory
                warehouseId={warehouseId}
                showSnackbar={showSnackbar}
            />
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