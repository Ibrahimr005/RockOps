import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import './UnifiedTransactionsView.scss';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';

const UnifiedTransactionsView = forwardRef(({
                                                entityId, // Generic - can be equipmentId or warehouseId
                                                entityType = 'EQUIPMENT', // 'EQUIPMENT' or 'WAREHOUSE'
                                                onAcceptTransaction,
                                                onRejectTransaction,
                                                onUpdateTransaction
                                            }, ref) => {
    const [activeTab, setActiveTab] = useState('all');
    const [allTransactions, setAllTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [receivedQuantities, setReceivedQuantities] = useState({});
    const [acceptComment, setAcceptComment] = useState('');
    const [purpose, setPurpose] = useState('CONSUMABLE');
    const [processingAction, setProcessingAction] = useState(false);

    const { showError, showSuccess } = useSnackbar();

    const token = localStorage.getItem('token');
    const axiosInstance = axios.create({
        headers: { Authorization: `Bearer ${token}` }
    });

    const handleQuantityChange = (itemId, value) => {
        // Convert value to number and ensure it's not negative
        const numericValue = Math.max(0, parseInt(value) || 0);
        setReceivedQuantities(prev => ({
            ...prev,
            [itemId]: numericValue
        }));
    };

    // Expose refresh methods to parent
    useImperativeHandle(ref, () => ({
        refreshTransactions: fetchAllTransactions,
        refreshLogs: fetchAllTransactions
    }));

    const fetchAllTransactions = async () => {
        try {
            setLoading(true);
            setError(null);

            // Use different endpoints based on entity type
            const endpoint = entityType === 'EQUIPMENT'
                ? `http://localhost:8080/api/equipment/${entityId}/transactions`
                : `http://localhost:8080/api/v1/transactions/warehouse/${entityId}`;

            const response = await axiosInstance.get(endpoint);

            if (!response.data || !Array.isArray(response.data)) {
                setAllTransactions([]);
                setLoading(false);
                return;
            }

            const transformedData = await Promise.all(
                response.data.map(async (transaction) => {
                    try {
                        const sender = await fetchEntityName(transaction.senderType, transaction.senderId);
                        const receiver = await fetchEntityName(transaction.receiverType, transaction.receiverId);

                        return {
                            ...transaction,
                            id: transaction.id,
                            date: transaction.transactionDate,
                            completedAt: transaction.completedAt,
                            sender: sender,
                            receiver: receiver,
                            batchNumber: transaction.batchNumber,
                            createdAt: transaction.createdAt,
                            addedBy: transaction.addedBy,
                            approvedBy: transaction.approvedBy,
                            status: transaction.status,
                            rejectionReason: transaction.rejectionReason,
                            acceptanceComment: transaction.acceptanceComment,
                            purpose: transaction.purpose || 'GENERAL',
                            senderId: transaction.senderId,
                            receiverId: transaction.receiverId,
                            sentFirst: transaction.sentFirst,
                            items: (transaction.items || []).map(item => ({
                                id: item.id,
                                itemType: item.itemType?.name || 'Unknown Item',
                                category: item.itemType?.itemCategory?.name || 'N/A',
                                quantity: item.quantity,
                                receivedQuantity: item.receivedQuantity
                            }))
                        };
                    } catch (itemError) {
                        console.error('Error transforming transaction:', transaction, itemError);
                        return null;
                    }
                })
            );

            const validTransactions = transformedData.filter(tx => tx !== null);
            setAllTransactions(validTransactions);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setError(`Failed to load transactions: ${error.message}`);
            setAllTransactions([]);
            setLoading(false);
        }
    };

    const fetchEntityName = async (entityType, entityId) => {
        if (!entityType || !entityId) return 'Unknown';

        try {
            let endpoint;
            if (entityType === 'WAREHOUSE') {
                endpoint = `http://localhost:8080/api/v1/warehouses/${entityId}`;
            } else if (entityType === 'EQUIPMENT') {
                endpoint = `http://localhost:8080/api/equipment/${entityId}`;
            } else {
                return entityType;
            }

            const response = await axiosInstance.get(endpoint);
            return response.data.name || response.data.fullModelName || 'Unknown';
        } catch (error) {
            console.error(`Error fetching ${entityType} details:`, error);
            return 'Unknown';
        }
    };

    useEffect(() => {
        if (entityId) {
            fetchAllTransactions();
        }
    }, [entityId, entityType]);

    // Get transactions based on active tab
    const getTransactionsForTab = (tabName) => {
        const entityIdStr = String(entityId);

        switch (tabName) {
            case 'incoming':
                return allTransactions.filter(tx => {
                    const isReceiver = String(tx.receiverId) === entityIdStr;
                    const isPending = tx.status === 'PENDING';
                    const notSentByEntity = !tx.sentFirst || String(tx.sentFirst) !== entityIdStr;
                    return isReceiver && isPending && notSentByEntity;
                });
            case 'pending':
                return allTransactions.filter(tx => {
                    const isPending = tx.status === 'PENDING';
                    const sentByEntity = tx.sentFirst && String(tx.sentFirst) === entityIdStr;
                    return isPending && sentByEntity;
                });
            case 'validated':
                return allTransactions.filter(tx => {
                    const isRelated = String(tx.senderId) === entityIdStr || String(tx.receiverId) === entityIdStr;
                    const isCompleted = tx.status === 'ACCEPTED' || tx.status === 'REJECTED';
                    return isRelated && isCompleted;
                });
            case 'all':
            default:
                return allTransactions.filter(tx => {
                    const isRelated = String(tx.senderId) === entityIdStr || String(tx.receiverId) === entityIdStr;
                    return isRelated;
                });
        }
    };

    // Get tab counts
    const getTabCounts = () => {
        return {
            incoming: getTransactionsForTab('incoming').length,
            pending: getTransactionsForTab('pending').length,
            validated: getTransactionsForTab('validated').length,
            all: getTransactionsForTab('all').length
        };
    };

    // Define columns for DataTable
    const getColumns = () => {
        const baseColumns = [
            {
                header: 'Batch #',
                accessor: 'batchNumber',
                width: '100px'
            },
            {
                header: 'Items',
                accessor: 'items',
                render: (row) => (
                    <div className="items-count">
                        {row.items?.length || 0} item{row.items?.length !== 1 ? 's' : ''}
                    </div>
                ),
                width: '80px'
            },
            {
                header: 'Sender',
                accessor: 'sender',
                width: '150px'
            },
            {
                header: 'Receiver',
                accessor: 'receiver',
                width: '150px'
            },
            {
                header: 'Purpose',
                accessor: 'purpose',
                render: (row) => (
                    <span className={`purpose-tag ${row.purpose?.toLowerCase() || 'general'}`}>
                        {row.purpose || 'GENERAL'}
                    </span>
                ),
                width: '120px'
            },
            {
                header: 'Request Date',
                accessor: 'date',
                render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-GB') : 'N/A',
                width: '120px'
            },
            {
                header: 'Created At',
                accessor: 'createdAt',
                render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A',
                width: '140px'
            },
            {
                header: 'Added By',
                accessor: 'addedBy',
                width: '120px'
            }
        ];

        // Add status and processed date columns for validated and all tabs
        if (activeTab === 'validated' || activeTab === 'all') {
            baseColumns.push(
                {
                    header: 'Status',
                    accessor: 'status',
                    render: (row) => (
                        <span className={`status-badge ${row.status?.toLowerCase() || 'pending'}`}>
                            {row.status || 'PENDING'}
                        </span>
                    ),
                    width: '100px'
                },
                {
                    header: 'Processed Date',
                    accessor: 'completedAt',
                    render: (row) => row.completedAt ? new Date(row.completedAt).toLocaleDateString('en-GB') : 'N/A',
                    width: '130px'
                },
                {
                    header: 'Approved By',
                    accessor: 'approvedBy',
                    width: '120px'
                }
            );
        }

        return baseColumns;
    };

    // Define actions for DataTable
    const getActions = () => {
        const actions = [];

        if (activeTab === 'incoming') {
            actions.push(
                {
                    label: 'Accept',
                    icon: (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                    onClick: handleAcceptTransaction,
                    className: 'accept-action'
                },
                {
                    label: 'Reject',
                    icon: (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ),
                    onClick: onRejectTransaction,
                    className: 'reject-action'
                }
            );
        } else if (activeTab === 'pending') {
            actions.push({
                label: 'Update',
                icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                ),
                onClick: onUpdateTransaction || (() => alert('Update functionality not implemented')),
                className: 'update-action'
            });
        } else if (activeTab === 'validated') {
            actions.push({
                label: 'Info',
                icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                onClick: (row) => {
                    if (row.status === 'REJECTED' && row.rejectionReason) {
                        showError(`Rejection reason: ${row.rejectionReason}`);
                    } else if (row.status === 'ACCEPTED' && row.acceptanceComment) {
                        showSuccess(`Acceptance comment: ${row.acceptanceComment}`);
                    } else {
                        showError('No additional information available');
                    }
                },
                className: 'info-action',
                isDisabled: (row) => !((row.status === 'REJECTED' && row.rejectionReason) || (row.status === 'ACCEPTED' && row.acceptanceComment))
            });
        }

        return actions;
    };

    // Define filterable columns
    const filterableColumns = [
        { header: 'Sender', accessor: 'sender' },
        { header: 'Receiver', accessor: 'receiver' },
        { header: 'Batch #', accessor: 'batchNumber' },
        { header: 'Purpose', accessor: 'purpose' },
        { header: 'Added By', accessor: 'addedBy' }
    ];

    if (activeTab === 'validated' || activeTab === 'all') {
        filterableColumns.push(
            { header: 'Status', accessor: 'status' },
            { header: 'Approved By', accessor: 'approvedBy' }
        );
    }

    const tabCounts = getTabCounts();
    const currentData = getTransactionsForTab(activeTab);

    const getTabTitle = () => {
        switch (activeTab) {
            case 'incoming': return 'Incoming Transactions';
            case 'pending': return 'Pending Transactions';
            case 'validated': return 'Validated Transactions';
            case 'all': return 'All Transactions';
            default: return 'Transactions';
        }
    };

    const getTabDescription = () => {
        switch (activeTab) {
            case 'incoming': return 'Transactions waiting for your approval';
            case 'pending': return 'Transactions you initiated and are waiting to be processed';
            case 'validated': return 'Completed transactions (accepted/rejected)';
            case 'all': return `All ${entityType.toLowerCase()} transactions`;
            default: return '';
        }
    };

    const handleAcceptTransaction = (transaction) => {
        setSelectedTransaction(transaction);
        setAcceptComment('');
        setPurpose('CONSUMABLE');
        setProcessingAction(false);

        // Initialize received quantities with empty values
        const initialQuantities = {};
        transaction.items.forEach(item => {
            initialQuantities[item.id] = 0;
        });
        setReceivedQuantities(initialQuantities);
        setShowAcceptModal(true);
    };

    const handleAcceptSubmit = async () => {
        setProcessingAction(true);
        try {
            // Validate all quantities are provided
            for (const itemId in receivedQuantities) {
                if (receivedQuantities[itemId] === undefined || receivedQuantities[itemId] < 0) {
                    throw new Error("Please specify valid received quantities for all items");
                }
            }

            // Accept the transaction
            await axiosInstance.post(
                `http://localhost:8080/api/equipment/${entityId}/transactions/${selectedTransaction.id}/accept`,
                {
                    receivedQuantities,
                    comment: acceptComment,
                    purpose: purpose
                }
            );

            // Refresh transactions
            await fetchAllTransactions();
            setShowAcceptModal(false);
            showSuccess("Transaction accepted successfully");
        } catch (error) {
            console.error("Error accepting transaction:", error);
            showError(error.response?.data?.message || error.message || "Failed to accept transaction");
        } finally {
            setProcessingAction(false);
        }
    };

    if (loading) {
        return (
            <div className="unified-transactions-view">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div>Loading transactions...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="unified-transactions-view">
                <div className="error-state">
                    <div>Error loading transactions: {error}</div>
                    <button onClick={fetchAllTransactions}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="unified-transactions-view">
            {/* Tab Navigation */}
            <div className="transaction-tabs">
                <button
                    className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Transactions
                    <span className="tab-count">{tabCounts.all}</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'incoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('incoming')}
                >
                    Incoming
                    <span className="tab-count">{tabCounts.incoming}</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending
                    <span className="tab-count">{tabCounts.pending}</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'validated' ? 'active' : ''}`}
                    onClick={() => setActiveTab('validated')}
                >
                    Validated
                    <span className="tab-count">{tabCounts.validated}</span>
                </button>
            </div>

            {/* Transaction Table */}
            <div className="transaction-content">
                <DataTable
                    data={currentData}
                    columns={getColumns()}
                    loading={loading}
                    tableTitle={getTabTitle()}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    actions={getActions()}
                    actionsColumnWidth="140px"
                    defaultItemsPerPage={25}
                    itemsPerPageOptions={[10, 25, 50, 100]}
                    className="transactions-table"
                />

                {/* Tab Description */}
                {getTabDescription() && (
                    <div className="tab-description">
                        {getTabDescription()}
                    </div>
                )}
            </div>

            {/* Accept Transaction Modal */}
            {showAcceptModal && selectedTransaction && (
                <div className="modal-backdrop">
                    <div className="flat-modal">
                        <div className="flat-modal-header">
                            <h2>Accept Transaction</h2>
                            <button
                                className="close-modal-btn"
                                onClick={() => setShowAcceptModal(false)}
                                disabled={processingAction}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flat-modal-content">
                            {/* Transaction Info Section */}
                            <div className="transaction-info-section">
                                <div className="info-row">
                                    <div className="info-col">
                                        <div className="info-label">Batch Number</div>
                                        <div className="info-value">{selectedTransaction.batchNumber}</div>
                                    </div>
                                    <div className="info-col">
                                        <div className="info-label">Sender</div>
                                        <div className="info-value">{selectedTransaction.sender}</div>
                                    </div>
                                    <div className="info-col">
                                        <div className="info-label">Receiver</div>
                                        <div className="info-value">{selectedTransaction.receiver}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Purpose Selection */}
                            <div className="purpose-section">
                                <label>Transaction Purpose:</label>
                                <select
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    disabled={processingAction}
                                >
                                    <option value="CONSUMABLE">Consumable</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                </select>
                            </div>

                            {/* Items Section */}
                            <div className="items-section">
                                <h3>Items</h3>
                                {selectedTransaction.items.map((item, index) => (
                                    <div key={item.id} className="item-container">
                                        <div className="item-details">
                                            <div className="item-name-block">
                                                <span className="item-number">{index + 1}</span>
                                                <div className="item-name-wrapper">
                                                    <div className="item-name">{item.itemType}</div>
                                                    <div className="item-category">{item.category}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="quantity-section">
                                            <div className="quantity-label">
                                                Received Quantity<span className="required-mark">*</span>
                                            </div>
                                            <div className="quantity-controls">
                                                <button
                                                    className="decrement-btn"
                                                    onClick={() => handleQuantityChange(item.id, Math.max(0, (receivedQuantities[item.id] || 0) - 1))}
                                                    disabled={processingAction}
                                                >-</button>
                                                <input
                                                    type="number"
                                                    value={receivedQuantities[item.id] || 0}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    min="0"
                                                    disabled={processingAction}
                                                />
                                                <button
                                                    className="increment-btn"
                                                    onClick={() => handleQuantityChange(item.id, (receivedQuantities[item.id] || 0) + 1)}
                                                    disabled={processingAction}
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Comments Section */}
                            <div className="comments-section">
                                <label className="comments-label">
                                    Comments<span className="optional-text">(optional)</span>
                                </label>
                                <textarea
                                    value={acceptComment}
                                    onChange={(e) => setAcceptComment(e.target.value)}
                                    placeholder="Add any comments about this transaction"
                                    disabled={processingAction}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="accept-button"
                                onClick={handleAcceptSubmit}
                                disabled={processingAction || selectedTransaction.items?.some((item) =>
                                    receivedQuantities[item.id] === undefined ||
                                    receivedQuantities[item.id] === "" ||
                                    parseInt(receivedQuantities[item.id]) < 0
                                )}
                            >
                                {processingAction ? "Processing..." : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                        Accept Transaction
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default UnifiedTransactionsView;