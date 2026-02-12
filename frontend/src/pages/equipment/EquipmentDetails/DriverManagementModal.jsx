// DriverManagementModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserTimes, FaUserPlus, FaExchangeAlt } from 'react-icons/fa';
import { equipmentService } from '../../../services/equipmentService';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import './DriverManagementModal.scss';

const DriverManagementModal = ({ isOpen, onClose, equipmentId, equipmentData, onDriverChanged }) => {
    const [drivers, setDrivers] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [error, setError] = useState(null);
    const { showSuccess, showError } = useSnackbar();

    // View state: 'list', 'assign', 'replace'
    const [viewMode, setViewMode] = useState('list');
    const [selectedDriverType, setSelectedDriverType] = useState(null); // 'main' or 'sub'
    const [selectedDriver, setSelectedDriver] = useState(null);

    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    // Dirty state tracking
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && equipmentId) {
            fetchDrivers();
            if (equipmentData?.typeId) {
                fetchAvailableDrivers(equipmentData.typeId);
            }
        }
    }, [isOpen, equipmentId, equipmentData]);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await equipmentService.getEquipmentDrivers(equipmentId);
            setDrivers(response.data.drivers || []);
        } catch (err) {
            console.error('Error fetching drivers:', err);
            setError('Failed to load drivers');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableDrivers = async (typeId) => {
        try {
            const response = await equipmentService.getEligibleDriversForEquipmentType(typeId);
            setAvailableDrivers(response.data || []);
        } catch (err) {
            console.error('Error fetching available drivers:', err);
            showError('Failed to load available drivers');
        }
    };

    const handleUnassignClick = (driverId, driverType, driverName) => {
        setConfirmAction({
            type: 'unassign',
            driverId,
            driverType,
            driverName
        });
        setShowConfirmDialog(true);
    };

    const handleAssignClick = (driverType) => {
        setIsFormDirty(true);
        const existingDriver = drivers.find(d => d.type === driverType);
        if (existingDriver) {
            showError(`A ${driverType} driver is already assigned. Please unassign or replace them first.`);
            return;
        }

        setSelectedDriverType(driverType);
        setViewMode('assign');
    };

    const handleReplaceClick = (driverType) => {
        setIsFormDirty(true);
        setSelectedDriverType(driverType);
        setViewMode('replace');
    };

    const handleSelectDriverForAssign = (driver) => {
        setSelectedDriver(driver);
        setConfirmAction({
            type: 'assign',
            driverId: driver.id,
            driverType: selectedDriverType,
            driverName: driver.fullName
        });
        setShowConfirmDialog(true);
    };

    const handleSelectDriverForReplace = (driver) => {
        setSelectedDriver(driver);
        const existingDriver = drivers.find(d => d.type === selectedDriverType);
        setConfirmAction({
            type: 'replace',
            oldDriverId: existingDriver.id,
            oldDriverName: existingDriver.name,
            newDriverId: driver.id,
            newDriverName: driver.fullName,
            driverType: selectedDriverType
        });
        setShowConfirmDialog(true);
    };

    const handleConfirmAction = async () => {
        if (!confirmAction) return;

        try {
            setProcessing(confirmAction.type);
            setShowConfirmDialog(false);

            if (confirmAction.type === 'unassign') {
                await equipmentService.unassignDriverFromEquipment(
                    equipmentId,
                    confirmAction.driverId,
                    confirmAction.driverType
                );
                showSuccess(`${confirmAction.driverName} has been unassigned successfully`);
            } else if (confirmAction.type === 'assign') {
                await equipmentService.assignDriverToEquipment(
                    equipmentId,
                    confirmAction.driverId,
                    confirmAction.driverType
                );
                showSuccess(`${confirmAction.driverName} has been assigned as ${confirmAction.driverType} driver`);
            } else if (confirmAction.type === 'replace') {
                // First unassign, then assign
                await equipmentService.unassignDriverFromEquipment(
                    equipmentId,
                    confirmAction.oldDriverId,
                    confirmAction.driverType
                );
                await equipmentService.assignDriverToEquipment(
                    equipmentId,
                    confirmAction.newDriverId,
                    confirmAction.driverType
                );
                showSuccess(`${confirmAction.driverType} driver replaced successfully`);
            }

            await fetchDrivers();
            
            if (onDriverChanged) {
                onDriverChanged();
            }

            // Reset view to list after action
            setViewMode('list');
            setSelectedDriverType(null);
            setSelectedDriver(null);
        } catch (err) {
            console.error('Error performing action:', err);
            const errorMessage = err.response?.data?.message || `Failed to ${confirmAction.type} driver`;
            showError(errorMessage);
        } finally {
            setProcessing(null);
            setConfirmAction(null);
        }
    };

    const handleCancelAction = () => {
        setShowConfirmDialog(false);
        setConfirmAction(null);
        setSelectedDriver(null);
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedDriverType(null);
        setSelectedDriver(null);
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    const getConfirmDialogProps = () => {
        if (!confirmAction) return {};

        switch (confirmAction.type) {
            case 'unassign':
                return {
                    title: 'Unassign Driver',
                    message: `Are you sure you want to unassign ${confirmAction.driverName}? This will also remove them from the site.`,
                    confirmText: 'Unassign',
                    type: 'warning'
                };
            case 'assign':
                return {
                    title: 'Assign Driver',
                    message: `Assign ${confirmAction.driverName} as ${confirmAction.driverType} driver to this equipment?`,
                    confirmText: 'Assign',
                    type: 'info'
                };
            case 'replace':
                return {
                    title: 'Replace Driver',
                    message: `Replace ${confirmAction.oldDriverName} with ${confirmAction.newDriverName} as ${confirmAction.driverType} driver?`,
                    confirmText: 'Replace',
                    type: 'warning'
                };
            default:
                return {};
        }
    };

    // Filter out already assigned drivers from available list
    const getFilteredAvailableDrivers = () => {
        const assignedDriverIds = drivers.map(d => d.id);
        return availableDrivers.filter(driver => !assignedDriverIds.includes(driver.id));
    };

    const hasMainDriver = drivers.some(d => d.type === 'main');
    const hasSubDriver = drivers.some(d => d.type === 'sub');

    if (!isOpen) return null;

    const dialogProps = getConfirmDialogProps();

    return (
        <>
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container modal-md">
                    <div className="modal-header">
                        <h2 className="modal-title">
                            {viewMode === 'list' && 'Manage Equipment Drivers'}
                            {viewMode === 'assign' && `Assign ${selectedDriverType === 'main' ? 'Main' : 'Sub'} Driver`}
                            {viewMode === 'replace' && `Replace ${selectedDriverType === 'main' ? 'Main' : 'Sub'} Driver`}
                        </h2>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="modal-body">
                        {loading ? (
                            <div className="driver-modal-loading">
                                <div className="driver-modal-spinner"></div>
                                <p>Loading drivers...</p>
                            </div>
                        ) : error ? (
                            <div className="driver-modal-error">
                                <p>{error}</p>
                                <button className="driver-modal-retry-btn" onClick={fetchDrivers}>
                                    Retry
                                </button>
                            </div>
                        ) : viewMode === 'list' ? (
                            <>
                                {drivers.length === 0 ? (
                                    <div className="driver-modal-empty">
                                        <div className="driver-modal-empty-icon">
                                            <FaUserTimes />
                                        </div>
                                        <h3>No Drivers Assigned</h3>
                                        <p>This equipment currently has no drivers assigned.</p>
                                    </div>
                                ) : (
                                    <div className="driver-modal-list">
                                        {drivers.map((driver) => (
                                            <div key={driver.id} className="driver-modal-item">
                                                <div className="driver-modal-info">
                                                    <div className="driver-modal-name">{driver.name}</div>
                                                    <div className="driver-modal-role">{driver.role}</div>
                                                </div>
                                                <div className="driver-modal-actions">
                                                    <button
                                                        className="driver-modal-replace-btn"
                                                        onClick={() => handleReplaceClick(driver.type)}
                                                        disabled={processing}
                                                        title="Replace driver"
                                                    >
                                                        <FaExchangeAlt /> Replace
                                                    </button>
                                                    <button
                                                        className="driver-modal-unassign-btn"
                                                        onClick={() => handleUnassignClick(driver.id, driver.type, driver.name)}
                                                        disabled={processing}
                                                    >
                                                        {processing === 'unassign' ? 'Unassigning...' : 'Unassign'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action buttons to assign drivers */}
                                <div className="driver-modal-assign-section">
                                    <h3>Assign Drivers</h3>
                                    <div className="driver-modal-assign-buttons">
                                        {!hasMainDriver && (
                                            <button
                                                className="driver-modal-assign-new-btn main"
                                                onClick={() => handleAssignClick('main')}
                                                disabled={processing}
                                            >
                                                <FaUserPlus /> Assign Main Driver
                                            </button>
                                        )}
                                        {!hasSubDriver && (
                                            <button
                                                className="driver-modal-assign-new-btn sub"
                                                onClick={() => handleAssignClick('sub')}
                                                disabled={processing}
                                            >
                                                <FaUserPlus /> Assign Sub Driver
                                            </button>
                                        )}
                                    </div>
                                    {hasMainDriver && hasSubDriver && (
                                        <p className="driver-modal-info-text">All driver positions are filled.</p>
                                    )}
                                </div>
                            </>
                        ) : (viewMode === 'assign' || viewMode === 'replace') ? (
                            <>
                                <button className="driver-modal-back-btn" onClick={handleBackToList}>
                                    ← Back to Drivers List
                                </button>
                                
                                {getFilteredAvailableDrivers().length === 0 ? (
                                    <div className="driver-modal-empty">
                                        <div className="driver-modal-empty-icon">
                                            <FaUserTimes />
                                        </div>
                                        <h3>No Available Drivers</h3>
                                        <p>No eligible drivers are available for this equipment type.</p>
                                    </div>
                                ) : (
                                    <div className="driver-modal-list">
                                        {getFilteredAvailableDrivers().map((driver) => (
                                            <div key={driver.id} className="driver-modal-item selectable">
                                                <div className="driver-modal-info">
                                                    <div className="driver-modal-name">{driver.fullName}</div>
                                                    <div className="driver-modal-position">{driver.positionName || 'N/A'}</div>
                                                </div>
                                                <button
                                                    className="driver-modal-select-btn"
                                                    onClick={() => viewMode === 'assign' ? 
                                                        handleSelectDriverForAssign(driver) : 
                                                        handleSelectDriverForReplace(driver)}
                                                    disabled={processing}
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type={dialogProps.type || 'info'}
                title={dialogProps.title || 'Confirm Action'}
                message={dialogProps.message || 'Are you sure?'}
                confirmText={dialogProps.confirmText || 'Confirm'}
                cancelText="Cancel"
                onConfirm={handleConfirmAction}
                onCancel={handleCancelAction}
                size="medium"
                showIcon={true}
            />

            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
                onCancel={() => setShowDiscardDialog(false)}
                size="medium"
            />
        </>
    );
};

export default DriverManagementModal;

