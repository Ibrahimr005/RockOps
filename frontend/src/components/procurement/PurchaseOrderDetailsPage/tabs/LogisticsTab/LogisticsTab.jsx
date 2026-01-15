import React, { useState, useEffect } from 'react';
import {
    FiTruck, FiPackage, FiDollarSign, FiPlus, FiEdit, FiTrash2,
    FiUser, FiPhone, FiFileText, FiAlertCircle, FiChevronDown
} from 'react-icons/fi';
import { logisticsService } from '../../../../../services/procurement/logisticsService';
import AddLogisticsModal from './AddLogisticsModal/AddLogisticsModal';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './LogisticsTab.scss';

const LogisticsTab = ({ purchaseOrder, onError, onSuccess }) => {
    const [logistics, setLogistics] = useState([]);
    const [totalLogisticsCost, setTotalLogisticsCost] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedLogistics, setSelectedLogistics] = useState(null);
    const [preSelectedDeliveryId, setPreSelectedDeliveryId] = useState(null);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [logisticsToDelete, setLogisticsToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [collapsedDeliveries, setCollapsedDeliveries] = useState({});
    const [collapsedLogistics, setCollapsedLogistics] = useState({});

    useEffect(() => {
        if (purchaseOrder?.id) {
            fetchLogistics();
        }
    }, [purchaseOrder?.id]);

    const fetchLogistics = async () => {
        setIsLoading(true);
        try {
            const [logisticsData, totalCost] = await Promise.all([
                logisticsService.getByPurchaseOrder(purchaseOrder.id),
                logisticsService.getTotalCost(purchaseOrder.id)
            ]);

            // ADD THIS LOG
            console.log('=== PURCHASE ORDER DATA ===');
            console.log('Full PO:', purchaseOrder);
            console.log('Delivery Sessions:', purchaseOrder.deliverySessions);
            if (purchaseOrder.deliverySessions && purchaseOrder.deliverySessions.length > 0) {
                console.log('First Session:', purchaseOrder.deliverySessions[0]);
                console.log('Item Receipts:', purchaseOrder.deliverySessions[0].itemReceipts);
                if (purchaseOrder.deliverySessions[0].itemReceipts && purchaseOrder.deliverySessions[0].itemReceipts.length > 0) {
                    console.log('First Receipt:', purchaseOrder.deliverySessions[0].itemReceipts[0]);
                }
            }
            console.log('===========================');

            setLogistics(logisticsData);
            setTotalLogisticsCost(parseFloat(totalCost) || 0);
        } catch (error) {
            console.error('Error fetching logistics:', error);
            if (onError) {
                onError('Failed to load logistics data');
            }
        } finally {
            setIsLoading(false);
        }
    };
    const handleAddStandalone = () => {
        setModalMode('add');
        setSelectedLogistics(null);
        setPreSelectedDeliveryId(null);
        setShowAddModal(true);
    };

    const handleAddToDelivery = (deliverySession) => {
        setModalMode('add');
        setSelectedLogistics(null);
        setPreSelectedDeliveryId(deliverySession.id);
        setShowAddModal(true);
    };

    const handleEdit = (logisticsEntry) => {
        setModalMode('edit');
        setSelectedLogistics(logisticsEntry);
        setPreSelectedDeliveryId(null);
        setShowAddModal(true);
    };

    const handleSave = async (logisticsData) => {
        try {
            const dataToSave = {
                ...logisticsData,
                purchaseOrderId: purchaseOrder.id,
                deliverySessionId: preSelectedDeliveryId || logisticsData.deliverySessionId || null
            };

            if (modalMode === 'edit') {
                await logisticsService.update(selectedLogistics.id, dataToSave);
                if (onSuccess) {
                    onSuccess('Logistics entry updated successfully');
                }
            } else {
                await logisticsService.create(dataToSave);
                if (onSuccess) {
                    onSuccess('Logistics entry added successfully');
                }
            }

            fetchLogistics();
            setShowAddModal(false);
            setPreSelectedDeliveryId(null);
        } catch (error) {
            console.error('Error saving logistics:', error);
            if (onError) {
                onError('Failed to save logistics entry');
            }
        }
    };

    const handleDeleteClick = (logisticsEntry) => {
        setLogisticsToDelete(logisticsEntry);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await logisticsService.delete(logisticsToDelete.id);
            if (onSuccess) {
                onSuccess('Logistics entry deleted successfully');
            }
            fetchLogistics();
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Error deleting logistics:', error);
            if (onError) {
                onError('Failed to delete logistics entry');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    // Group logistics by delivery session
    const logisticsWithDelivery = logistics.filter(l => l.deliverySessionId);
    const standaloneLogistics = logistics.filter(l => !l.deliverySessionId);

    // Group by delivery session
    const logisticsByDelivery = {};
    logisticsWithDelivery.forEach(l => {
        if (!logisticsByDelivery[l.deliverySessionId]) {
            logisticsByDelivery[l.deliverySessionId] = [];
        }
        logisticsByDelivery[l.deliverySessionId].push(l);
    });

    const toggleDeliveryItems = (sessionId) => {
        setCollapsedDeliveries(prev => ({
            ...prev,
            [sessionId]: !prev[sessionId]
        }));
    };
    const toggleLogisticsEntries = (sessionId) => {
        setCollapsedLogistics(prev => ({
            ...prev,
            [sessionId]: !prev[sessionId]
        }));
    };

// Initialize all deliveries as collapsed when data loads
    useEffect(() => {
        if (purchaseOrder?.deliverySessions) {
            const initialCollapsedDeliveries = {};
            const initialCollapsedLogistics = {};
            purchaseOrder.deliverySessions.forEach(session => {
                initialCollapsedDeliveries[session.id] = true; // Start collapsed
                initialCollapsedLogistics[session.id] = true; // Start collapsed
            });
            setCollapsedDeliveries(initialCollapsedDeliveries);
            setCollapsedLogistics(initialCollapsedLogistics);
        }
    }, [purchaseOrder?.deliverySessions]);;

    if (isLoading) {
        return (
            <div className="logistics-tab">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading logistics data...</p>
                </div>
            </div>
        );
    }

    const grandTotal = parseFloat(purchaseOrder.totalAmount || 0) + parseFloat(totalLogisticsCost || 0);

    return (
        <div className="logistics-tab">
            {/* Summary Card */}
            <div className="logistics-summary-card">
                <div className="summary-header">
                    <h3 className="summary-title">
                        <FiDollarSign />
                        Cost Summary
                    </h3>
                    <button className="btn-primary" onClick={handleAddStandalone}>
                        <FiPlus /> Add Standalone Logistics
                    </button>
                </div>

                <div className="summary-grid">
                    <div className="summary-item">
                        <div className="summary-label">PO Cost</div>
                        <div className="summary-value">
                            {purchaseOrder.currency} {parseFloat(purchaseOrder.totalAmount || 0).toFixed(2)}
                        </div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Logistics Cost</div>
                        <div className="summary-value logistics-cost">
                            {purchaseOrder.currency} {parseFloat(totalLogisticsCost || 0).toFixed(2)}
                        </div>
                    </div>
                    <div className="summary-item grand-total">
                        <div className="summary-label">Grand Total</div>
                        <div className="summary-value">
                            {purchaseOrder.currency} {grandTotal.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Deliveries Section */}
            {/* Deliveries Section - ALWAYS SHOW */}
            <div className="logistics-section">
                <div className="section-title">
                    <FiTruck />
                    Deliveries & Logistics
                </div>

                {purchaseOrder.deliverySessions && purchaseOrder.deliverySessions.length > 0 ? (
                    <div className="deliveries-list">
                        {purchaseOrder.deliverySessions.map((session, index) => {
                            const sessionLogistics = logisticsByDelivery[session.id] || [];

                            return (
                                <div key={session.id} className="delivery-card">
                                    <div className="delivery-header">
                                        <div className="delivery-number">#{index + 1}</div>
                                        <div className="delivery-info">
                                            <div className="delivery-icon">
                                                <FiTruck />
                                            </div>
                                            <div className="delivery-details">
                                                <h4 className="delivery-title">
                                                    Delivery on {new Date(session.processedAt).toLocaleDateString('en-GB')}
                                                </h4>
                                                <div className="delivery-meta">
                                        <span>
                                            <FiUser /> {session.processedBy}
                                        </span>
                                                    <span>
                                            <FiPackage /> {session.merchantName}
                                        </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            className="btn-primary"
                                            onClick={() => handleAddToDelivery(session)}
                                        >
                                            <FiPlus /> Add Logistics
                                        </button>
                                    </div>

                                    {/* Delivery Items */}
                                    {session.itemReceipts && session.itemReceipts.length > 0 && (
                                        <div className="delivery-items">
                                            <div
                                                className="delivery-items-header"
                                                onClick={() => toggleDeliveryItems(session.id)}
                                            >
                                                <div className="header-content">
                                                    <span>Items Received ({session.itemReceipts.length})</span>
                                                </div>
                                                <div className={`collapse-icon ${collapsedDeliveries[session.id] ? 'collapsed' : ''}`}>
                                                    <FiChevronDown />
                                                </div>
                                            </div>

                                            {!collapsedDeliveries[session.id] && (
                                                <div className="delivery-items-grid">
                                                    {session.itemReceipts.map(receipt => (
                                                        <div key={receipt.id} className="delivery-item-card">
                                                            <div className="item-card-header">
                                                                <div className="item-card-icon">
                                                                    <FiPackage />
                                                                </div>
                                                                <div className="item-card-info">
                                                                    <div className="item-card-name">{receipt.itemTypeName}</div>
                                                                    {receipt.itemCategoryName && (
                                                                        <div className="item-card-category">{receipt.itemCategoryName}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="item-card-divider"></div>
                                                            <div className="item-card-quantity">
                                                                <span className="quantity-label">Received</span>
                                                                <span className="quantity-value">
                                                        {receipt.goodQuantity} {receipt.measuringUnit}
                                                    </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {sessionLogistics.length > 0 && (
                                        <div className="logistics-entries">
                                            <div
                                                className="logistics-entries-header"
                                                onClick={() => toggleLogisticsEntries(session.id)}
                                            >
                                                <div className="header-content">
                                                    <span>Logistics Entries ({sessionLogistics.length})</span>
                                                </div>
                                                <div className={`collapse-icon ${collapsedLogistics[session.id] ? 'collapsed' : ''}`}>
                                                    <FiChevronDown />
                                                </div>
                                            </div>

                                            {!collapsedLogistics[session.id] && (
                                                <div className="logistics-entries-list">
                                                    {sessionLogistics.map(entry => (
                                                        <LogisticsCard
                                                            key={entry.id}
                                                            logistics={entry}
                                                            onEdit={handleEdit}
                                                            onDelete={handleDeleteClick}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {sessionLogistics.length === 0 && (
                                        <div className="no-logistics">
                                            <FiAlertCircle />
                                            <span>No logistics entries for this delivery yet</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // EMPTY STATE FOR NO DELIVERIES
                    <div className="empty-deliveries-state">
                        <FiTruck size={48} />
                        <h3>No Deliveries Yet</h3>
                        <p>Deliveries will appear here once the warehouse receives items from this purchase order.</p>
                    </div>
                )}
            </div>
            {/* Standalone Logistics Section */}
            {standaloneLogistics.length > 0 && (
                <div className="logistics-section">
                    <div className="section-title">
                        <FiPackage />
                        Standalone Logistics Entries
                    </div>

                    <div className="standalone-logistics-list">
                        {standaloneLogistics.map(entry => (
                            <LogisticsCard
                                key={entry.id}
                                logistics={entry}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                                isStandalone
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}

            {/* Add/Edit Modal */}
            <AddLogisticsModal
                isVisible={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setPreSelectedDeliveryId(null);
                }}
                onSave={handleSave}
                logistics={selectedLogistics}
                deliverySessions={purchaseOrder.deliverySessions}
                mode={modalMode}
                preSelectedDeliveryId={preSelectedDeliveryId}
            />

            {/* Delete Confirmation */}
            <ConfirmationDialog
                isVisible={showDeleteConfirm}
                type="delete"
                title="Delete Logistics Entry"
                message={`Are you sure you want to delete this logistics entry for ${logisticsToDelete?.carrierCompany}? This action cannot be undone.`}
                confirmText="Delete Entry"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={isDeleting}
                showIcon={true}
            />
        </div>
    );
};

// Logistics Card Component
const LogisticsCard = ({ logistics, onEdit, onDelete, isStandalone }) => {
    return (
        <div className={`logistics-card ${isStandalone ? 'standalone' : ''}`}>
            <div className="logistics-card-header">
                <div className="logistics-icon">
                    <FiPackage />
                </div>
                <div className="logistics-main-info">
                    <div className="logistics-amount">
                        {logistics.currency} {parseFloat(logistics.deliveryFee).toFixed(2)}
                    </div>
                    <div className="logistics-company">{logistics.carrierCompany}</div>
                </div>
                <div className="logistics-actions">
                    <button
                        className="action-button edit"
                        onClick={() => onEdit(logistics)}
                        title="Edit"
                    >
                        <FiEdit size={16} />
                    </button>
                    <button
                        className="action-button delete"
                        onClick={() => onDelete(logistics)}
                        title="Delete"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="logistics-card-body">
                <div className="logistics-detail">
                    <FiUser />
                    <span className="detail-label">Driver:</span>
                    <span className="detail-value">{logistics.driverName}</span>
                </div>

                {logistics.driverPhone && (
                    <div className="logistics-detail">
                        <FiPhone />
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{logistics.driverPhone}</span>
                    </div>
                )}

                {logistics.notes && (
                    <div className="logistics-detail notes">
                        <FiFileText />
                        <span className="detail-label">Notes:</span>
                        <span className="detail-value">{logistics.notes}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogisticsTab;