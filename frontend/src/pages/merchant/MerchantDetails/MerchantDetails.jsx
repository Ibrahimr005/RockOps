import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MerchantDetails.scss';
import { FaBuilding, FaArrowLeft } from 'react-icons/fa';
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage.jsx";
import { merchantService } from '../../../services/merchant/merchantService.js';

// Import reorganized tab components
import BasicInfoTab from './tabs/BasicInfoTab.jsx';
import ContactDetailsTab from './tabs/ContactDetailsTab.jsx';
import PerformanceTab from './tabs/PerformanceTab.jsx';
import DocumentsTab from './tabs/DocumentsTab.jsx';
import TransactionsTab from './tabs/TransactionsTab.jsx';

const MerchantDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [merchant, setMerchant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        fetchMerchantDetails();
    }, [id]);

    const fetchMerchantDetails = async () => {
        try {
            setLoading(true);
            const response = await merchantService.getById(id);
            console.log('Merchant details response:', response);
            setMerchant(response.data || response);
        } catch (error) {
            console.error('Error fetching merchant details:', error);
            setError(error.message || 'Failed to fetch merchant details');
        } finally {
            setLoading(false);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'Not specified';
            }
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Not specified';
        }
    };

    // Calculate days since last order
    const calculateDaysSinceLastOrder = (lastOrderDate) => {
        if (!lastOrderDate) return 'N/A';
        try {
            const today = new Date();
            const lastOrder = new Date(lastOrderDate);
            if (isNaN(lastOrder.getTime())) {
                return 'N/A';
            }
            const diffTime = today - lastOrder;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return `${diffDays} days ago`;
        } catch (error) {
            console.error('Error calculating days since last order:', error);
            return 'N/A';
        }
    };

    if (loading) {
        return <LoadingPage />;
    }

    if (error) {
        return (
            <div className="merchant-details-container">
                <div className="merchant-details-error-message">
                    <h2>Error Loading Data</h2>
                    <p>{error}</p>
                    <div className="merchant-details-error-actions">
                        <button onClick={() => fetchMerchantDetails()}>Try Again</button>
                        <button onClick={() => navigate('/procurement/merchants')}>Back to Merchants</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!merchant) {
        return (
            <div className="merchant-details-container">
                <div className="merchant-details-error-message">
                    <h2>Merchant Not Found</h2>
                    <p>The requested merchant could not be found.</p>
                    <button onClick={() => navigate('/procurement/merchants')}>Back to Merchants</button>
                </div>
            </div>
        );
    }

    // Helper functions
    const getMerchantType = () => {
        return merchant.merchantType || 'Not specified';
    };

    const getSiteName = () => {
        return merchant.site?.name || 'No site assigned';
    };

    const getReliabilityLevel = () => {
        const score = merchant.reliabilityScore;
        if (!score) return 'Not rated';
        if (score >= 4.5) return 'Excellent';
        if (score >= 3.5) return 'Good';
        if (score >= 2.5) return 'Fair';
        return 'Needs Improvement';
    };

    return (
        <div className="merchant-details-container">
            <div className="merchant-details-content">
                {/* Beautiful Merchant Info Bar */}
                <div className="merchant-details-info-bar">
                    <div className="merchant-details-info-content">
                        <div className="merchant-details-avatar">
                            {merchant.photoUrl ? (
                                <img
                                    src={merchant.photoUrl}
                                    alt={merchant.name}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : (
                                <div className="merchant-details-avatar__placeholder">
                                    <FaBuilding />
                                </div>
                            )}
                            <div className="merchant-details-avatar__placeholder" style={{ display: 'none' }}>
                                <FaBuilding />
                            </div>
                        </div>

                        <div className="merchant-details-basic-info">
                            <h1 className="merchant-details-name">
                                {merchant.name}
                            </h1>
                            <div className="merchant-details-meta">
                                <span className="merchant-details-site">{getSiteName()}</span>
                                <span className="merchant-details-separator">•</span>
                                <span className="merchant-details-contact">{merchant.contactPersonName || 'No contact assigned'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reorganized Tabs */}
                <div className="merchant-details-tabs">
                    <div className="tabs-header">
                        <button
                            className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
                            onClick={() => setActiveTab('basic')}
                        >
                            Basic Info
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'contact' ? 'active' : ''}`}
                            onClick={() => setActiveTab('contact')}
                        >
                            Contact Details
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('performance')}
                        >
                            Performance
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                            onClick={() => setActiveTab('documents')}
                        >
                            Documents
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('transactions')}
                        >
                            Transactions
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'basic' && <BasicInfoTab merchant={merchant} formatDate={formatDate} getSiteName={getSiteName} />}
                        {activeTab === 'contact' && <ContactDetailsTab merchant={merchant} />}
                        {activeTab === 'performance' && <PerformanceTab merchant={merchant} formatDate={formatDate} />}
                        {activeTab === 'documents' && <DocumentsTab merchant={merchant} />}
                        {activeTab === 'transactions' && <TransactionsTab merchant={merchant} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MerchantDetails;