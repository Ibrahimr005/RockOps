import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCornerDownRight, FiAlertCircle, FiPackage, FiDollarSign, FiCheckCircle, FiUser, FiCalendar } from 'react-icons/fi';
import { poReturnService } from '../../../../services/procurement/poReturnService';
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2';
import './PurchaseOrderReturnDetailsPage.scss';

const PurchaseOrderReturnDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [poReturn, setPoReturn] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Snackbar
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchPoReturnData();
    }, [id]);

    const fetchPoReturnData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await poReturnService.getById(id);
            console.log('📦 PO Return Details Data:', data);
            console.log('📦 Return Items:', data.returnItems);
            setPoReturn(data);
        } catch (err) {
            console.error('Error fetching PO return:', err);
            setError('Failed to load PO return details.');
        } finally {
            setIsLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    if (isLoading) {
        return (
            <div className="po-return-details-page">
                <div className="po-return-details-loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading PO return details...</p>
                </div>
            </div>
        );
    }

    if (error || !poReturn) {
        return (
            <div className="po-return-details-page">
                <div className="po-return-details-error-container">
                    <FiAlertCircle size={48} />
                    <h3>Error Loading PO Return</h3>
                    <p>{error || 'PO return not found'}</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getStatusDisplay = (status) => {
        const displayMap = {
            'PENDING': 'Pending',
            'CONFIRMED': 'Confirmed'
        };
        return displayMap[status] || status;
    };

    const breadcrumbs = [
        { label: 'Purchase Order Returns', onClick: () => navigate('/procurement/purchase-order-returns/') },
        { label: poReturn.returnId }
    ];

    const stats = [
        {
            value: formatDate(poReturn.requestedAt),
            label: 'Requested'
        },
        {
            value: poReturn.returnItems?.length || 0,
            label: 'Items'
        },
        {
            value: `${poReturn.totalReturnAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`,
            label: 'Total Amount'
        }
    ];

    return (
        <div className="po-return-details-page">
            {/* IntroCard Header */}
            <IntroCard
                title={poReturn.returnId}
                label={getStatusDisplay(poReturn.status)}
                breadcrumbs={breadcrumbs}
                icon={<FiCornerDownRight />}
                stats={stats}
            />

            {/* Overview Content */}
            <div className="po-return-details-overview-tab">
                {/* Basic Information Section */}
                <div className="po-return-details-section">
                    <div className="po-return-details-section-title">
                        <FiCornerDownRight />
                        Basic Information
                    </div>

                    <div className="po-return-details-grid">
                        <div className="po-return-details-item">
                            <div className="po-return-details-icon">
                                <FiPackage />
                            </div>
                            <div className="po-return-details-content">
                                <div className="po-return-details-label">Purchase Order</div>
                                <div className="po-return-details-value po-return-details-value--clickable"
                                     onClick={() => navigate(`/procurement/purchase-orders/details/${poReturn.purchaseOrderId}`)}>
                                    {poReturn.purchaseOrderNumber}
                                </div>
                            </div>
                        </div>

                        <div className="po-return-details-item">
                            <div className="po-return-details-icon">
                                <FiDollarSign />
                            </div>
                            <div className="po-return-details-content">
                                <div className="po-return-details-label">Total Return Amount</div>
                                <div className="po-return-details-value">
                                    {poReturn.totalReturnAmount?.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} EGP
                                </div>
                            </div>
                        </div>

                        <div className="po-return-details-item">
                            <div className="po-return-details-icon">
                                <FiCheckCircle />
                            </div>
                            <div className="po-return-details-content">
                                <div className="po-return-details-label">Status</div>
                                <div className={`po-return-details-value po-return-details-value--status-${poReturn.status?.toLowerCase()}`}>
                                    {getStatusDisplay(poReturn.status).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="po-return-details-item">
                            <div className="po-return-details-icon">
                                <FiUser />
                            </div>
                            <div className="po-return-details-content">
                                <div className="po-return-details-label">Requested By</div>
                                <div className="po-return-details-value">{poReturn.requestedBy}</div>
                            </div>
                        </div>

                        <div className="po-return-details-item">
                            <div className="po-return-details-icon">
                                <FiCalendar />
                            </div>
                            <div className="po-return-details-content">
                                <div className="po-return-details-label">Requested Date</div>
                                <div className="po-return-details-value">{formatDate(poReturn.requestedAt)}</div>
                            </div>
                        </div>

                        <div className="po-return-details-item">
                            <div className="po-return-details-icon">
                                <FiPackage />
                            </div>
                            <div className="po-return-details-content">
                                <div className="po-return-details-label">Number of Items</div>
                                <div className="po-return-details-value">{poReturn.returnItems?.length || 0}</div>
                            </div>
                        </div>
                    </div>

                    {poReturn.reason && (
                        <div className="po-return-details-notes">
                            <div className="po-return-details-notes-label">Overall Return Reason</div>
                            <div className="po-return-details-notes-text">{poReturn.reason}</div>
                        </div>
                    )}
                </div>

                {/* Return Items Section */}
                {poReturn.returnItems && poReturn.returnItems.length > 0 && (
                    <div className="po-return-details-section">
                        <div className="po-return-details-section-title">
                            <FiPackage />
                            Return Items ({poReturn.returnItems.length})
                        </div>

                        <div className="po-return-details-merchant-grid">
                            <div className="po-return-details-merchant-card">
                                <div className="po-return-details-merchant-header">
                                    <div className="po-return-details-merchant-name">
                                        {poReturn.merchantName || 'Multiple Merchants'}
                                    </div>
                                    <div className="po-return-details-merchant-total">
                                        {poReturn.totalReturnAmount?.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} EGP
                                    </div>
                                </div>

                                <div className="po-return-details-merchant-body">
                                    <div className="po-return-details-merchant-items-title">
                                        Items ({poReturn.returnItems.length})
                                    </div>
                                    <div className="po-return-details-items-list-wrapper">
                                        <div className="po-return-details-items-list">
                                            {poReturn.returnItems.map((item) => (
                                                <div key={item.id} className="po-return-details-item-tag">
                                                    <div className="po-return-details-item-main">
                                                        <FiPackage size={14} />
                                                        <span className="po-return-details-item-name">{item.itemTypeName}</span>
                                                    </div>
                                                    <div className="po-return-details-item-details">
                                                        <span className="po-return-details-item-qty">
                                                            {item.returnQuantity} units
                                                        </span>
                                                        <span className="po-return-details-item-separator">•</span>
                                                        <span className="po-return-details-item-price">
                                                            {item.unitPrice?.toLocaleString('en-US', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })} EGP/unit
                                                        </span>
                                                        <span className="po-return-details-item-separator">•</span>
                                                        <span className="po-return-details-item-total">
                                                            Total: {item.totalReturnAmount?.toLocaleString('en-US', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2
                                                        })} EGP
                                                        </span>
                                                    </div>
                                                    {item.reason && (
                                                        <div className="po-return-details-item-reason">
                                                            <span className="po-return-details-item-reason-label">Reason:</span>
                                                            <span className="po-return-details-item-reason-text">{item.reason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
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

export default PurchaseOrderReturnDetailsPage;