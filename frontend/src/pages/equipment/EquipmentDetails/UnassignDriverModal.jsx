// UnassignDriverModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserTimes } from 'react-icons/fa';
import { equipmentService } from '../../../services/equipmentService';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';

const UnassignDriverModal = ({ isOpen, onClose, equipmentId, onDriverUnassigned }) => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unassigning, setUnassigning] = useState(null);
    const [error, setError] = useState(null);

    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);

    useEffect(() => {
        if (isOpen && equipmentId) {
            fetchDrivers();
        }
    }, [isOpen, equipmentId]);

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

    const handleUnassignClick = (driverId, driverType, driverName) => {
        setSelectedDriver({ id: driverId, type: driverType, name: driverName });
        setShowConfirmDialog(true);
    };

    const handleConfirmUnassign = async () => {
        if (!selectedDriver) return;

        try {
            setUnassigning(selectedDriver.id);
            setShowConfirmDialog(false);

            await equipmentService.unassignDriverFromEquipment(
                equipmentId,
                selectedDriver.id,
                selectedDriver.type
            );

            await fetchDrivers();

            if (onDriverUnassigned) {
                onDriverUnassigned();
            }
        } catch (err) {
            console.error('Error unassigning driver:', err);
            alert(err.response?.data?.message || 'Failed to unassign driver');
        } finally {
            setUnassigning(null);
            setSelectedDriver(null);
        }
    };

    const handleCancelUnassign = () => {
        setShowConfirmDialog(false);
        setSelectedDriver(null);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="driver-modal-backdrop" onClick={handleOverlayClick}>
                <div className="driver-modal-container">
                    <div className="driver-modal-header">
                        <h2>Manage Equipment Drivers</h2>
                        <button className="driver-modal-close" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="driver-modal-body">
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
                        ) : drivers.length === 0 ? (
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
                                        <button
                                            className="driver-modal-unassign-btn"
                                            onClick={() => handleUnassignClick(driver.id, driver.type, driver.name)}
                                            disabled={unassigning === driver.id}
                                        >
                                            {unassigning === driver.id ? 'Unassigning...' : 'Unassign'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="warning"
                title="Unassign Driver"
                message={`Are you sure you want to unassign ${selectedDriver?.name}? This will also remove them from the site.`}
                confirmText="Unassign"
                cancelText="Cancel"
                onConfirm={handleConfirmUnassign}
                onCancel={handleCancelUnassign}
                size="medium"
                showIcon={true}
            />
        </>
    );
};

export default UnassignDriverModal;