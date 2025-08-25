import React, { useState, useEffect } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import "./ResolutionHistory.scss";
import { itemService } from '../../../../services/warehouse/itemService';

const ResolutionHistory = ({ warehouseId, showSnackbar }) => {
    const [resolutionHistory, setResolutionHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedResolution, setSelectedResolution] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Fetch resolution history
    const fetchResolutionHistory = async () => {
        if (!warehouseId) {
            console.error("Warehouse ID is not available");
            return;
        }
        setHistoryLoading(true);
        try {
            const data = await itemService.getResolutionHistoryByWarehouse(warehouseId);
            setResolutionHistory(data);
        } catch (error) {
            console.error("Failed to fetch resolution history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Initialize data
    useEffect(() => {
        fetchResolutionHistory();
    }, [warehouseId]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showModal) {
            // Save current scroll position
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            // Add styles to prevent scrolling
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollTop}px`;
            document.body.style.left = `-${scrollLeft}px`;
            document.body.style.width = '100%';

            // Cleanup function to restore scrolling
            return () => {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.left = '';
                document.body.style.width = '';

                // Restore scroll position
                window.scrollTo(scrollLeft, scrollTop);
            };
        }
    }, [showModal]);

    const getResolutionTypeLabel = (resolutionType) => {
        switch (resolutionType) {
            case 'ACKNOWLEDGE_LOSS':
                return 'Acknowledge Loss';
            case 'FOUND_ITEMS':
                return 'Items Found';
            case 'ACCEPT_SURPLUS':
                return 'Accept Surplus';
            case 'COUNTING_ERROR':
                return 'Counting Error';
            default:
                return resolutionType;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const handleViewResolution = (resolution) => {
        setSelectedResolution(resolution);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedResolution(null);
    };

    // Helper function to get batch number from resolution data
    const getBatchNumber = (resolution) => {
        return resolution?.item?.transaction?.batchNumber ||
            resolution?.item?.batchNumber ||
            'N/A';
    };

    // Table columns for resolution history
    const historyColumns = [
        {
            accessor: 'item.itemType.itemCategory.parentCategory.name',
            header: 'PARENT CATEGORY',
            width: '180px',
            render: (row) => (
                <span className="parent-category-tag">
                    {row.item?.itemType?.itemCategory?.parentCategory?.name || "No Parent"}
                </span>
            )
        },
        {
            accessor: 'item.itemType.itemCategory.name',
            header: 'CHILD CATEGORY',
            width: '180px',
            render: (row) => (
                <span className="category-tag">
                    {row.item?.itemType?.itemCategory?.name || "No Category"}
                </span>
            )
        },
        {
            accessor: 'item.itemType.name',
            header: 'ITEM',
            width: '180px'
        },
        {
            accessor: 'originalQuantity',
            header: 'QUANTITY',
            width: '120px'
        },
        {
            accessor: 'item.transaction.batchNumber',
            header: 'BATCH #',
            width: '150px',
            render: (row) => (
                <span className="batch-number">
                    {getBatchNumber(row)}
                </span>
            )
        },
        {
            accessor: 'resolutionType',
            header: 'RESOLUTION',
            width: '150px',
            render: (row) => (
                <span className={`resolution-badge ${row.resolutionType?.toLowerCase().replace('_', '-')}`}>
                    {getResolutionTypeLabel(row.resolutionType)}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: 'View',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            ),
            className: 'view',
            onClick: (row) => handleViewResolution(row)
        }
    ];

    return (
        <>


            {/* DataTable */}
            <DataTable
                data={resolutionHistory}
                columns={historyColumns}
                loading={historyLoading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                    { accessor: 'item.itemType.itemCategory.parentCategory.name', header: 'Parent Category' },
                    { accessor: 'item.itemType.itemCategory.name', header: 'Category' },
                    { accessor: 'item.itemType.name', header: 'Item' },
                    { accessor: 'resolutionType', header: 'Resolution Type' }
                ]}
                actions={actions}
                className="resolution-history-table"
                actionsColumnWidth="80px"
            />

            {/* Resolution Details Modal */}
            {showModal && selectedResolution && (
                <div
                    className="resolution-history-modal-overlay"
                    onClick={closeModal}
                    onWheel={(e) => e.preventDefault()}
                    onTouchMove={(e) => e.preventDefault()}
                >
                    <div
                        className="resolution-history-modal-container"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="resolution-history-modal-header">
                            <div className="resolution-history-modal-header-content">
                                <h2 className="resolution-history-modal-title">Resolution Details</h2>
                                <div className={`resolution-history-modal-status-badge ${selectedResolution.resolutionType?.toLowerCase().replace('_', '-')}`}>
                                    {getResolutionTypeLabel(selectedResolution.resolutionType)}
                                </div>
                            </div>
                            <button className="btn-close" onClick={closeModal}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="resolution-history-modal-content">
                            {/* Overview Section */}
                            <div className="resolution-history-modal-content-section">
                                <h3 className="resolution-history-modal-section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="6" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    Overview
                                </h3>
                                <div className="resolution-history-modal-overview-grid">


                                    {getBatchNumber(selectedResolution) !== 'N/A' && (
                                        <div className="resolution-history-modal-overview-item">
                                            <div className="resolution-history-modal-overview-icon">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14,2 14,8 20,8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                    <polyline points="10,9 9,9 8,9" />
                                                </svg>
                                            </div>
                                            <div className="resolution-history-modal-overview-content">
                                                <span className="resolution-history-modal-label">Batch Number</span>
                                                <span className="resolution-history-modal-value">#{getBatchNumber(selectedResolution)}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="resolution-history-modal-overview-item">
                                        <div className="resolution-history-modal-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </div>
                                        <div className="resolution-history-modal-overview-content">
                                            <span className="resolution-history-modal-label">Resolved By</span>
                                            <span className="resolution-history-modal-value">{selectedResolution.resolvedBy || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="resolution-history-modal-overview-item">
                                        <div className="resolution-history-modal-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12,6 12,12 16,14" />
                                            </svg>
                                        </div>
                                        <div className="resolution-history-modal-overview-content">
                                            <span className="resolution-history-modal-label">Resolved At</span>
                                            <span className="resolution-history-modal-value">{selectedResolution.resolvedAt ? formatDateTime(selectedResolution.resolvedAt) : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resolution Details Section */}
                            <div className="resolution-history-modal-content-section">
                                <h3 className="resolution-history-modal-section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12l2 2 4-4" />
                                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                                        <path d="M13 12h3" />
                                        <path d="M8 12H5" />
                                    </svg>
                                    Resolution Action
                                </h3>
                                <div className="resolution-history-modal-action-card">
                                    <div className="resolution-history-modal-action-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 12l2 2 4-4" />
                                            <circle cx="12" cy="12" r="10" />
                                        </svg>
                                    </div>
                                    <div className="resolution-history-modal-action-content">
                                        <div className="resolution-history-modal-action-type">
                                            {getResolutionTypeLabel(selectedResolution.resolutionType)}
                                        </div>
                                        <div className="resolution-history-modal-action-description">
                                            {selectedResolution.resolutionType === 'ACKNOWLEDGE_LOSS' &&
                                                'The inventory loss has been acknowledged and recorded in the system.'}
                                            {selectedResolution.resolutionType === 'FOUND_ITEMS' &&
                                                'The missing items were found and the inventory has been updated.'}
                                            {selectedResolution.resolutionType === 'ACCEPT_SURPLUS' &&
                                                'The surplus items have been accepted and added to the inventory.'}
                                            {selectedResolution.resolutionType === 'COUNTING_ERROR' &&
                                                'The discrepancy was identified as a counting error and has been corrected.'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Item Details Section */}
                            {selectedResolution.item && (
                                <div className="resolution-history-modal-content-section">
                                    <h3 className="resolution-history-modal-section-title">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                            <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
                                            <line x1="12" y1="22.08" x2="12" y2="12" />
                                        </svg>
                                        Item Information
                                    </h3>
                                    <div className="resolution-history-modal-item-card">
                                        <div className="resolution-history-modal-item-header">
                                            <div className="resolution-history-modal-item-icon-container">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                </svg>
                                            </div>
                                            <div className="resolution-history-modal-item-details">
                                                <div className="resolution-history-modal-item-name">
                                                    {selectedResolution.item.itemType?.name || 'Unknown Item'}
                                                </div>
                                                <div className="resolution-history-modal-item-category">
                                                    {selectedResolution.item.itemType?.itemCategory?.name || 'No Category'}
                                                </div>
                                            </div>
                                            <div className="resolution-history-modal-item-quantity">
                                                {selectedResolution.originalQuantity} units
                                            </div>
                                        </div>
                                        {selectedResolution.item.serialNumber && (
                                            <div className="resolution-history-modal-item-serial">
                                                <span className="resolution-history-modal-serial-label">Serial Number:</span>
                                                <span className="resolution-history-modal-serial-value">{selectedResolution.item.serialNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes Section */}
                            {selectedResolution.notes && (
                                <div className="resolution-history-modal-content-section">
                                    <h3 className="resolution-history-modal-section-title">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14,2 14,8 20,8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                            <polyline points="10,9 9,9 8,9" />
                                        </svg>
                                        Resolution Notes
                                    </h3>
                                    <div className="resolution-history-modal-notes-content">
                                        {selectedResolution.notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ResolutionHistory;