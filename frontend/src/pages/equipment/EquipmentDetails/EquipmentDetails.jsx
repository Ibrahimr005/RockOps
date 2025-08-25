import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RiDeleteBin6Line } from "react-icons/ri";
import { FaInfoCircle, FaWrench, FaTools, FaBoxOpen, FaTachometerAlt, FaCalendarAlt } from "react-icons/fa";
import "./EquipmentDetails.scss";
import InSiteMaintenanceLog from "../InSiteMaintenanceLog/InSiteMaintenanceLog";
import EquipmentConsumablesInventory from "../EquipmentConsumablesInventory/EquipmentConsumablesInventory ";
import EquipmentDashboard from "../EquipmentDashboard/EquipmentDashboard";
import Modal from "react-modal";
import MaintenanceTransactionModal from '../MaintenanceTransactionModal/MaintenanceTransactionModal';
import MaintenanceAddModal from '../MaintenanceAddModal/MaintenanceAddModal';
import AddConsumablesModal from '../EquipmentConsumablesInventory/AddConsumablesModal/AddConsumablesModal';
import { equipmentService } from "../../../services/equipmentService";
import { useSnackbar } from "../../../contexts/SnackbarContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useEquipmentPermissions } from "../../../utils/rbac";
import TransactionHub from "../../../components/equipment/TransactionHub/TransactionHub";
import EquipmentSarkyMatrix from '../EquipmentSarkyMatrix/EquipmentSarkyMatrix';

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
                                <h2 className="panel-title">Consumables </h2>
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
                                <h2 className="panel-title">Daily Work Log</h2>
                            </div>
                            {/* Remove the tab-content-container wrapper for sarky matrix to allow sticky header */}
                            <EquipmentSarkyMatrix
                                ref={sarkyAttendanceRef}
                                equipmentId={params.EquipmentID}
                                onDataChange={handleSarkyDataChange}
                            />
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
                                    showAddButton={true} // Use DataTable's add button for consistency
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "transactions" && permissions.canEdit && (
                        <div className="tab-panel">
                            <div className="panel-header">
                                <h2 className="panel-title">Equipment Transactions</h2>
                            </div>
                            <div className="tab-content-container">
                                <TransactionHub
                                    ref={unifiedTransactionsRef}
                                    equipmentId={params.EquipmentID}
                                    onTransactionUpdate={refreshAllTabs}
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