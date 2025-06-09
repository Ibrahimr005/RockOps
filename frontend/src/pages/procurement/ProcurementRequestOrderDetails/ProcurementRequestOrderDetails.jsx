import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProcurementRequestOrderDetails.scss';

const ProcurementRequestOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [requestOrder, setRequestOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchRequestOrderDetails();
    }, [id]);

    const fetchRequestOrderDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/requestOrders/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load request order details');
            }

            const data = await response.json();
            setRequestOrder(data);
        } catch (err) {
            setError('Failed to load request order details. ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    const getStatusConfig = (status) => {
        if (!status) return { color: '#6b7280', bg: '#f3f4f6', icon: '○' };

        switch(status.toLowerCase()) {
            case 'pending':
                return {
                    color: '#d97706',
                    bg: '#fef3c7',
                    icon: '⏳',
                    label: 'Pending Review'
                };
            case 'approved':
                return {
                    color: '#059669',
                    bg: '#d1fae5',
                    icon: '✓',
                    label: 'Approved'
                };
            case 'rejected':
                return {
                    color: '#dc2626',
                    bg: '#fee2e2',
                    icon: '✗',
                    label: 'Rejected'
                };
            case 'completed':
                return {
                    color: '#7c3aed',
                    bg: '#ede9fe',
                    icon: '★',
                    label: 'Completed'
                };
            default:
                return {
                    color: '#6b7280',
                    bg: '#f3f4f6',
                    icon: '○',
                    label: status
                };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateDaysAgo = (dateString) => {
        if (!dateString) return null;
        const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    if (loading) {
        return (
            <div className="request-details-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <h3>Loading Request Details</h3>
                    <p>Please wait while we fetch the request information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="request-details-container">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <h3>Unable to Load Request</h3>
                    <p>{error}</p>
                    <button className="primary-button" onClick={handleGoBack}>
                        Return to Requests
                    </button>
                </div>
            </div>
        );
    }

    if (!requestOrder) {
        return (
            <div className="request-details-container">
                <div className="not-found-state">
                    <div className="not-found-icon">🔍</div>
                    <h3>Request Not Found</h3>
                    <p>The request order you're looking for doesn't exist or you don't have permission to view it.</p>
                    <button className="primary-button" onClick={handleGoBack}>
                        Return to Requests
                    </button>
                </div>
            </div>
        );
    }

    const statusConfig = getStatusConfig(requestOrder.status);

    return (
        <div className="request-details-container">
            {/* Header Section */}
            <div className="page-header">
                <div className="header-top">
                    <button className="back-button" onClick={handleGoBack}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>

                </div>

                <div className="header-content">
                    <div className="request-info">
                        <div className="request-id">Request #{requestOrder.id?.slice(-8) || 'N/A'}</div>
                        <h1 className="request-title">{requestOrder.title}</h1>
                        <div className="request-meta">
                            <span className="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Created by {requestOrder.createdBy}
                            </span>
                            <span className="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12,6 12,12 16,14"></polyline>
                                </svg>
                                {calculateDaysAgo(requestOrder.createdAt)}
                            </span>
                        </div>
                    </div>
                    <div className="status-section">
                        <div
                            className="status-badge"
                            style={{
                                backgroundColor: statusConfig.bg,
                                color: statusConfig.color
                            }}
                        >
                            <span className="status-icon">{statusConfig.icon}</span>
                            {statusConfig.label}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tab-navigation2">
                <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11H5a2 2 0 00-2 2v5a2 2 0 002 2h4a2 2 0 002-2v-5a2 2 0 00-2-2zM19 11h-4a2 2 0 00-2 2v5a2 2 0 002 2h4a2 2 0 002-2v-5a2 2 0 00-2-2zM9 3H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2zM19 3h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2z"></path>
                    </svg>
                    Overview
                </button>
                <button
                    className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
                    onClick={() => setActiveTab('items')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                    Requested Items
                    {requestOrder.requestItems && (
                        <span className="item-count">{requestOrder.requestItems.length}</span>
                    )}
                </button>
                {requestOrder.purchaseOrder && (
                    <button
                        className={`tab-button ${activeTab === 'po' ? 'active' : ''}`}
                        onClick={() => setActiveTab('po')}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                        Purchase Order
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="overview-content">
                        <div className="details-grid">
                            <div className="detail-card">
                                <div className="card-header">
                                    <h3>Request Information</h3>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                                    </svg>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <span className="label">Requester</span>
                                        <span className="value">
                                            <div className="requester-info">
                                                <div className="avatar">{requestOrder.requesterName?.charAt(0) || 'U'}</div>
                                                {requestOrder.requesterName || 'Unknown'}
                                            </div>
                                        </span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Request Type</span>
                                        <span className="value type-badge">{requestOrder.partyType || "Standard"}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Created Date</span>
                                        <span className="value">{formatDate(requestOrder.createdAt)}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Last Updated</span>
                                        <span className="value">{formatDate(requestOrder.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-card">
                                <div className="card-header">
                                    <h3>Status & Timeline</h3>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12,6 12,12 16,14"></polyline>
                                    </svg>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <span className="label">Current Status</span>
                                        <span className="value">
                                            <div
                                                className="status-indicator"
                                                style={{
                                                    backgroundColor: statusConfig.bg,
                                                    color: statusConfig.color
                                                }}
                                            >
                                                {statusConfig.icon} {statusConfig.label}
                                            </div>
                                        </span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Deadline</span>
                                        <span className="value">
                                            {requestOrder.deadline ? (
                                                <span className="deadline-info">
                                                    {formatDate(requestOrder.deadline)}
                                                    {new Date(requestOrder.deadline) < new Date() && (
                                                        <span className="overdue-badge">Overdue</span>
                                                    )}
                                                </span>
                                            ) : (
                                                'No deadline set'
                                            )}
                                        </span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Processing Time</span>
                                        <span className="value">
                                            {requestOrder.createdAt && requestOrder.updatedAt ?
                                                `${Math.floor((new Date(requestOrder.updatedAt) - new Date(requestOrder.createdAt)) / (1000 * 60 * 60))} hours` :
                                                'In progress'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {requestOrder.description && (
                            <div className="description-card">
                                <div className="card-header">
                                    <h3>Description</h3>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                                        <polyline points="14,2 14,8 20,8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                    </svg>
                                </div>
                                <div className="card-content">
                                    <p className="description-text">{requestOrder.description}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Items Tab */}
                {activeTab === 'items' && (
                    <div className="items-content">
                        <div className="items-header">
                            <h2>Requested Items</h2>
                            <div className="items-summary">
                                <span className="total-items">
                                    {requestOrder.requestItems ? requestOrder.requestItems.length : 0} Items
                                </span>
                            </div>
                        </div>

                        {requestOrder.requestItems && requestOrder.requestItems.length > 0 ? (
                            <div className="items-grid">
                                {requestOrder.requestItems.map((item, index) => (
                                    <div className="item-card" key={index}>
                                        <div className="item-header">
                                            <div className="item-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path>
                                                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                                </svg>
                                            </div>
                                            <div className="item-info">
                                                <h4 className="item-name">{item.itemType.name}</h4>
                                                <p className="item-id">ID: {item.itemType.id}</p>
                                            </div>
                                            <div className="quantity-badge">
                                                <span className="quantity">{item.quantity}</span>
                                                <span className="unit">{item.itemType.measuringUnit}</span>
                                            </div>
                                        </div>

                                        {item.comment && (
                                            <div className="item-comment">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                                <span>{item.comment}</span>
                                            </div>
                                        )}

                                        <div className="item-details">
                                            <div className="detail-item">
                                                <span className="detail-label">Category</span>
                                                <span className="detail-value">{item.itemType.category || 'Standard'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📦</div>
                                <h3>No Items Requested</h3>
                                <p>This request doesn't contain any items.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Purchase Order Tab */}
                {activeTab === 'po' && requestOrder.purchaseOrder && (
                    <div className="po-content">
                        <div className="po-header">
                            <h2>Purchase Order Details</h2>
                            <button
                                className="view-po-button"
                                onClick={() => navigate(`/procurement/purchase-orders/${requestOrder.purchaseOrder.id}`)}
                            >
                                View Complete PO
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </div>

                        <div className="po-card">
                            <div className="po-summary">
                                <div className="po-number">
                                    <span className="label">Purchase Order</span>
                                    <span className="number">#{requestOrder.purchaseOrder.poNumber}</span>
                                </div>
                                <div className="po-status">
                                    <span
                                        className="status-badge"
                                        style={{
                                            backgroundColor: getStatusConfig(requestOrder.purchaseOrder.status).bg,
                                            color: getStatusConfig(requestOrder.purchaseOrder.status).color
                                        }}
                                    >
                                        {requestOrder.purchaseOrder.status}
                                    </span>
                                </div>
                                <div className="po-amount">
                                    <span className="label">Total Amount</span>
                                    <span className="amount">${requestOrder.purchaseOrder.totalAmount || 'N/A'}</span>
                                </div>
                                <div className="po-date">
                                    <span className="label">Created</span>
                                    <span className="date">{formatDate(requestOrder.purchaseOrder.createdAt)}</span>
                                </div>
                            </div>
                            <div className="po-message">
                                <div className="message-icon">✅</div>
                                <div className="message-content">
                                    <h4>Request Approved & Processed</h4>
                                    <p>This request has been approved and converted into a purchase order. All items have been processed and are ready for procurement.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProcurementRequestOrderDetails;