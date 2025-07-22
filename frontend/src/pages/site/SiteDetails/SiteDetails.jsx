import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SiteDetails.scss';
import { useAuth } from '../../../contexts/AuthContext.jsx';

// Import tab components
import SiteEquipmentTab from './tabs/SiteEquipmentTab';
import SiteEmployeesTab from './tabs/SiteEmployeesTab';
import SiteWarehousesTab from './tabs/SiteWarehousesTab';
import SiteFixedAssetsTab from './tabs/SiteFixedAssetsTab';
import SiteMerchantsTab from './tabs/SiteMerchantsTab';
import SitePartnersTab from './tabs/SitePartnersTab';
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage.jsx";
import { siteService } from '../../../services/siteService';

const SiteDetails = () => {
    const { siteId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [site, setSite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('equipment');

    const isAdminOrSiteAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SITE_ADMIN';

    useEffect(() => {
        fetchSiteDetails();
    }, [siteId]);

    const fetchSiteDetails = async () => {
        try {
            setLoading(true);
            const { data } = await siteService.getById(siteId);
            setSite(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching site details:', error);
            setError(error.message || 'Failed to fetch site details');
            setLoading(false);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <LoadingPage/>
        );
    }

    if (error) {
        return (
            <div className="site-details-container">
                <div className="error-message">
                    <h2>Error Loading Data</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button onClick={() => fetchSiteDetails()}>Try Again</button>
                        <button onClick={() => navigate('/sites')}>Back to Sites</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!site) {
        return (
            <div className="site-details-container">
                <div className="error-message">
                    <h2>Site Not Found</h2>
                    <p>The requested site could not be found.</p>
                    <button onClick={() => navigate('/sites')}>Back to Sites List</button>
                </div>
            </div>
        );
    }

    return (
        <div className="site-details-container">
            
            <div className="site-details-content">
                <div className="site-compact-header">
                    <div className="site-basic-info">
                        <div className="site-avatar">
                            <img
                                src={site.photoUrl || 'https://via.placeholder.com/60?text=Site'}
                                alt={site.name}
                            />
                            <div className={`site-status-indicator ${site.status?.toLowerCase() || 'active'}`}></div>
                        </div>
                        <div className="site-title">
                            <h1>{site.name}</h1>
                            {/*<p className="site-location">{site.location || 'Location not specified'}</p>*/}
                        </div>
                    </div>

                    <div className="site-quick-stats">
                        {/*<div className="stat-item">*/}
                        {/*    <span className="stat-label">Efficiency</span>*/}
                        {/*    <span className="stat-value">{site.efficiency || 'N/A'}%</span>*/}
                        {/*</div>*/}
                        <div className="stat-item">
                            <span className="stat-label">Created</span>
                            <span className="stat-value">{formatDate(site.creationDate)}</span>
                        </div>
                        {/*<div className="stat-item">*/}
                        {/*    <span className="stat-label">Manager</span>*/}
                        {/*    <span className="stat-value">{site.managerName || 'Not assigned'}</span>*/}
                        {/*</div>*/}
                    </div>
                </div>

                <div className="site-details-tabs">
                    <div className="tabs-header">
                        <button
                            className={`tab-button ${activeTab === 'equipment' ? 'active' : ''}`}
                            onClick={() => setActiveTab('equipment')}
                        >
                            Equipment
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
                            onClick={() => setActiveTab('employees')}
                        >
                            Employees
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'warehouses' ? 'active' : ''}`}
                            onClick={() => setActiveTab('warehouses')}
                        >
                            Warehouses
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'fixedassets' ? 'active' : ''}`}
                            onClick={() => setActiveTab('fixedassets')}
                        >
                            Fixed Assets
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'merchants' ? 'active' : ''}`}
                            onClick={() => setActiveTab('merchants')}
                        >
                            Merchants
                        </button>
                        {isAdminOrSiteAdmin && (
                            <button
                                className={`tab-button ${activeTab === 'partners' ? 'active' : ''}`}
                                onClick={() => setActiveTab('partners')}
                            >
                                Partners
                            </button>
                        )}
                    </div>

                    <div className="tab-content" data-active-tab={
                        activeTab === 'equipment' ? 'Equipment' :
                            activeTab === 'employees' ? 'Employees' :
                                activeTab === 'warehouses' ? 'Warehouses' :
                                    activeTab === 'fixedassets' ? 'Fixed Assets' :
                                        activeTab === 'merchants' ? 'Merchants' : 'Partners'
                    }>
                        {activeTab === 'equipment' && <SiteEquipmentTab siteId={siteId} />}
                        {activeTab === 'employees' && <SiteEmployeesTab siteId={siteId} />}
                        {activeTab === 'warehouses' && <SiteWarehousesTab siteId={siteId} />}
                        {activeTab === 'fixedassets' && <SiteFixedAssetsTab siteId={siteId} />}
                        {activeTab === 'merchants' && <SiteMerchantsTab siteId={siteId} />}
                        {activeTab === 'partners' && isAdminOrSiteAdmin && <SitePartnersTab siteId={siteId} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SiteDetails;