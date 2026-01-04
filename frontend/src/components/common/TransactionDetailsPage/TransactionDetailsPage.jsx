import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiAlertCircle, FiPackage, FiArrowRight } from 'react-icons/fi';
import { transactionService } from '../../../services/transaction/transactionService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2';
import './TransactionDetailsPage.scss';

const TransactionDetailsPage = () => {
    const { transaction: transactionId, id: warehouseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [transaction, setTransaction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null);

    // Snackbar
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Determine if coming from warehouse
    const isFromWarehouse = location.pathname.includes('/warehouses/');

    useEffect(() => {
        // Get user role from localStorage
        try {
            const userInfoString = localStorage.getItem("userInfo");
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                setUserRole(userInfo.role);
            }
        } catch (error) {
            console.error("Error parsing user info:", error);
        }

        fetchTransactionData();
    }, [transactionId]);

    const fetchTransactionData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await transactionService.getById(transactionId);
            setTransaction(data);
        } catch (err) {
            console.error('Error fetching transaction:', err);
            setError(`Failed to load transaction: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // Check if quantities should be shown
    const shouldShowQuantities = () => {
        if (!transaction || !warehouseId) return true;

        return (
            (warehouseId === transaction.sentFirst || warehouseId === transaction.senderId) ||
            userRole === 'WAREHOUSE_MANAGER' ||
            transaction.status === 'ACCEPTED' ||
            transaction.status === 'RESOLVED'
        );
    };

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getStatusDisplay = (status) => {
        const displayMap = {
            'PENDING': 'Pending',
            'ACCEPTED': 'Accepted',
            'REJECTED': 'Rejected',
            'RESOLVING': 'Resolving',
            'RESOLVED': 'Resolved'
        };
        return displayMap[status] || status;
    };

    // Get entity name helper
    const getEntityName = (entity) => {
        if (!entity) return "N/A";
        return entity.name || entity.fullModelName || entity.equipment?.fullModelName || "N/A";
    };

    // Get item name
    const getItemName = (item) => {
        return item.itemType?.name || item.itemTypeName || "Unknown Item";
    };

    // Get item category
    const getItemCategory = (item) => {
        return item.itemType?.itemCategoryName || item.itemType?.itemCategory?.name || item.itemCategory || null;
    };

    // Get measuring unit
    const getMeasuringUnit = (item) => {
        return item.itemType?.measuringUnit || item.measuringUnit || 'units';
    };

    // Format quantity
    const formatQuantity = (item) => {
        if (!shouldShowQuantities()) return null;

        const unit = getMeasuringUnit(item);
        const sentQty = item.quantity || 0;
        const receivedQty = item.receivedQuantity;

        let quantityText = `${sentQty} sent`;

        if (receivedQty !== null && receivedQty !== undefined) {
            quantityText += `, ${receivedQty} received`;
        }

        if (unit) {
            quantityText += ` ${unit}`;
        }

        return quantityText;
    };

    if (isLoading) {
        return (
            <div className="transaction-details-page">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading transaction...</p>
                </div>
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="transaction-details-page">
                <div className="error-container">
                    <FiAlertCircle size={48} />
                    <h3>Error Loading Transaction</h3>
                    <p>{error || 'Transaction not found'}</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Build breadcrumbs
    const breadcrumbs = isFromWarehouse ? [
        { label: 'Warehouses', onClick: () => navigate('/warehouses') },
        { label: transaction.senderName || getEntityName(transaction.sender), onClick: () => navigate(`/warehouses/${warehouseId}`) },
        { label: `Batch #${transaction.batchNumber}` }
    ] : [
        { label: 'Transactions', onClick: () => navigate('/transactions') },
        { label: `Batch #${transaction.batchNumber}` }
    ];

    const stats = [
        {
            value: formatDate(transaction.transactionDate),
            label: 'Transaction Date'
        },
        {
            value: (transaction.items || []).length,
            label: 'Total Items'
        },
        {
            value: formatDate(transaction.createdAt),
            label: 'Created'
        }
    ];

    return (
        <div className="transaction-details-page">
            {/* IntroCard Header */}
            <IntroCard
                title={`Transaction Batch #${transaction.batchNumber}`}
                label={getStatusDisplay(transaction.status)}
                breadcrumbs={breadcrumbs}
                icon={<FiPackage />}
                stats={stats}
            />

            {/* Main Content */}
            <div className="transaction-details-content">
                {/* Transaction Overview Section */}
                <div className="transaction-details-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 11H1v3h8v3l8-5-8-5v3z"/>
                            <path d="M20 4v7a2 2 0 01-2 2H6"/>
                        </svg>
                        Transaction Details
                    </h3>
                    <div className="overview-grid">
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10,9 9,9 8,9"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Batch Number</span>
                                <span className="overview-value">#{transaction.batchNumber}</span>
                            </div>
                        </div>

                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Transaction Date</span>
                                <span className="overview-value">{formatDate(transaction.transactionDate)}</span>
                            </div>
                        </div>

                        {transaction.createdAt && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Created At</span>
                                    <span className="overview-value">{formatDateTime(transaction.createdAt)}</span>
                                </div>
                            </div>
                        )}

                        {transaction.addedBy && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Created By</span>
                                    <span className="overview-value">{transaction.addedBy}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction Parties Section */}
                <div className="transaction-details-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Transaction Parties
                    </h3>
                    <div className="parties-grid">
                        <div className="party-card sender">
                            <div className="party-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="party-info">
                                <span className="party-label">Sender</span>
                                <span className="party-name">{transaction.senderName || getEntityName(transaction.sender)}</span>
                                <span className="party-type">{transaction.senderType || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="party-arrow">
                            <FiArrowRight size={24} />
                        </div>

                        <div className="party-card receiver">
                            <div className="party-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="party-info">
                                <span className="party-label">Receiver</span>
                                <span className="party-name">{transaction.receiverName || getEntityName(transaction.receiver)}</span>
                                <span className="party-type">{transaction.receiverType || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Items Section */}
                <div className="transaction-details-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        Transaction Items ({(transaction.items || []).length})
                    </h3>

                    {(transaction.items || []).length > 0 ? (
                        <div className="items-grid">
                            {transaction.items.map((item, index) => (
                                <div key={index} className="item-card">
                                    <div className="item-header">
                                        <div className="item-icon-container">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                                            </svg>
                                        </div>
                                        <div className="item-title-container">
                                            <div className="item-name">{getItemName(item)}</div>
                                            {getItemCategory(item) && (
                                                <div className="item-category">{getItemCategory(item)}</div>
                                            )}
                                        </div>
                                        {shouldShowQuantities() && (
                                            <div className="item-quantity">{formatQuantity(item)}</div>
                                        )}
                                    </div>

                                    {(item.rejectionReason || item.status === 'ACCEPTED' || item.status === 'REJECTED' || item.status === 'RESOLVED') && (
                                        <>
                                            <div className="item-divider"></div>
                                            {item.rejectionReason && (
                                                <div className="item-status-box rejected">
                                                    <div className="item-status-label">REJECTED</div>
                                                    <div className="item-status-text">{item.rejectionReason}</div>
                                                </div>
                                            )}
                                            {!item.rejectionReason && item.status === 'ACCEPTED' && (
                                                <div className="item-status-box accepted">
                                                    <div className="item-status-label">ACCEPTED</div>
                                                    <div className="item-status-text">Quantity match between sent and received</div>
                                                </div>
                                            )}
                                            {!item.rejectionReason && item.status === 'RESOLVED' && (
                                                <div className="item-status-box resolved">
                                                    <div className="item-status-label">RESOLVED</div>
                                                    <div className="item-status-text">Quantity mismatch was identified and resolved</div>
                                                </div>
                                            )}
                                            {!item.rejectionReason && item.status === 'REJECTED' && (
                                                <div className="item-status-box rejected">
                                                    <div className="item-status-label">REJECTED</div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 12h8"/>
                                </svg>
                            </div>
                            <div className="empty-content">
                                <p className="empty-title">No items found</p>
                                <p className="empty-description">This transaction doesn't contain any items.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                {transaction.acceptanceComment && (
                    <div className="transaction-details-section">
                        <h3 className="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            Comments
                        </h3>
                        <div className="comment-box">
                            <div className="comment-header">
                                <span className="comment-type">Acceptance Comment</span>
                            </div>
                            <p className="comment-text">{transaction.acceptanceComment}</p>
                        </div>
                    </div>
                )}

                {/* Completion Details */}
                {(transaction.completedAt || transaction.approvedBy) && (
                    <div className="transaction-details-section">
                        <h3 className="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Completion Details
                        </h3>
                        <div className="overview-grid">
                            {transaction.completedAt && (
                                <div className="overview-item">
                                    <div className="overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <div className="overview-content">
                                        <span className="overview-label">Completed At</span>
                                        <span className="overview-value">{formatDateTime(transaction.completedAt)}</span>
                                    </div>
                                </div>
                            )}
                            {transaction.approvedBy && (
                                <div className="overview-item">
                                    <div className="overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="overview-content">
                                        <span className="overview-label">Completed By</span>
                                        <span className="overview-value">{transaction.approvedBy}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default TransactionDetailsPage;