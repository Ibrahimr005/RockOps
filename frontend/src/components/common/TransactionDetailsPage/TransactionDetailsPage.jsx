import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiAlertCircle, FiPackage, FiArrowRight } from 'react-icons/fi';
import { transactionService } from '../../../services/transaction/transactionService';
import { Button } from '../../../components/common/Button';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2';
import './TransactionDetailsPage.scss';

const TransactionDetailsPage = () => {
    const { transaction: transactionId, id: warehouseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [transaction, setTransaction] = useState(null);
    const [resolutions, setResolutions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null);

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const isFromWarehouse = location.pathname.includes('/warehouses/');

    useEffect(() => {
        try {
            const userInfoString = localStorage.getItem('userInfo');
            if (userInfoString) setUserRole(JSON.parse(userInfoString).role);
        } catch (e) { console.error('Error parsing user info:', e); }
        fetchTransactionData();
    }, [transactionId]);

    const fetchTransactionData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await transactionService.getById(transactionId);
            setTransaction(data);

            if (data.status === 'RESOLVED' || data.status === 'RESOLVING') {
                try {
                    const resolutionData = await transactionService.getResolutionsByTransaction(transactionId);
                    console.log('=== RESOLUTIONS ===', JSON.stringify(resolutionData, null, 2));
                    setResolutions(Array.isArray(resolutionData) ? resolutionData : []);
                } catch (resErr) {
                    console.warn('Could not load resolutions:', resErr);
                }
            }
        } catch (err) {
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

    const shouldShowQuantities = () => {
        if (!transaction || !warehouseId) return true;
        return (
            warehouseId === transaction.sentFirst ||
            warehouseId === transaction.senderId  ||
            userRole === 'WAREHOUSE_MANAGER'      ||
            transaction.status === 'ACCEPTED'     ||
            transaction.status === 'RESOLVED'
        );
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'N/A';
    const formatDateTime = (d) => {
        if (!d) return 'N/A';
        const dt = new Date(d);
        return `${dt.toLocaleDateString('en-GB')} ${dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    };
    const getStatusDisplay = (s) => ({ PENDING:'Pending', ACCEPTED:'Accepted', REJECTED:'Rejected', RESOLVING:'Resolving', RESOLVED:'Resolved', COMPLETED:'Completed', CANCELLED:'Cancelled' }[s] || s);
    const getEntityName   = (e) => e ? (e.name || e.fullModelName || e.equipment?.fullModelName || 'N/A') : 'N/A';
    const getItemName     = (i) => i.itemType?.name || i.itemTypeName || 'Unknown Item';
    const getItemCategory = (i) => i.itemType?.itemCategoryName || i.itemType?.itemCategory?.name || i.itemCategory || null;
    const getMeasuringUnit = (i) => i.itemUnit || i.itemType?.measuringUnit || i.measuringUnit || 'units';
    const getReceiverLabel = (t) => ({ WAREHOUSE:'Warehouse', EQUIPMENT:'Equipment', LOSS:'Loss / Disposal' }[t] || t || 'N/A');

    const statusBadge = (status) => {
        const cls = { PENDING:'status-pending', ACCEPTED:'status-accepted', REJECTED:'status-rejected', RESOLVING:'status-resolving', RESOLVED:'status-resolved', COMPLETED:'status-completed', CANCELLED:'status-cancelled' }[status] || 'status-pending';
        return <span className={`tdp-status-badge ${cls}`}>{getStatusDisplay(status)}</span>;
    };

    // ── Loading / Error ────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="transaction-details-page">
            <div className="loading-container">
                <div className="spinner-large" />
                <p>Loading transaction...</p>
            </div>
        </div>
    );

    if (error || !transaction) return (
        <div className="transaction-details-page">
            <div className="error-container">
                <FiAlertCircle size={48} />
                <h3>Error Loading Transaction</h3>
                <p>{error || 'Transaction not found'}</p>
                <Button variant="primary" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        </div>
    );

    // ── Derived ────────────────────────────────────────────────────────────────
    const items        = transaction.items || [];
    const receiverLabel = getReceiverLabel(transaction.receiverType);
    const senderName   = transaction.senderName  || getEntityName(transaction.sender);
    const receiverName = transaction.receiverType === 'LOSS' ? 'Loss / Disposal' : (transaction.receiverName || getEntityName(transaction.receiver));

    const breadcrumbs = isFromWarehouse
        ? [{ label: 'Warehouses', onClick: () => navigate('/warehouses') }, { label: senderName, onClick: () => navigate(`/warehouses/${warehouseId}`) }, { label: `Batch #${transaction.batchNumber}` }]
        : [{ label: 'Transactions', onClick: () => navigate('/transactions') }, { label: `Batch #${transaction.batchNumber}` }];

    const stats = [
        { value: formatDate(transaction.transactionDate), label: 'Transaction Date' },
        { value: items.length, label: 'Total Items' },
        { value: formatDate(transaction.createdAt), label: 'Created' },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="transaction-details-page">
            <IntroCard
                title={`Transaction Batch #${transaction.batchNumber}`}
                label={getStatusDisplay(transaction.status)}
                breadcrumbs={breadcrumbs}
                icon={<FiPackage />}
                stats={stats}
            />

            <div className="tdp-tab">

                {/* ── Transaction Details ─────────────────────────────── */}
                <div className="tdp-section">
                    <h3 className="tdp-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        Transaction Details
                    </h3>
                    <div className="tdp-grid">
                        {transaction.batchNumber && (
                            <div className="tdp-grid-item">
                                <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg></div>
                                <div className="tdp-grid-content"><span className="tdp-grid-label">Batch Number</span><span className="tdp-grid-value">#{transaction.batchNumber}</span></div>
                            </div>
                        )}
                        <div className="tdp-grid-item">
                            <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                            <div className="tdp-grid-content"><span className="tdp-grid-label">Transaction Date</span><span className="tdp-grid-value">{formatDate(transaction.transactionDate)}</span></div>
                        </div>
                        <div className="tdp-grid-item">
                            <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,8 12,12 14,14"/></svg></div>
                            <div className="tdp-grid-content"><span className="tdp-grid-label">Status</span><span className={`tdp-grid-value tdp-status-text tdp-status-${transaction.status?.toLowerCase()}`}>{getStatusDisplay(transaction.status)}</span></div>
                        </div>
                        {transaction.createdAt && (
                            <div className="tdp-grid-item">
                                <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg></div>
                                <div className="tdp-grid-content"><span className="tdp-grid-label">Created At</span><span className="tdp-grid-value">{formatDateTime(transaction.createdAt)}</span></div>
                            </div>
                        )}
                        {transaction.addedBy && (
                            <div className="tdp-grid-item">
                                <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                                <div className="tdp-grid-content"><span className="tdp-grid-label">Created By</span><span className="tdp-grid-value">{transaction.addedBy}</span></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Transaction Parties ─────────────────────────────── */}
                <div className="tdp-section">
                    <h3 className="tdp-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Transaction Parties
                    </h3>
                    <div className="tdp-parties-row">
                        {/* Sender card */}
                        <div className="tdp-party-card tdp-party-sender">
                            <div className="tdp-party-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="tdp-party-info">
                                <span className="tdp-party-role">Sender</span>
                                <span className="tdp-party-name">{senderName}</span>
                                <span className="tdp-party-type-pill">{transaction.senderType || 'Warehouse'}</span>
                                {transaction.sender?.site?.name && (
                                    <span className="tdp-party-site">{transaction.sender.site.name}</span>
                                )}
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="tdp-parties-arrow">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </div>

                        {/* Receiver card */}
                        <div className="tdp-party-card tdp-party-receiver">
                            <div className="tdp-party-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="tdp-party-info">
                                <span className="tdp-party-role">Receiver</span>
                                <span className="tdp-party-name">{receiverName}</span>
                                <span className="tdp-party-type-pill">{receiverLabel}</span>
                                {transaction.receiver?.site?.name && (
                                    <span className="tdp-party-site">{transaction.receiver.site.name}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Description ─────────────────────────────────────── */}
                {transaction.description && (
                    <div className="tdp-section">
                        <h3 className="tdp-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
                                <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
                            </svg>
                            Description
                        </h3>
                        <div className="tdp-info-list">
                            <div className="tdp-info-item">
                                <div className="tdp-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg></div>
                                <div className="tdp-info-content"><span className="tdp-info-label">Note</span><span className="tdp-info-value">{transaction.description}</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Transaction Items ───────────────────────────────── */}
                <div className="tdp-section">
                    <h3 className="tdp-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        Transaction Items ({items.length})
                    </h3>

                    {items.length > 0 ? (
                        <div className="tdp-items-grid">
                            {items.map((item, index) => {
                                const unit    = getMeasuringUnit(item);
                                const sentQty = item.sentQuantity ?? item.quantity ?? 0;
                                const recvQty = item.receivedQuantity;
                                const hasStatusFooter = item.rejectionReason || ['ACCEPTED','REJECTED','RESOLVED'].includes(item.status);

                                return (
                                    <div key={index} className="tdp-item-card">
                                        <div className="tdp-item-header">
                                            <div className="tdp-item-icon">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                                                </svg>
                                            </div>
                                            <div className="tdp-item-title">
                                                <div className="tdp-item-name">{getItemName(item)}</div>
                                                {getItemCategory(item) && <div className="tdp-item-category">{getItemCategory(item)}</div>}
                                            </div>
                                            {shouldShowQuantities() && (
                                                <div className="tdp-item-qty-badge">{sentQty} {unit}</div>
                                            )}
                                        </div>

                                        {shouldShowQuantities() && recvQty != null && (
                                            <>
                                                <div className="tdp-item-divider" />
                                                <div className="tdp-item-details">
                                                    <div className="tdp-item-row">
                                                        <span className="tdp-item-row-label">Sent:</span>
                                                        <span className="tdp-item-row-value val-sent">{sentQty} {unit}</span>
                                                    </div>
                                                    <div className="tdp-item-row">
                                                        <span className="tdp-item-row-label">{item.itemNotReceived ? 'Not Received:' : 'Received:'}</span>
                                                        <span className={`tdp-item-row-value ${item.itemNotReceived ? 'val-not-received' : 'val-received'}`}>
                                                            {item.itemNotReceived ? '—' : `${recvQty} ${unit}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {hasStatusFooter && (
                                            <>
                                                <div className="tdp-item-divider" />
                                                <div className="tdp-item-details">
                                                    <div className="tdp-item-row">
                                                        <span className="tdp-item-row-label">Status:</span>
                                                        <span className="tdp-item-row-value">
                                                            {item.rejectionReason
                                                                ? <span className="tdp-item-status-pill pill-rejected">REJECTED</span>
                                                                : item.status === 'ACCEPTED'
                                                                    ? <span className="tdp-item-status-pill pill-accepted">ACCEPTED</span>
                                                                    : item.status === 'RESOLVED'
                                                                        ? <span className="tdp-item-status-pill pill-resolved">RESOLVED</span>
                                                                        : item.status === 'REJECTED'
                                                                            ? <span className="tdp-item-status-pill pill-rejected">REJECTED</span>
                                                                            : null}
                                                        </span>
                                                    </div>
                                                    {item.rejectionReason && (
                                                        <div className="tdp-item-row">
                                                            <span className="tdp-item-row-label">Reason:</span>
                                                            <span className="tdp-item-row-value">{item.rejectionReason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {item.comment && (
                                            <>
                                                <div className="tdp-item-divider" />
                                                <div className="tdp-item-comment">
                                                    <div className="tdp-item-comment-label">Comment:</div>
                                                    <div className="tdp-item-comment-text">{item.comment}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="tdp-empty">
                            <div className="tdp-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg></div>
                            <p className="tdp-empty-title">No items found</p>
                            <p className="tdp-empty-desc">This transaction doesn't contain any items.</p>
                        </div>
                    )}
                </div>

                {/* ── Acceptance Comment ───────────────────────────────── */}
                {transaction.acceptanceComment && (
                    <div className="tdp-section">
                        <h3 className="tdp-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            Comments
                        </h3>
                        <div className="tdp-info-list">
                            <div className="tdp-info-item">
                                <div className="tdp-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                <div className="tdp-info-content"><span className="tdp-info-label">Acceptance Comment</span><span className="tdp-info-value">{transaction.acceptanceComment}</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Completion Details ───────────────────────────────── */}
                {/*{(transaction.completedAt || transaction.approvedBy) && (*/}
                {/*    <div className="tdp-section">*/}
                {/*        <h3 className="tdp-section-title">*/}
                {/*            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>*/}
                {/*            Completion Details*/}
                {/*        </h3>*/}
                {/*        <div className="tdp-grid">*/}
                {/*            {transaction.completedAt && (*/}
                {/*                <div className="tdp-grid-item">*/}
               hhe {/*                    <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg></div>*/}
                {/*                    <div className="tdp-grid-content"><span className="tdp-grid-label">Completed At</span><span className="tdp-grid-value">{formatDateTime(transaction.completedAt)}</span></div>*/}
                {/*                </div>*/}
                {/*            )}*/}
                {/*            {transaction.approvedBy && (*/}
                {/*                <div className="tdp-grid-item">*/}
                {/*                    <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>*/}
                {/*                    <div className="tdp-grid-content"><span className="tdp-grid-label">Completed By</span><span className="tdp-grid-value">{transaction.approvedBy}</span></div>*/}
                {/*                </div>*/}
                {/*            )}*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*)}*/}

                {/* ── Discrepancy Resolutions ─────────────────────────── */}
                {resolutions.length > 0 && (() => {
                    const resolutionLabel = (type) => ({
                        ACKNOWLEDGE_LOSS: 'Acknowledged as Loss',
                        REPORT_THEFT:     'Reported as Theft',
                        FOUND_ITEMS:      'Items Found',
                        ACCEPT_SURPLUS:   'Surplus Accepted',
                        COUNTING_ERROR:   'Counting Error',
                        RETURN_TO_SENDER: 'Returned to Sender',
                    }[type] || type?.replace(/_/g, ' ') || '—');

                    const resolutionColor = (type) => ({
                        ACKNOWLEDGE_LOSS: 'rdp-type-loss',
                        REPORT_THEFT:     'rdp-type-loss',
                        FOUND_ITEMS:      'rdp-type-found',
                        ACCEPT_SURPLUS:   'rdp-type-surplus',
                        COUNTING_ERROR:   'rdp-type-error',
                        RETURN_TO_SENDER: 'rdp-type-error',
                    }[type] || '');

                    return (
                        <div className="tdp-section">
                            <h3 className="tdp-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Discrepancy Resolutions ({resolutions.length})
                            </h3>
                            <div className="tdp-resolution-list">
                                {resolutions.map((r, index) => (
                                    <div key={r.id || index} className="tdp-resolution-card">

                                        {/* Header: item name + resolution type pill */}
                                        <div className="tdp-resolution-item-header">
                                            <div className="tdp-resolution-item-icon">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                                                </svg>
                                            </div>
                                            <span className="tdp-resolution-item-name">
                                                {r._itemName || r.item?.itemType?.name || '—'}
                                            </span>
                                            <span className={`tdp-resolution-type-pill ${resolutionColor(r.resolutionType)}`}>
                                                {resolutionLabel(r.resolutionType)}
                                            </span>
                                        </div>

                                        {/* Details */}
                                        <div className="tdp-resolution-body">
                                            {r.originalStatus && (
                                                <div className="tdp-resolution-row">
                                                    <span className="tdp-resolution-label">Original Status</span>
                                                    <span className="tdp-resolution-value">
                                                        {r.originalStatus === 'MISSING' ? 'Missing' : r.originalStatus === 'OVERRECEIVED' ? 'Over Received' : r.originalStatus}
                                                    </span>
                                                </div>
                                            )}
                                            {r.originalQuantity != null && (
                                                <div className="tdp-resolution-row">
                                                    <span className="tdp-resolution-label">Discrepancy Qty</span>
                                                    <span className="tdp-resolution-value tdp-resolution-qty">
                                                        {r.originalStatus === 'MISSING' ? '-' : '+'}{r.originalQuantity} {r._itemUnit || ''}
                                                    </span>
                                                </div>
                                            )}
                                            {r.resolvedAt && (
                                                <div className="tdp-resolution-row">
                                                    <span className="tdp-resolution-label">Resolved At</span>
                                                    <span className="tdp-resolution-value">{formatDateTime(r.resolvedAt)}</span>
                                                </div>
                                            )}
                                            {r.resolvedBy && (
                                                <div className="tdp-resolution-row">
                                                    <span className="tdp-resolution-label">Resolved By</span>
                                                    <span className="tdp-resolution-value">{r.resolvedBy}</span>
                                                </div>
                                            )}
                                            {r.notes && (
                                                <div className="tdp-resolution-row tdp-resolution-notes-row">
                                                    <span className="tdp-resolution-label">Notes</span>
                                                    <span className="tdp-resolution-value tdp-resolution-notes">{r.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* ── Related Maintenance ──────────────────────────────── */}
                {transaction.maintenance && (
                    <div className="tdp-section">
                        <h3 className="tdp-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                            Related Maintenance
                        </h3>
                        <div className="tdp-grid">
                            <div className="tdp-grid-item">
                                <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg></div>
                                <div className="tdp-grid-content"><span className="tdp-grid-label">Maintenance ID</span><span className="tdp-grid-value">{transaction.maintenance.id}</span></div>
                            </div>
                            {transaction.maintenance.status && (
                                <div className="tdp-grid-item">
                                    <div className="tdp-grid-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,8 12,12 14,14"/></svg></div>
                                    <div className="tdp-grid-content"><span className="tdp-grid-label">Maintenance Status</span><span className="tdp-grid-value">{transaction.maintenance.status}</span></div>
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