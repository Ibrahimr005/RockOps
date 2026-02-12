import React, { useState } from 'react';
import {FiDollarSign, FiFileText, FiCreditCard, FiGrid, FiRefreshCw} from 'react-icons/fi';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import Tabs from '../../../components/common/Tabs/Tabs';
import Dashboard from './Dashboard/Dashboard';
import OfferReviewsList from './OfferReviews/OfferReviewsList';
import PaymentRequestsList from './PaymentRequests/PaymentRequestsList';
import PaymentsList from './Payments/PaymentsList';
import RefundTracking from './RefundTracking/RefundTracking';
import './AccountsPayable.scss';

const AccountsPayable = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'offer-reviews':
                return <OfferReviewsList />;
            case 'payment-requests':
                return <PaymentRequestsList />;
            case 'payments':
                return <PaymentsList />;
            case 'refund-tracking':
                return <RefundTracking />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="accounts-payable-container">
            <PageHeader
                title="Accounts Payable"
                subtitle="Manage payments, offers, and merchant finances"
            />

            <div className="accounts-payable-content-container">
                <Tabs
                    tabs={[
                        { id: 'dashboard', label: 'Dashboard', icon: <FiGrid /> },
                        { id: 'offer-reviews', label: 'Offer Reviews', icon: <FiFileText /> },
                        { id: 'payment-requests', label: 'Payment Requests', icon: <FiFileText /> },
                        { id: 'payments', label: 'Payments', icon: <FiCreditCard /> },
                        { id: 'refund-tracking', label: 'Refund Tracking', icon: <FiRefreshCw /> },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
                <div className="accounts-payable-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AccountsPayable;