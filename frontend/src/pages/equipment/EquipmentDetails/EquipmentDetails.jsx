import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RiDeleteBin6Line } from "react-icons/ri";
import { FaInfoCircle, FaWrench, FaTools, FaBoxOpen, FaTachometerAlt, FaCalendarAlt } from "react-icons/fa";
import axios from "axios";
import "./EquipmentDetails.scss";
import SarkyAttendance from "../SarkyAttendance/SarkyAttendance";
import InSiteMaintenanceLog from "../InSiteMaintenanceLog/InSiteMaintenanceLog";
import EquipmentConsumablesInventory from "../EquipmentConsumablesInventory/EquipmentConsumablesInventory ";
import EquipmentDashboard from "./EquipmentDashboard/EquipmentDashboard";
import Modal from "react-modal";
import MaintenanceTransactionModal from '../MaintenanceTransactionModal/MaintenanceTransactionModal';
import MaintenanceAddModal from '../MaintenanceAddModal/MaintenanceAddModal';
import AddConsumablesModal from '../EquipmentConsumablesInventory/AddConsumablesModal/AddConsumablesModal';
import { equipmentService } from "../../../services/equipmentService";
import { useSnackbar } from "../../../contexts/SnackbarContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useEquipmentPermissions } from "../../../utils/rbac";
import UnifiedTransactionsView from "../UnifiedTransactionsView/UnifiedTransactionsView";
import {sarkyService} from "../../../services/sarkyService";

// Set the app element for accessibility
Modal.setAppElement('#root'); // Adjust this to match your root element ID

