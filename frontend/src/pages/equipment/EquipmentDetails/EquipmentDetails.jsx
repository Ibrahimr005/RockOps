import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RiDeleteBin6Line } from "react-icons/ri";
import { FaInfoCircle, FaWrench, FaTools, FaBoxOpen, FaTachometerAlt, FaCalendarAlt, FaCog, FaClipboardList, FaMapMarkerAlt, FaUserTimes } from "react-icons/fa";
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
import DriverManagementModal from './DriverManagementModal';
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage";
import IntroCard from "../../../components/common/IntroCard/IntroCard";

// Set the app element for accessibility
Modal.setAppElement('#root');

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
    const [isUnassignDriverModalOpen, setIsUnassignDriverModalOpen] = useState(false);

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
                const response = await equipmentService.getEquipmentMainPhoto(params.EquipmentID);
                setPreviewImage(response.data);
            } catch (error) {
                console.error("Error fetching equipment photo:", error);
                try {
                    console.log("Retrying with refresh...");
                    const refreshResponse = await equipmentService.refreshEquipmentMainPhoto(params.EquipmentID);
                    setPreviewImage(refreshResponse.data);
                } catch (refreshError) {
                    console.error("Error refreshing equipment photo:", refreshError);
                }
            }
        };

        fetchEquipmentData();
        fetchEquipmentPhoto();
    }, [params.EquipmentID]);

    const handleDriverUnassigned = async () => {
        try {
            const response = await equipmentService.getEquipmentById(params.EquipmentID);
            setEquipmentData(response.data);
            showSuccess('Driver successfully unassigned from equipment and site');
        } catch (error) {
            console.error('Error refreshing equipment data:', error);
            showError('Driver unassigned but failed to refresh data');
        }
    };

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

    const handleViewFullDetails = () => {
        navigate(`../info/${params.EquipmentID}`);
    };

    if (loading) return <LoadingPage />;
    if (error) return <div className="error-message">Error: {error}</div>;

    const breadcrumbs = [
        {
            label: 'Equipment',
            icon: <FaCog />,
            onClick: () => navigate('/equipment')
        },
        {
            label: 'Details',
            icon: <FaClipboardList />,
            onClick: () => navigate('/equipment')
        },
        {
            label: equipmentData?.name || 'Equipment',
            icon: <FaTools />
        }
    ];

    // Helper function to format status text
    const formatStatus = (status) => {
        if (!status) return 'N/A';
        // Convert underscore to space and capitalize each word
        return status.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const stats = [
        {
            label: 'Type',
            value: equipmentData?.typeName || 'N/A'
        },
        {
            label: 'Model',
            value: equipmentData?.model || 'N/A'
        },
        {
            label: 'Site',
            value: equipmentData?.siteName || 'N/A'
        },
        {
            label: 'Status',
            value: formatStatus(equipmentData?.status),
            badge: true,
            badgeType: equipmentData?.status?.toLowerCase().replace('_', '-')
        }
    ];

    // Add driver info to stats if applicable
    if (equipmentData?.drivable) {
        stats.push({
            label: 'Main Driver',
            value: equipmentData?.mainDriverName || 'Not Assigned'
        });
        if (equipmentData?.subDriverName) {
            stats.push({
                label: 'Sub Driver',
                value: equipmentData.subDriverName
            });
        }
    }

    // Build action buttons array
    const actionButtons = [
        {
            icon: <FaInfoCircle />,
            text: 'Full Details',
            onClick: handleViewFullDetails,
            className: 'secondary'
        }
    ];

    // Add Active Maintenance Record button if equipment is in maintenance
    if (equipmentData?.status === 'IN_MAINTENANCE' && equipmentData?.activeMaintenanceRecordId) {
        actionButtons.push({
            icon: <FaWrench />,
            text: 'Active Maintenance Record',
            onClick: () => {
                // Navigate to the active maintenance record with overview tab
                navigate(`/maintenance/records/${equipmentData.activeMaintenanceRecordId}?tab=overview`);
            },
            className: 'warning'
        });
    }
    
    // Debug: Log equipment status and activeMaintenanceRecordId
    console.log('Equipment Status:', equipmentData?.status);
    console.log('Active Maintenance Record ID:', equipmentData?.activeMaintenanceRecordId);
    console.log('Button should show:', equipmentData?.status === 'IN_MAINTENANCE' && equipmentData?.activeMaintenanceRecordId);

    // Add Manage Drivers button for all drivable equipment (regardless of assignment status)
    if (equipmentData?.drivable && permissions.canEdit) {
        actionButtons.push({
            icon: <FaUserTimes />,
            text: 'Manage Drivers',
            onClick: () => setIsUnassignDriverModalOpen(true),
            className: 'secondary'
        });
    }

    return (
        <div className="equipment-details-container">
            <IntroCard
                title={equipmentData?.name || "Equipment"}
                label="EQUIPMENT MANAGEMENT"
                breadcrumbs={breadcrumbs}
                lightModeImage={previewImage || equipmentData?.imageUrl}
                darkModeImage={previewImage || equipmentData?.imageUrl}
                stats={stats}
                actionButtons={actionButtons}
            />

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
                            <EquipmentSarkyMatrix
                                ref={sarkyAttendanceRef}
                                equipmentId={params.EquipmentID}
                                onDataChange={handleSarkyDataChange}
                            />
                        </div>
                    )}

                    {activeTab === "maintenance" && (
                        <div className="tab-panel">
                            <div className="tab-content-container">
                                <InSiteMaintenanceLog
                                    ref={inSiteMaintenanceLogRef}
                                    equipmentId={params.EquipmentID}
                                    onAddMaintenanceClick={handleAddInSiteMaintenance}
                                    onAddTransactionClick={handleAddTransactionToMaintenance}
                                    showAddButton={true}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "transactions" && permissions.canEdit && (
                        <div className="tab-panel">
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

            {isUnassignDriverModalOpen && permissions.canEdit && (
                <DriverManagementModal
                    isOpen={isUnassignDriverModalOpen}
                    onClose={() => setIsUnassignDriverModalOpen(false)}
                    equipmentId={params.EquipmentID}
                    equipmentData={equipmentData}
                    onDriverChanged={handleDriverUnassigned}
                />
            )}
        </div>
    );
};

export default EquipmentDetails;