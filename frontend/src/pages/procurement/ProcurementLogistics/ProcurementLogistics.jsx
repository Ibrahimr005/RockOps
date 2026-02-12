import React, { useState } from 'react';
import { FiClock, FiCheckCircle } from 'react-icons/fi';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import Tabs from '../../../components/common/Tabs/Tabs';
import PendingApprovalLogistics from './PendingApproval/PendingApprovalLogistics';
import HistoryLogistics from './HistoryLogistics/HistoryLogistics';
import './ProcurementLogistics.scss';

const ProcurementLogistics = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingCount, setPendingCount] = useState(0);
    const [historyCount, setHistoryCount] = useState(0);

    const tabs = [
        {
            id: 'pending',
            label: 'Pending Approval',
            icon: <FiClock />,
            badge: pendingCount,
            badgeVariant: 'warning'
        },
        {
            id: 'history',
            label: 'History',
            icon: <FiCheckCircle />,
        }
    ];

    return (
        <div className="procurement-logistics-page">
            <PageHeader
                title="Logistics Management"
                subtitle="Manage delivery logistics and transportation costs"
            />

            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <div className="logistics-content">
                {activeTab === 'pending' ? (
                    <PendingApprovalLogistics onCountChange={setPendingCount} />
                ) : (
                    <HistoryLogistics onCountChange={setHistoryCount} />
                )}
            </div>
        </div>
    );
};

export default ProcurementLogistics;