import React, { useState, useEffect } from "react";
import "./WarehouseViewItems.scss";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import InWarehouseItems from "./InWarehouse/InWarehouseItems.jsx";
import DiscrepancyItems from "./DiscrepancyItems/DiscrepancyItems.jsx";
import ResolutionHistory from "./ResolutionHistory/ResolutionHistory.jsx";
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
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

  const fetchItems = async () => {
    if (!warehouseId) {
      console.error("Warehouse ID is not available");
      return;
    }
    setLoading(true);
    try {
      const data = await itemService.getItemsByWarehouse(warehouseId);

      // ADD THESE DEBUG LOGS
      console.log('=== DEBUG: API Response ===');
      console.log('1. Raw data from API:', data);
      console.log('2. Total items received:', data?.length);

      const macbooksFromAPI = data?.filter(item =>
          item.itemType?.name?.toLowerCase().includes('macbook')
      );
      console.log('3. ALL Macbooks from API (before any filtering):', macbooksFromAPI);
      console.log('4. Macbook details:', macbooksFromAPI?.map(m => ({
        id: m.id,
        quantity: m.quantity,
        itemSource: m.itemSource,
        itemStatus: m.itemStatus,
        resolved: m.resolved
      })));
      console.log('=== END DEBUG ===');

      const itemsArray = Array.isArray(data) ? data : [];
      setTableData(itemsArray);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const getDiscrepancyCounts = () => {
    // Ensure tableData is always an array
    if (!Array.isArray(tableData)) {
      return { missingCount: 0, excessCount: 0, totalDiscrepancies: 0 };
    }
    
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
    // Ensure tableData is always an array
    if (!Array.isArray(tableData)) {
      console.warn('tableData is not an array:', tableData);
      return [];
    }
    
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
        <Tabs
            tabs={[
              {
                id: 'inWarehouse',
                label: 'In Warehouse'
              },
              {
                id: 'missingItems',
                label: 'Missing Items',
                badge: Array.isArray(tableData)
                    ? tableData.filter(item => item.itemStatus === 'MISSING' && !item.resolved).length
                    : 0
              },
              {
                id: 'excessItems',
                label: 'Excess Items',
                badge: Array.isArray(tableData)
                    ? tableData.filter(item => item.itemStatus === 'OVERRECEIVED' && !item.resolved).length
                    : 0
              },
              {
                id: 'resolvedHistory',
                label: 'Resolution History'
              }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />

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