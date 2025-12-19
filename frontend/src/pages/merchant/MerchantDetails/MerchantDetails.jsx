import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MerchantDetails.scss';
import { FaBuilding, FaArrowLeft } from 'react-icons/fa';
import { FiInfo, FiTrendingUp, FiFileText, FiDollarSign, FiUsers } from 'react-icons/fi';
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage.jsx";
import { merchantService } from '../../../services/merchant/merchantService.js';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import IntroCard from '../../../components/common/IntroCard/IntroCard.jsx';


// Import reorganized tab components
import OverviewTab from './tabs/OverviewTab/OverviewTab.jsx'

import PerformanceTab from './tabs/PerformanceTab/PerformanceTab.jsx';
import DocumentsTab from './tabs/DocuementsTab/DocumentsTab.jsx';
import TransactionsTab from './tabs/TransactionsTab/TransactionsTab.jsx';
import ContactsTab from './tabs/ContactsTab/ContactsTab.jsx';

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

    const tabs = [
        {
            id: 'basic',
            label: 'Basic Info',

        },
        {
            id: 'performance',
            label: 'Performance',
        },
        {
            id: 'documents',
            label: 'Documents',


        },
        {
            id: 'transactions',
            label: 'Transactions',

        },
        {
            id: 'contacts',
            label: 'Contacts',

        }
    ];

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
                {/* Merchant Intro Card */}
                <IntroCard
                    title={merchant.name}
                    label="MERCHANT DETAILS"
                    breadcrumbs={[
                        {
                            label: 'Merchants',
                            icon: <FaBuilding />,
                            onClick: () => navigate('/merchants')
                        },
                        {
                            label: merchant.name
                        }
                    ]}
                    icon={merchant.photoUrl ? null : <FaBuilding />}
                    lightModeImage={merchant.photoUrl}
                    darkModeImage={merchant.photoUrl}
                    stats={[
                        {
                            value: merchant.merchantTypes?.join(', ') || 'N/A',
                            label: 'Type'
                        },
                        {
                            value: merchant.sites?.length > 0
                                ? merchant.sites.map(s => s.name).join(', ')
                                : 'No sites',
                            label: 'Sites'
                        },
                        {
                            value: merchant.reliabilityScore ? `${merchant.reliabilityScore}/5` : 'Not rated',
                            label: 'Reliability'
                        },
                        {
                            value: merchant.contacts?.length || 0,
                            label: 'Contacts'
                        }
                    ]}

                    className="merchant-details-intro"
                />

                {/* Reorganized Tabs */}
                {/* Reorganized Tabs */}
                <div className="merchant-details-tabs">
                    <Tabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />

                    <div className="tab-content">
                        {activeTab === 'basic' && <OverviewTab merchant={merchant} formatDate={formatDate} getSiteName={getSiteName} />}
                        {activeTab === 'performance' && <PerformanceTab merchant={merchant} formatDate={formatDate} />}
                        {activeTab === 'documents' && <DocumentsTab merchant={merchant} />}
                        {activeTab === 'transactions' && <TransactionsTab merchant={merchant} />}
                        {activeTab === 'contacts' && <ContactsTab merchant={merchant} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MerchantDetails;