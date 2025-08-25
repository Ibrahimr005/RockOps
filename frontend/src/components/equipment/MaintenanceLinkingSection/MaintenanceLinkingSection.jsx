import React, { useState } from 'react';
import MaintenanceLookup from '../MaintenanceLookup/MaintenanceLookup';
import InlineMaintenanceCreation from '../InlineMaintenanceCreation/InlineMaintenanceCreation';
import './MaintenanceLinkingSection.scss';

const MaintenanceLinkingSection = ({
    equipmentId,
    transaction,
    onMaintenanceLinked,
    onCreateNewMaintenance,
    onSkipMaintenance
}) => {
    const [linkingMode, setLinkingMode] = useState(null); // 'lookup', 'create', or null
    const [selectedMaintenance, setSelectedMaintenance] = useState(null);

    const handleModeSelect = (mode) => {
        setLinkingMode(mode);
        setSelectedMaintenance(null);
    };

    const handleMaintenanceSelected = (maintenance) => {
        setSelectedMaintenance(maintenance);
        onMaintenanceLinked(maintenance);
    };

    const handleMaintenanceCreated = (maintenanceData) => {
        onCreateNewMaintenance(maintenanceData);
    };

    const handleCancel = () => {
        setLinkingMode(null);
        setSelectedMaintenance(null);
    };

    const handleSkip = () => {
        onSkipMaintenance();
    };

    return (
        <div className="maintenance-linking-section">
            <div className="maintenance-linking-header">
                <div className="header-content">
                    <div className="header-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                    </div>
                    <div className="header-text">
                        <h3>Maintenance Integration</h3>
                        <p>This is a MAINTENANCE transaction. Link it to a maintenance record to track parts and materials usage.</p>
                    </div>
                </div>
                <div className="transaction-info">
                    <span className="transaction-badge">
                        Batch #{transaction.batchNumber}
                    </span>
                </div>
            </div>

            {!linkingMode ? (
                <div className="maintenance-options">
                    <div className="options-grid">
                        <div 
                            className="option-card"
                            onClick={() => handleModeSelect('lookup')}
                        >
                            <div className="option-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="m21 21-4.35-4.35"/>
                                </svg>
                            </div>
                            <div className="option-content">
                                <h4>Link to Existing Maintenance</h4>
                                <p>Search and select an existing maintenance record to link with this transaction</p>
                            </div>
                            <div className="option-arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </div>
                        </div>

                        <div 
                            className="option-card"
                            onClick={() => handleModeSelect('create')}
                        >
                            <div className="option-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 5v14M5 12h14"/>
                                </svg>
                            </div>
                            <div className="option-content">
                                <h4>Create New Maintenance</h4>
                                <p>Create a new maintenance record and automatically link it to this transaction</p>
                            </div>
                            <div className="option-arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </div>
                        </div>

                        <div 
                            className="option-card skip-option"
                            onClick={handleSkip}
                        >
                            <div className="option-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                                </svg>
                            </div>
                            <div className="option-content">
                                <h4>Skip Maintenance Linking</h4>
                                <p>Accept the transaction without linking to maintenance (can be linked later)</p>
                            </div>
                            <div className="option-arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="options-help">
                        <div className="help-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                <path d="M12 17h.01"/>
                            </svg>
                        </div>
                        <div className="help-content">
                            <h5>Why link to maintenance?</h5>
                            <ul>
                                <li>Track which parts were used for specific maintenance work</li>
                                <li>Generate accurate maintenance cost reports</li>
                                <li>Maintain equipment service history</li>
                                <li>Ensure proper inventory accounting</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : linkingMode === 'lookup' ? (
                <MaintenanceLookup
                    equipmentId={equipmentId}
                    onMaintenanceSelected={handleMaintenanceSelected}
                    onCancel={handleCancel}
                    selectedMaintenanceId={selectedMaintenance?.id}
                />
            ) : linkingMode === 'create' ? (
                <InlineMaintenanceCreation
                    equipmentId={equipmentId}
                    onMaintenanceCreated={handleMaintenanceCreated}
                    onCancel={handleCancel}
                />
            ) : null}
        </div>
    );
};

export default MaintenanceLinkingSection; 