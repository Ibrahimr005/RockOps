import React, { useState, useEffect } from "react";
import { Button, CloseButton } from '../../../../components/common/Button';
import "./AcceptRejectModal.scss";

const AcceptTransactionModal = ({
                                    isOpen,
                                    onClose,
                                    transaction,
                                    warehouseId,
                                    onSuccess,
                                    showSnackbar,
                                    transactionService
                                }) => {
    const [receivedQuantities, setReceivedQuantities] = useState({});
    const [itemsNotReceived, setItemsNotReceived] = useState({});
    const [comments, setComments] = useState("");
    const [acceptError, setAcceptError] = useState("");
    const [processingAction, setProcessingAction] = useState(false);

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (isOpen && transaction) {
            setComments("");
            setAcceptError("");
            const initialQuantities = {};
            const initialNotReceived = {};
            (transaction.items || []).forEach((_, index) => {
                initialQuantities[index] = "";
                initialNotReceived[index] = false;
            });
            setReceivedQuantities(initialQuantities);
            setItemsNotReceived(initialNotReceived);
        }
    }, [isOpen, transaction]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
        return () => document.body.classList.remove("modal-open");
    }, [isOpen]);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const getItemDisplayName = (item) =>
        item?.itemTypeName || item?.name || item?.itemName || `Item ${item?.id || 'Unknown'}`;

    const getItemMeasuringUnit = (item) =>
        item?.itemUnit || item?.itemType?.measuringUnit || null;

    const getItemCategory = (item) =>
        item?.itemCategory || item?.category || item?.itemType?.itemCategory?.name || "";

    const getEntityDisplayName = (entity) => entity?.name || "N/A";

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleItemQuantityChange = (index, value) => {
        setReceivedQuantities(prev => ({ ...prev, [index]: value }));
    };

    const handleItemNotReceivedChange = (index, notReceived) => {
        setItemsNotReceived(prev => ({ ...prev, [index]: notReceived }));
        if (notReceived) {
            setReceivedQuantities(prev => ({ ...prev, [index]: "" }));
        }
    };

    const handleAccept = async (e) => {
        e.preventDefault();
        setProcessingAction(true);
        setAcceptError("");

        const hasInvalidInputs = (transaction.items || []).some((_, index) => {
            if (itemsNotReceived[index]) return false;
            const qty = receivedQuantities[index];
            return isNaN(qty) || qty === "" || parseInt(qty) < 0;
        });

        if (hasInvalidInputs) {
            setAcceptError("Please enter valid quantities for all items or mark them as not received");
            setProcessingAction(false);
            return;
        }

        try {
            let username = "system";
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                if (userInfo.username) username = userInfo.username;
            } catch { /* ignore */ }

            const receivedItems = (transaction.items || []).map((item, index) => ({
                transactionItemId: item.id,
                receivedQuantity: itemsNotReceived[index] ? 0 : parseInt(receivedQuantities[index]),
                itemNotReceived: itemsNotReceived[index] || false
            }));

            await transactionService.accept(transaction.id, {
                receivedItems,
                username,
                acceptanceComment: comments
            });

            showSnackbar("Transaction accepted successfully", "success");
            onSuccess();
            onClose();
        } catch (error) {
            let errorMessage = "Failed to accept transaction";

            if (error.response?.data) {
                const errorData = error.response.data;
                if (typeof errorData === 'string') {
                    if (errorData.includes("No available items in warehouse for:")) {
                        const match = errorData.match(/No available items in warehouse for:\s*([^\s,]+)/);
                        errorMessage = `Insufficient inventory for ${match ? match[1] : "this item"}`;
                    } else {
                        errorMessage = errorData.replace("java.lang.IllegalArgumentException: ", "");
                    }
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } else if (error.response?.status === 500) {
                errorMessage = "Server error — please check inventory levels and try again";
            } else if (error.response?.status === 400) {
                errorMessage = "Invalid request — please check your input";
            } else {
                errorMessage = error.message || "Network error occurred";
            }

            setAcceptError(errorMessage);
            showSnackbar(errorMessage, "error");
        } finally {
            setProcessingAction(false);
        }
    };

    if (!isOpen || !transaction) return null;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="modal-backdrop" onClick={() => !processingAction && onClose()}>
            <div className="modal-container modal-lg accept-transaction-modal" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Accept Transaction
                        </h2>
                        <p className="modal-subtitle">
                            Batch #{transaction.batchNumber || "N/A"} · {formatDate(transaction.transactionDate)}
                        </p>
                    </div>
                    <CloseButton onClick={onClose} disabled={processingAction} />
                </div>

                {/* Body */}
                <div className="modal-body">

                    {/* Transaction Overview */}
                    <div className="accept-section">
                        <div className="modal-section-wh">
                            <p className="modal-section-title">Transaction Overview</p>
                            <div className="accept-overview-grid">
                                <div className="accept-overview-item">
                                    <span className="accept-overview-label">From</span>
                                    <span className="accept-overview-value">{getEntityDisplayName(transaction.sender)}</span>
                                </div>
                                <div className="accept-overview-item">
                                    <span className="accept-overview-label">To</span>
                                    <span className="accept-overview-value">{getEntityDisplayName(transaction.receiver)}</span>
                                </div>
                                <div className="accept-overview-item">
                                    <span className="accept-overview-label">Batch Number</span>
                                    <span className="accept-overview-value">#{transaction.batchNumber || "N/A"}</span>
                                </div>
                                <div className="accept-overview-item">
                                    <span className="accept-overview-label">Transaction Date</span>
                                    <span className="accept-overview-value">{formatDate(transaction.transactionDate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="accept-section">
                        <div className="modal-section-wh">
                            <p className="modal-section-title">Received Quantities</p>

                            {transaction.items && transaction.items.length > 0 ? (
                                <div className="accept-items-list">
                                    {transaction.items.map((item, index) => (
                                        <div key={index} className="accept-item-card">
                                            <div className="accept-item-header">
                                                <div className="accept-item-info">
                                                    <span className="accept-item-name">{getItemDisplayName(item)}</span>
                                                    {getItemCategory(item) && (
                                                        <span className="accept-item-category">{getItemCategory(item)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="accept-item-body">
                                                <span className="accept-quantity-label">
                                                    Quantity received
                                                    {!itemsNotReceived[index] && <span className="required"> *</span>}
                                                </span>

                                                <div className={`accept-quantity-controls ${itemsNotReceived[index] ? 'disabled' : ''}`}>
                                                    <button
                                                        type="button"
                                                        className="accept-qty-btn decrement"
                                                        onClick={() => {
                                                            const current = parseInt(receivedQuantities[index]) || 0;
                                                            handleItemQuantityChange(index, Math.max(0, current - 1));
                                                        }}
                                                        disabled={processingAction || itemsNotReceived[index] || (parseInt(receivedQuantities[index]) || 0) <= 0}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                                                    </button>

                                                    <input
                                                        type="number"
                                                        className="accept-qty-input"
                                                        value={itemsNotReceived[index] ? "" : (receivedQuantities[index] || "")}
                                                        onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                                                        placeholder={itemsNotReceived[index] ? "—" : "0"}
                                                        min="0"
                                                        disabled={processingAction || itemsNotReceived[index]}
                                                    />

                                                    <button
                                                        type="button"
                                                        className="accept-qty-btn increment"
                                                        onClick={() => {
                                                            const current = parseInt(receivedQuantities[index]) || 0;
                                                            handleItemQuantityChange(index, current + 1);
                                                        }}
                                                        disabled={processingAction || itemsNotReceived[index]}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                                    </button>

                                                    <span className="accept-unit-badge">
                                                        {getItemMeasuringUnit(item) || 'units'}
                                                    </span>
                                                </div>

                                                <label className="accept-not-received-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={itemsNotReceived[index] || false}
                                                        onChange={(e) => handleItemNotReceivedChange(index, e.target.checked)}
                                                        disabled={processingAction}
                                                    />
                                                    <span className="accept-checkmark"></span>
                                                    <span>Item not received</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="modal-info">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="8" x2="12" y2="12"/>
                                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                                    </svg>
                                    This transaction has no items.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="accept-section">
                        <div className="modal-section-wh">
                            <p className="modal-section-title">
                                Comments <span className="accept-optional">(optional)</span>
                            </p>
                            <textarea
                                className="accept-comments-textarea"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any comments about receiving these items..."
                                disabled={processingAction}
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {acceptError && (
                        <div className="modal-error">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            {acceptError}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <Button variant="ghost" onClick={onClose} disabled={processingAction}>
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleAccept}
                        loading={processingAction}
                        loadingText="Processing..."
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M5 13l4 4L19 7"/>
                        </svg>
                        Accept Transaction
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AcceptTransactionModal;