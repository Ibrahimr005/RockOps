import React, { useState } from 'react';
import './InventoryValuation.scss';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import SubPageHeader from '../../../components/common/SubPageHeader/SubPageHeader.jsx';
import PendingApprovals from './PendingApprovals/PendingApprovals.jsx';
import ApprovalHistory from './ApprovalHistory/ApprovalHistory.jsx';
import AssetValuesView from './AssetValuesView/AssetValuesView.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2.jsx';

const InventoryValuation = () => {
    const [activeApprovalsTab, setActiveApprovalsTab] = useState('pending');
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
        <div className="inventory-valuation-page">
            {/* Main Page Header */}
            <PageHeader
                title="Inventory Valuation"
                subtitle="Approve item prices and monitor short-term and long-term assets' values"
            />

            {/* Price Approvals Section */}
            <div className="valuation-section">
                <SubPageHeader
                    title="Price Approvals"
                    subtitle="Review and approve pending item prices from warehouses"
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    }
                />

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
                    activeTab={activeApprovalsTab}
                    onTabChange={setActiveApprovalsTab}
                />

                <div className="tab-content">
                    {activeApprovalsTab === 'pending' && (
                        <PendingApprovals
                            showSnackbar={showSnackbar}
                            onPendingCountUpdate={handlePendingCountUpdate}
                        />
                    )}

                    {activeApprovalsTab === 'history' && (
                        <ApprovalHistory
                            showSnackbar={showSnackbar}
                        />
                    )}
                </div>
            </div>

            {/* Asset Values Section */}
            {/* Asset Values Section */}
            <div className="valuation-section">
                <AssetValuesView
                    showSnackbar={showSnackbar}
                />
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

export default InventoryValuation;