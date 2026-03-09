import React, { useEffect } from 'react';
import { FaTimes, FaCogs, FaFileContract } from 'react-icons/fa';
import '../../../../../styles/modal-styles.scss';
import './EquipmentEntryTypeModal.scss';

const EquipmentEntryTypeModal = ({ isOpen, onClose, onSelectManualEntry, onSelectProcurementRequest }) => {

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

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container equipment-entry-type-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        Add Equipment
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="selection-subtitle">How would you like to add new equipment?</p>

                    <div className="entry-type-cards">
                        <div
                            className="entry-type-card manual-entry-card"
                            onClick={onSelectManualEntry}
                        >
                            <div className="card-icon">
                                <FaCogs />
                            </div>
                            <h3>Manual Entry</h3>
                            <p>Directly add equipment details to the system without going through procurement</p>
                        </div>

                        <div
                            className="entry-type-card procurement-request-card"
                            onClick={onSelectProcurementRequest}
                        >
                            <div className="card-icon">
                                <FaFileContract />
                            </div>
                            <h3>Procurement Request</h3>
                            <p>Submit a request order to procurement for purchasing new equipment</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentEntryTypeModal;
