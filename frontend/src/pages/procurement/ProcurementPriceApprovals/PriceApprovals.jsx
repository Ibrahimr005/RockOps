import React, { useState } from 'react';
import './PriceApprovals.scss';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import PendingApprovals from './PendingApprovals/PendingApprovals.jsx';
import ApprovalHistory from './ApprovalHistory/ApprovalHistory.jsx';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2.jsx';

const PriceApprovals = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingCount, setPendingCount] = useState(0);

    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const handlePendingCountUpdate = (count) => {
        setPendingCount(count);
    };

    return (
        <div className="price-approvals-page">
            {/* Page Header */}
            <PageHeader
                title="Price Approvals"
                subtitle="Review and approve pending item prices from warehouses"
            />

            {/* Tabs Section */}
            <div className="approvals-section">
                <Tabs
                    tabs={[
                        {
                            id: 'pending',
                            label: 'Pending Approvals',
                            badge: pendingCount,
                            badgeVariant: 'warning',
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                </svg>
                            )
                        },
                        {
                            id: 'history',
                            label: 'Approval History',
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )
                        }
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <div className="tab-content">
                    {activeTab === 'pending' && (
                        <PendingApprovals
                            showSnackbar={showSnackbar}
                            onPendingCountUpdate={handlePendingCountUpdate}
                        />
                    )}

                    {activeTab === 'history' && (
                        <ApprovalHistory
                            showSnackbar={showSnackbar}
                        />
                    )}
                </div>
            </div>

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={notificationType === 'error' ? 5000 : 3000}
            />
        </div>
    );
};

export default PriceApprovals;