import React, { useEffect } from 'react';
import { FaTimes, FaTools, FaShoppingCart } from 'react-icons/fa';
import '../../../styles/modal-styles.scss';
import './TicketTypeSelectionModal.scss';

const TicketTypeSelectionModal = ({ isOpen, onClose, onSelectMaintenanceTicket, onSelectDirectPurchaseTicket }) => {

    useEffect(() => {
        if (isOpen) {
            // Prevent background scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll when modal is closed
            document.body.style.overflow = 'unset';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container ticket-type-selection-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        Select Ticket Type
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="selection-subtitle">Choose the type of ticket you want to create:</p>

                    <div className="ticket-type-cards">
                        <div
                            className="ticket-type-card maintenance-card"
                            onClick={onSelectMaintenanceTicket}
                        >
                            <div className="card-icon">
                                <FaTools />
                            </div>
                            <h3>Maintenance Ticket</h3>
                            <p>Create a maintenance record for equipment repair or servicing</p>
                        </div>

                        <div
                            className="ticket-type-card direct-purchase-card"
                            onClick={onSelectDirectPurchaseTicket}
                        >
                            <div className="card-icon">
                                <FaShoppingCart />
                            </div>
                            <h3>Direct Purchase Ticket</h3>
                            <p>Purchase and transport spare parts for equipment</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketTypeSelectionModal;
