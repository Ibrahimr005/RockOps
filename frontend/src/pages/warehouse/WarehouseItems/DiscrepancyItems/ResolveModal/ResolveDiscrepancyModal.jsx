import React, { useState, useEffect } from "react";
import { Button, CloseButton } from '../../../../../components/common/Button';
import "./ResolveDiscrepancyModal.scss";

const ResolveDiscrepancyModal = ({ isOpen, onClose, selectedItem, onSubmit }) => {
    const [resolutionData, setResolutionData] = useState({
        resolutionType: "",
        notes: "",
        transactionId: ""
    });

    useEffect(() => {
        if (isOpen && selectedItem) {
            setResolutionData({
                resolutionType: "",
                notes: "",
                transactionId: selectedItem.transactionId || ""
            });
        }
    }, [isOpen, selectedItem]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
        return () => document.body.classList.remove("modal-open");
    }, [isOpen]);

    if (!isOpen || !selectedItem) return null;

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const getMeasuringUnitLabel = (measuringUnit) => {
        if (!measuringUnit) return '';
        if (typeof measuringUnit === 'string') return measuringUnit;
        return measuringUnit.displayName || measuringUnit.abbreviation || measuringUnit.name || '';
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'IN_WAREHOUSE':  return 'In Warehouse';
            case 'DELIVERING':    return 'Delivering';
            case 'PENDING':       return 'Pending';
            case 'MISSING':       return 'Missing Items';
            case 'OVERRECEIVED':  return 'Excess Items';
            default:              return status || '—';
        }
    };

    const isMissing = selectedItem.itemStatus === 'MISSING';

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setResolutionData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(resolutionData);
    };

    // ─── Confirmation messages ────────────────────────────────────────────────

    const confirmationMessages = {
        ACKNOWLEDGE_LOSS: "You are confirming that these items are lost and will not be added to the inventory.",
        FOUND_ITEMS: "You are confirming items were found and will be returned to regular inventory.",
        ACCEPT_SURPLUS: "You are accepting the surplus items that are already in your regular inventory.",
        COUNTING_ERROR: "You are confirming this was a counting error. The excess quantity will be deducted from the original transaction inventory."
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div
            className="modal-backdrop"
            onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
        >
            <div className="modal-container modal-md resolve-discrepancy-modal">

                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Resolve Inventory Discrepancy
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {/* Body */}
                <div className="modal-body">

                    {/* Item summary */}
                    <div className="rdm-summary">
                        <div className="rdm-summary-row">
                            <span className="rdm-summary-label">Item</span>
                            <span className="rdm-summary-value">{selectedItem.itemType?.name || '—'}</span>
                        </div>
                        <div className="rdm-summary-row">
                            <span className="rdm-summary-label">Quantity</span>
                            <span className="rdm-summary-value">
                                {selectedItem.quantity} {getMeasuringUnitLabel(selectedItem.itemType?.measuringUnit)}
                            </span>
                        </div>
                        <div className="rdm-summary-row">
                            <span className="rdm-summary-label">Status</span>
                            <span className={`rdm-status-pill rdm-status-${selectedItem.itemStatus?.toLowerCase()}`}>
                                {getStatusLabel(selectedItem.itemStatus)}
                            </span>
                        </div>
                        <div className="rdm-summary-row">
                            <span className="rdm-summary-label">Batch #</span>
                            <span className="rdm-summary-value">
                                {selectedItem.transaction?.batchNumber || selectedItem.batchNumber || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Form */}
                    <form id="resolve-form" onSubmit={handleSubmit} className="rdm-form">

                        <div className="rdm-form-group">
                            <label htmlFor="resolutionType">
                                Resolution Type
                                <span className="rdm-required">*</span>
                            </label>
                            <select
                                id="resolutionType"
                                name="resolutionType"
                                value={resolutionData.resolutionType}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select resolution type...</option>
                                {isMissing ? (
                                    <>
                                        <option value="ACKNOWLEDGE_LOSS">Acknowledge Loss</option>
                                        <option value="FOUND_ITEMS">Items Found</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="ACCEPT_SURPLUS">Accept Surplus</option>
                                        <option value="COUNTING_ERROR">Counting Error</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="rdm-form-group">
                            <label htmlFor="notes">Resolution Notes</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={resolutionData.notes}
                                onChange={handleInputChange}
                                placeholder="Provide details about this resolution..."
                                rows={4}
                            />
                        </div>

                        {/* Confirmation notice */}
                        {resolutionData.resolutionType && (
                            <div className={`rdm-notice rdm-notice-${isMissing ? 'warning' : 'info'}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {confirmationMessages[resolutionData.resolutionType]}
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="resolve-form" variant="primary">
                        Resolve Discrepancy
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ResolveDiscrepancyModal;