const EquipmentDetails = () => {
    const params = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    const [activeTab, setActiveTab] = useState("dashboard");
    const [equipmentData, setEquipmentData] = useState({
        fullModelName: "",
        site: { name: "" },
        mainDriver: { firstName: "", lastName: "" },
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);

    // Modal states
    const [isAddConsumableModalOpen, setIsAddConsumableModalOpen] = useState(false);
    const [showCreateNotification, setShowCreateNotification] = useState(false);
    const [isAddMaintenanceModalOpen, setIsAddMaintenanceModalOpen] = useState(false);
    const [isMaintenanceTransactionModalOpen, setIsMaintenanceTransactionModalOpen] = useState(false);

    // Refs for child components
    const dashboardRef = useRef(null);
    const sarkyAttendanceRef = useRef(null);
    const consumablesLogRef = useRef(null);
    const inSiteMaintenanceLogRef = useRef(null);
    const consumablesInventoryRef = useRef(null);
    const unifiedTransactionsRef = useRef();

    // Fetch equipment data
    useEffect(() => {
        const fetchEquipmentData = async () => {
            try {
                const response = await equipmentService.getEquipmentById(params.EquipmentID);
                setEquipmentData(response.data);
                console.log("=== EQUIPMENT DATA FETCHED ===");
                console.log("Equipment response:", response.data);
                console.log("Main Driver ID:", response.data?.mainDriverId);
                console.log("Main Driver Name:", response.data?.mainDriverName);
                console.log("===============================");

                setLoading(false);
            } catch (error) {
                console.error("Error fetching equipment data:", error);
                setError(error.message);
                setLoading(false);
            }
        };
        const fetchEquipmentPhoto = async () => {
            try {
                // You can use the custom equipmentService method for fetching photos
                const response = await equipmentService.getEquipmentMainPhoto(params.EquipmentID);
                setPreviewImage(response.data);
            } catch (error) {
                console.error("Error fetching equipment photo:", error);
            }
        };

        fetchEquipmentData();
        fetchEquipmentPhoto();
    }, [params.EquipmentID]);

    const handleAddTransactionToMaintenance = (maintenanceId) => {
        setSelectedMaintenanceId(maintenanceId);
        setIsMaintenanceTransactionModalOpen(true);
    };

    // Refresh Sarky log after adding new entry
    const refreshSarkyLog = () => {
        if (sarkyAttendanceRef.current) {
            sarkyAttendanceRef.current.refreshData();
        }
        if (dashboardRef.current) {
            dashboardRef.current.refreshDashboard();
        }
    };

    // Handler for when sarky data changes
    const handleSarkyDataChange = () => {
        if (dashboardRef.current) {
            dashboardRef.current.refreshDashboard();
        }
    };

    // Refresh all data after a successful transaction
    const refreshAllTabs = () => {
        if (consumablesInventoryRef.current) {
            consumablesInventoryRef.current.refreshLogs();
        }
        if (sarkyAttendanceRef.current) {
            sarkyAttendanceRef.current.refreshData();
        }
        if (inSiteMaintenanceLogRef.current) {
            inSiteMaintenanceLogRef.current.refreshLogs();
        }
        if (dashboardRef.current) {
            dashboardRef.current.refreshDashboard();
        }
        if (unifiedTransactionsRef.current) {
            unifiedTransactionsRef.current.refreshTransactions();
        }
    };

    // Add handler for adding maintenance
    const handleAddInSiteMaintenance = () => {
        setIsAddMaintenanceModalOpen(true);
    };

    // Add handlers for transaction accept/reject
    const handleAcceptTransaction = (transaction) => {
        // You can implement accept logic here
        // For now, just show an alert - you can expand this later
        alert(`Accept transaction ${transaction.id} - Feature to be implemented`);
        console.log('Accepting transaction:', transaction);
    };

    const handleRejectTransaction = (transaction) => {
        // You can implement reject logic here
        // For now, just show an alert - you can expand this later
        alert(`Reject transaction ${transaction.id} - Feature to be implemented`);
        console.log('Rejecting transaction:', transaction);
    };

    const handleUpdateTransaction = (transaction) => {
        // Implement update transaction logic
        console.log('Updating transaction:', transaction);
        alert(`Update transaction ${transaction.id} - Feature to be implemented`);
    };

    const handleViewFullDetails = () => {
        navigate(`../info/${params.EquipmentID}`);
    };

    if (loading) return <div className="loading-spinner">Loading...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="equipment-details-container">

            {/* Equipment Summary Section */}
            {/* Equipment Summary Section */}

            {/*<h1 className="SectionHeaderLabel">Equipment Details</h1>*/}

            {/* Equipment Card - styled like warehouse card */}

            <div className="equipment-card-header">
                <div className="left-side">
                    <img
                        src={previewImage || equipmentData?.imageUrl}
                        alt="Equipment"
                        className="equipment-image"
                        onError={(e) => { e.target.src = previewImage; }}
                    />
                </div>
                <div className="center-content">
                    <div className="label">EQUIPMENT NAME</div>
                    <div className="value">{equipmentData?.name || "Equipment"}</div>
                    
                    {/* Driver Information Section */}
                    <div className="driver-info-section">
                        <div className="driver-config">
                            <span className={`driver-status ${equipmentData?.drivable ? 'drivable' : 'non-drivable'}`}>
                                {equipmentData?.drivable ? '🚗 Driver Assignable' : '🔧 No Driver Required'}
                            </span>
                        </div>
                        
                        {equipmentData?.drivable && (
                            <div className="driver-assignments">
                                <div className="driver-item">
                                    <span className="driver-label">Main Driver:</span>
                                    <span className="driver-name">
                                        {equipmentData?.mainDriverName || 'Not Assigned'}
                                    </span>
                                </div>
                                {equipmentData?.subDriverName && (
                                    <div className="driver-item">
                                        <span className="driver-label">Sub Driver:</span>
                                        <span className="driver-name">
                                            {equipmentData.subDriverName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="right-side">
                    <button className="info-button-eq" onClick={handleViewFullDetails}>
                        <FaInfoCircle />
                    </button>
                    {permissions.canDelete && (
                        <button className="delete-button-eq" title="Delete Equipment">
                            <RiDeleteBin6Line />
                        </button>
                    )}
                </div>
            </div>
            {/* Tab Navigation */}

            <div className="new-tabs-container">

                <div className="new-tabs-header">
                    <button
                        className={`new-tab-button ${activeTab === "dashboard" ? "active" : ""}`}
                        onClick={() => setActiveTab("dashboard")}
                    >
                        <FaTachometerAlt /> Dashboard
                    </button>
                    <button
                        className={`new-tab-button ${activeTab === "consumables" ? "active" : ""}`}
                        onClick={() => setActiveTab("consumables")}
                    >
                        <FaBoxOpen /> Consumables
                    </button>
                    <button
                        className={`new-tab-button ${activeTab === "sarky" ? "active" : ""}`}
                        onClick={() => setActiveTab("sarky")}
                    >
                        <FaCalendarAlt /> Sarky Management
                    </button>
                    <button
                        className={`new-tab-button ${activeTab === "maintenance" ? "active" : ""}`}
                        onClick={() => setActiveTab("maintenance")}
                    >
                        <FaWrench /> In-Site Maintenance
                    </button>
                    {permissions.canEdit && (
                        <button
                            className={`new-tab-button ${activeTab === "transactions" ? "active" : ""}`}
                            onClick={() => setActiveTab("transactions")}
                        >
                            <FaTools /> All Transactions
                        </button>
                    )}
                </div>
                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === "dashboard" && (
                        <div className="tab-panel">
                            <div className="panel-header">
                                <h2 className="panel-title">Equipment Dashboard</h2>
                            </div>
                            <div className="tab-content-container">
                                <EquipmentDashboard
                                    ref={dashboardRef}
                                    equipmentId={params.EquipmentID}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "consumables" && (
                        <div className="tab-panel">
                            <div className="panel-header">
                                <h2 className="panel-title">Consumables Inventory</h2>
                            </div>
                            <div className="tab-content-container">
                                <EquipmentConsumablesInventory
                                    ref={consumablesInventoryRef}
                                    equipmentId={params.EquipmentID}
                                    onAddClick={() => permissions.canCreate && setIsAddConsumableModalOpen(true)}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "sarky" && (
                        <div className="tab-panel">
                            <div className="panel-header">
                                <h2 className="panel-title">Sarky Management</h2>
                                <div className="panel-actions">
                                    <button
                                        className="help-button"
                                        onClick={() => {
                                            alert(`Sarky Management Help:
• Select month and year to view sarky records
• Click "Generate Monthly Sarky" to create entries for the entire month
• Fill in Work Type, Hours, and Driver for each day using inline editing
• Click "Save" for individual entries or "Save All" for bulk saving
• Green entries are completed, blue entries are drafts
• Range entries (orange) are read-only and part of multi-day ranges`);
                                        }}
                                        title="Help & Instructions"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M9,9a3,3,0,0,1,5.5-1.5"/>
                                            <path d="M12,17.02v.01"/>
                                        </svg>
                                        Help
                                    </button>

                                    <button
                                        className="export-button"
                                        onClick={async () => {
                                            try {
                                                // Export sarky data for the current month
                                                const month = new Date().getMonth();
                                                const year = new Date().getFullYear();

                                                const singleResponse = await sarkyService.getByEquipment(params.EquipmentID);
                                                const rangeResponse = await sarkyService.getRangeByEquipment(params.EquipmentID);

                                                let exportData = [];

                                                // Process single entries
                                                if (singleResponse.data) {
                                                    singleResponse.data.forEach(sarky => {
                                                        const date = new Date(sarky.date);
                                                        if (date.getMonth() === month && date.getFullYear() === year) {
                                                            exportData.push({
                                                                date: sarky.date,
                                                                type: 'Single Day',
                                                                workType: sarky.workType?.name || 'Unknown',
                                                                hours: sarky.workedHours,
                                                                driver: sarky.driverName,
                                                                status: 'Completed'
                                                            });
                                                        }
                                                    });
                                                }

                                                // Process range entries
                                                if (rangeResponse.data) {
                                                    rangeResponse.data.forEach(range => {
                                                        if (range.workEntries) {
                                                            range.workEntries.forEach(entry => {
                                                                const date = new Date(entry.date);
                                                                if (date.getMonth() === month && date.getFullYear() === year) {
                                                                    exportData.push({
                                                                        date: entry.date,
                                                                        type: 'Range Entry',
                                                                        workType: entry.workType?.name || 'Unknown',
                                                                        hours: entry.workedHours,
                                                                        driver: entry.driverName,
                                                                        status: range.status || 'Completed'
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }

                                                // Create CSV content
                                                const csvContent = [
                                                    ['Date', 'Type', 'Work Type', 'Hours', 'Driver', 'Status'],
                                                    ...exportData.map(row => [
                                                        row.date, row.type, row.workType, row.hours, row.driver, row.status
                                                    ])
                                                ].map(row => row.join(',')).join('\n');

                                                // Download CSV
                                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `sarky-data-${equipmentData?.name || 'equipment'}-${year}-${month + 1}.csv`;
                                                a.click();
                                                window.URL.revokeObjectURL(url);

                                                showSuccess('Sarky data exported successfully');
                                            } catch (error) {
                                                console.error('Error exporting sarky data:', error);
                                                showError('Failed to export sarky data');
                                            }
                                        }}
                                        title="Export current month's data"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="7,10 12,15 17,10"/>
                                            <line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                        Export
                                    </button>
                                </div>
                            </div>
                            <div className="tab-content-container">
                                <SarkyAttendance
                                    ref={sarkyAttendanceRef}
                                    equipmentId={params.EquipmentID}
                                    onSarkyAdded={refreshSarkyLog}
                                    equipmentData={equipmentData}
                                    onDataChange={handleSarkyDataChange}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "maintenance" && (
                        <div className="tab-panel">
                            <div className="panel-header">
                                <h2 className="panel-title">In-Site Maintenance History</h2>
                            </div>
                            <div className="tab-content-container">
                                <InSiteMaintenanceLog
                                    ref={inSiteMaintenanceLogRef}
                                    equipmentId={params.EquipmentID}
                                    onAddMaintenanceClick={handleAddInSiteMaintenance}
                                    onAddTransactionClick={handleAddTransactionToMaintenance}
                                    showAddButton={false} // Hide floating add button since we have one in header
                                />
                            </div>
                            {permissions.canCreate && (
                                <button className="add-button-warehouse" onClick={handleAddInSiteMaintenance}>
                                    <svg className="plus-icon-warehouse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14"/>
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === "transactions" && permissions.canEdit && (
                        <div className="tab-panel">
                            <div className="panel-header">
                                <h2 className="panel-title">Equipment Transactions</h2>
                            </div>
                            <div className="tab-content-container">
                                <UnifiedTransactionsView
                                    ref={unifiedTransactionsRef}
                                    entityId={params.EquipmentID}
                                    entityType="EQUIPMENT"
                                    onAcceptTransaction={handleAcceptTransaction}
                                    onRejectTransaction={handleRejectTransaction}
                                    onUpdateTransaction={handleUpdateTransaction}
                                />
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Add Consumable Modal */}
            {permissions.canCreate && (
                <AddConsumablesModal
                    isOpen={isAddConsumableModalOpen}
                    onClose={() => setIsAddConsumableModalOpen(false)}
                    equipmentId={params.EquipmentID}
                    equipmentData={equipmentData}
                    onTransactionAdded={refreshAllTabs}
                />
            )}

            {/* Modals */}
            {isAddMaintenanceModalOpen && permissions.canCreate && (
                <MaintenanceAddModal
                    isOpen={isAddMaintenanceModalOpen}
                    onClose={() => setIsAddMaintenanceModalOpen(false)}
                    equipmentId={params.EquipmentID}
                    onMaintenanceAdded={refreshAllTabs}
                />
            )}

            {isMaintenanceTransactionModalOpen && permissions.canCreate && (
                <MaintenanceTransactionModal
                    isOpen={isMaintenanceTransactionModalOpen}
                    onClose={() => setIsMaintenanceTransactionModalOpen(false)}
                    equipmentId={params.EquipmentID}
                    maintenanceId={selectedMaintenanceId}
                    onTransactionAdded={refreshAllTabs}
                />
            )}
        </div>
    );
};

export default EquipmentDetails;