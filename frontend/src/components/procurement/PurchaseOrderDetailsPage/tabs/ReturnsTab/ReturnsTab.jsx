import React, { useState, useEffect } from 'react';
import { FiRotateCcw, FiPackage, FiDollarSign, FiCalendar, FiUser, FiFileText, FiAlertCircle } from 'react-icons/fi';
import { poReturnService } from '../../../../../services/procurement/poReturnService';
import { useNavigate } from 'react-router-dom';
import './ReturnsTab.scss';

const ReturnsTab = ({ purchaseOrder, onError }) => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (purchaseOrder?.id) {
            fetchReturns();
        }
    }, [purchaseOrder?.id]);

    const fetchReturns = async () => {
        setIsLoading(true);
        try {
            // Get all returns
            const allReturns = await poReturnService.getAll();

            // Filter by this PO
            const poReturns = allReturns.filter(ret => ret.purchaseOrderId === purchaseOrder.id);

            setReturns(poReturns);
        } catch (error) {
            console.error('❌ Error fetching returns:', error);
            if (onError) {
                onError('Failed to load returns data');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="returns-tab">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading returns data...</p>
                </div>
            </div>
        );
    }

    // Calculate total return amount
    const totalReturnAmount = returns.reduce((sum, ret) =>
        sum + parseFloat(ret.totalReturnAmount || 0), 0
    );

// Count by status
    const pendingCount = returns.filter(r => r.status === 'PENDING').length;
    const confirmedCount = returns.filter(r => r.status === 'CONFIRMED').length;
    const rejectedCount = returns.filter(r => r.status === 'REJECTED').length;

    return (
        <div className="returns-tab">
            {/* Summary Card */}
            <div className="returns-summary-card">
                <div className="summary-header">
                    <h3 className="summary-title">
                        <FiDollarSign />
                        Returns Summary
                    </h3>
                </div>

                <div className="summary-grid">
                    <div className="summary-item">
                        <div className="summary-label">Total Returns</div>
                        <div className="po-return-summary-value">{returns.length}</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Total Return Amount</div>
                        <div className="po-return-summary-value returns-cost">
                            {purchaseOrder.currency} {totalReturnAmount.toFixed(2)}
                        </div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Pending</div>
                        <div className="po-return-summary-value status-pending-return">{pendingCount}</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Confirmed</div>
                        <div className="po-return-summary-value status-confirmed-return">{confirmedCount}</div>
                    </div>
                </div>            </div>

            {/* Returns Entries */}
            {returns.length > 0 ? (
                <div className="returns-section">
                    <div className="section-title">
                        <FiRotateCcw />
                        Return Entries ({returns.length})
                    </div>

                    <div className="returns-list">
                        {returns.map(returnEntry => (
                            <ReturnCard
                                key={returnEntry.id}
                                returnData={returnEntry}
                                currency={purchaseOrder.currency}
                                onNavigate={() => navigate(`/procurement/purchase-order-returns/${returnEntry.id}`)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="empty-state">
                    <FiRotateCcw size={48} />
                    <h3>No Returns</h3>
                    <p>No returns have been created for this purchase order yet.</p>
                </div>
            )}
        </div>
    );
};

// Return Card Component
const ReturnCard = ({ returnData, currency, onNavigate }) => {
    const getStatusDisplay = (status) => {
        const displayMap = {
            'PENDING': 'Pending',
            'APPROVED': 'Approved',
            'REJECTED': 'Rejected'
        };
        return displayMap[status] || status;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <div className="return-card standalone" onClick={onNavigate}>
            <div className="return-card-header">
                <div className="return-icon">
                    <FiRotateCcw />
                </div>
                <div className="return-main-info">
                    <div className="return-number">{returnData.returnId}</div>
                    <div className="return-merchant">{returnData.merchantName}</div>
                </div>
                <div className="return-cost-info">
                    <div className="cost-label">Return Amount</div>
                    <div className="cost-value">
                        {currency} {parseFloat(returnData.totalReturnAmount || 0).toFixed(2)}
                    </div>
                    <div className={`status-badge status-${returnData.status?.toLowerCase()}`}>
                        {getStatusDisplay(returnData.status)}
                    </div>
                </div>
            </div>

            <div className="return-card-body">
                <div className="return-details-container">
                    <div className="return-detail">
                        <FiCalendar />
                        <div className="detail-content">
                            <span className="detail-label">Requested Date</span>
                            <span className="detail-value">{formatDate(returnData.requestedAt)}</span>
                        </div>
                    </div>

                    <div className="return-detail">
                        <FiUser />
                        <div className="detail-content">
                            <span className="detail-label">Requested By</span>
                            <span className="detail-value">{returnData.requestedBy || 'N/A'}</span>
                        </div>
                    </div>



                    {returnData.approvedAt && (
                        <div className="return-detail">
                            <FiCalendar />
                            <div className="detail-content">
                                <span className="detail-label">Approved Date</span>
                                <span className="detail-value">{formatDate(returnData.approvedAt)}</span>
                            </div>
                        </div>
                    )}

                    {returnData.approvedBy && (
                        <div className="return-detail">
                            <FiUser />
                            <div className="detail-content">
                                <span className="detail-label">Approved By</span>
                                <span className="detail-value">{returnData.approvedBy}</span>
                            </div>
                        </div>
                    )}

                </div>

                {returnData.reason && (
                    <div className="return-detail notes">
                        <FiFileText />
                        <span className="detail-label">Overall Reason</span>
                        <span className="detail-value">{returnData.reason}</span>
                    </div>
                )}

                {/* Return Items */}
                {returnData.returnItems && returnData.returnItems.length > 0 && (
                    <div className="return-items">
                        <div className="items-header">Return Items ({returnData.returnItems.length})</div>
                        <div className="items-list">
                            {returnData.returnItems.map(item => (
                                <div key={item.id} className="item-tag">
                                    <div className="item-tag-main">
                                        <FiPackage size={14} />
                                        <span className="item-tag-name">{item.itemTypeName}</span>
                                    </div>
                                    <div className="item-tag-details">
                                        <span className="item-qty">
                                            Return Qty: {item.returnQuantity}
                                        </span>
                                        <span className="item-separator">•</span>
                                        <span className="item-price">
                                            {currency} {parseFloat(item.unitPrice).toFixed(2)}/unit
                                        </span>
                                        <span className="item-separator">•</span>
                                        <span className="item-total">
                                            Total: {currency} {parseFloat(item.totalReturnAmount).toFixed(2)}
                                        </span>
                                    </div>
                                    {item.reason && (
                                        <div className="item-reason">
                                            <FiAlertCircle size={12} />
                                            <span>{item.reason}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReturnsTab;