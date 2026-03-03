import React, { useState } from 'react';
import {FiDollarSign, FiFileText, FiCreditCard, FiGrid, FiRefreshCw} from 'react-icons/fi';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import Tabs from '../../../components/common/Tabs/Tabs';
import Dashboard from './Dashboard/Dashboard';
import OfferReviewsList from './OfferReviews/OfferReviewsList';
import PaymentRequestsList from './PaymentRequests/PaymentRequestsList';
import PaymentsList from './Payments/PaymentsList';
import IncomingPayments from "./IncomingPayments/IncomingPayments.jsx";
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
            case 'incoming-payments': // CHANGED
                return <IncomingPayments />; // NEW COMPONENT
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
                        { id: 'incoming-payments', label: 'Incoming Payments', icon: <FiRefreshCw /> }, // CHANGED
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