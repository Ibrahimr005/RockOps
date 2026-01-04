import React, { useState } from 'react';
import { FiDollarSign, FiFileText, FiCreditCard, FiGrid } from 'react-icons/fi';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import Dashboard from './Dashboard/Dashboard';
import OfferReviewsList from './OfferReviews/OfferReviewsList';
import PaymentRequestsList from './PaymentRequests/PaymentRequestsList';
import PaymentsList from './Payments/PaymentsList';
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
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="accounts-payable-container">
            <IntroCard
                title="Accounts Payable"
                label="FINANCE MODULE"
                icon={<FiDollarSign size={48} />}
            />

            <div className="accounts-payable-content-container">
                <div className="tabs-header">
                    <button
                        className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <FiGrid />
                        <span>Dashboard</span>
                    </button>

                    <button
                        className={`tab-button ${activeTab === 'offer-reviews' ? 'active' : ''}`}
                        onClick={() => setActiveTab('offer-reviews')}
                    >
                        <FiFileText />
                        <span>Offer Reviews</span>
                    </button>

                    <button
                        className={`tab-button ${activeTab === 'payment-requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payment-requests')}
                    >
                        <FiFileText />
                        <span>Payment Requests</span>
                    </button>

                    <button
                        className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        <FiCreditCard />
                        <span>Payments</span>
                    </button>
                </div>

                <div className="accounts-payable-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AccountsPayable;