import React, { useState } from 'react';
import './InventoryValuation.scss';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import PendingApprovals from './PendingApprovals/PendingApprovals.jsx';
// import WarehouseBalances from './WarehouseBalances/WarehouseBalances.jsx';
// import SiteBalances from './SiteBalances/SiteBalances.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2.jsx';

const InventoryValuation = () => {
    const [activeTab, setActiveTab] = useState('pendingApprovals');
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
            <PageHeader
                title="Inventory Valuation"
                subtitle="Approve item prices and monitor warehouse inventory values"
            />

            <Tabs
                tabs={[
                    {
                        id: 'pendingApprovals',
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
                        id: 'warehouses',
                        label: 'Warehouse Balances',
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        )
                    },
                    {
                        id: 'sites',
                        label: 'Site Balances',
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        )
                    }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <div className="tab-content">
                {activeTab === 'pendingApprovals' && (
                    <PendingApprovals
                        showSnackbar={showSnackbar}
                        onPendingCountUpdate={handlePendingCountUpdate}
                    />
                )}

                {/*{activeTab === 'warehouses' && (*/}
                {/*    <WarehouseBalances*/}
                {/*        showSnackbar={showSnackbar}*/}
                {/*    />*/}
                {/*)}*/}

                {/*{activeTab === 'sites' && (*/}
                {/*    <SiteBalances*/}
                {/*        showSnackbar={showSnackbar}*/}
                {/*    />*/}
                {/*)}*/}
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