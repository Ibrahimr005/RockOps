import React, { useState } from 'react';
import { FiClock, FiDollarSign, FiCheckCircle } from 'react-icons/fi';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import Tabs from '../../../components/common/Tabs/Tabs';
import PendingApprovalLogistics from './PendingApproval/PendingApprovalLogistics';
import PendingPaymentLogistics from './PendingPaymentLogistics/PendingPaymentLogistics';
import CompletedLogistics from './CompletedLogistics/CompletedLogistics';
import './ProcurementLogistics.scss';

const ProcurementLogistics = () => {
    const [activeTab, setActiveTab] = useState('pending-approval');
    const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
    const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);

    const tabs = [
        {
            id: 'pending-approval',
            label: 'Pending Approval',
            icon: <FiClock />,
            badge: pendingApprovalCount,
            badgeVariant: 'warning'
        },
        {
            id: 'pending-payment',
            label: 'Pending Payment',
            icon: <FiDollarSign />,
            badge: pendingPaymentCount,
            badgeVariant: 'info'
        },
        {
            id: 'completed',
            label: 'Completed',
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
                {activeTab === 'pending-approval' && (
                    <PendingApprovalLogistics onCountChange={setPendingApprovalCount} />
                )}
                {activeTab === 'pending-payment' && (
                    <PendingPaymentLogistics onCountChange={setPendingPaymentCount} />
                )}
                {activeTab === 'completed' && (
                    <CompletedLogistics onCountChange={setCompletedCount} />
                )}
            </div>
        </div>
    );
};

export default ProcurementLogistics;