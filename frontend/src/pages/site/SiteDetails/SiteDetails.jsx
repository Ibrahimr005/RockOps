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
import {warehouseService} from "../../../services/warehouseService.js";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import {FaTrash} from "react-icons/fa";

const SiteDetails = () => {
    const { siteId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [site, setSite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('equipment');
    const [snackbar, setSnackbar] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    const isAdminOrSiteAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SITE_ADMIN';
    const isAdmin = currentUser?.role === "ADMIN";


    useEffect(() => {
        fetchSiteDetails();
    }, [siteId]);

    const fetchSiteDetails = async () => {
        try {
            setLoading(true);
            console.log('=== Site Details Debug ===');
            console.log('Site ID:', siteId);
            console.log('Environment:', import.meta.env.MODE);
            console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);

            // Log the exact endpoint being called
            const endpoint = `/api/v1/site/${siteId}`;
            console.log('Endpoint:', endpoint);
            console.log('Full URL should be:', `${import.meta.env.VITE_API_BASE_URL}${endpoint}`);

            console.log('Calling siteService.getById...');
            const response = await siteService.getById(siteId);
            console.log('Raw response:', response);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            console.log('Response data:', response.data);

            setSite(response.data);
            setLoading(false);
        } catch (error) {
            console.error('=== Error Details ===');
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error response:', error.response);
            console.error('Error request:', error.request);
            console.error('Error config:', error.config);
            setError(error.message || 'Failed to fetch site details');
            setLoading(false);
        }
    };
    const handleDeleteSite = async (siteId) => {
        try{
            await siteService.deleteSite(siteId);

            hideConfirmDialog();
            setSnackbar({
                show: true,
                message: "Site has been successfully deleted!",
                type: 'success'
            });
            navigate('/sites')
        } catch (error) {
            console.error("Failed to delete site:", error);
            const friendlyError = parseErrorMessage(error, 'delete');
            hideConfirmDialog();
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

    // Open delete confirmation dialog
    const handleOpenDeleteModal = (row) => {
        showConfirmDialog(
            'danger',
            'Delete site',
            `This action will permanently delete "${site.name}" and cannot be undone.`,
            () => handleDeleteSite(site.id)
        );
    };

    const showConfirmDialog = (type, title, message, onConfirm) => {
        setConfirmDialog({
            isVisible: true,
            type,
            title,
            message,
            onConfirm
        });
    };

    const hideConfirmDialog = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    const parseErrorMessage = (error, context = 'general') => {
        // If it's already a user-friendly message, return as is
        if (typeof error === 'string' && !error.includes('{') && !error.includes('Error:')) {
            return error;
        }

        // Extract error details from various error formats
        let errorMessage = '';
        let statusCode = null;

        if (error?.response) {
            statusCode = error.response.status;
            errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.response?.statusText ||
                error.message;
        } else if (error?.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Convert technical errors to user-friendly messages with site context
        const friendlyMessages = {
            // Network and connection errors
            'Network Error': 'Unable to connect to the server. Please check your internet connection and try again.',
            'timeout': 'The request took too long. Please try again.',
            'NETWORK_ERROR': 'Connection problem. Please check your network and try again.',

            // Authentication errors
            'Unauthorized': 'Your session has expired. Please log in again.',
            'Forbidden': 'You don\'t have permission to manage sites.',
            'Authentication failed': 'Please log in again to continue.',

            // Server errors
            'Internal Server Error': 'Something went wrong while processing your site request. Please try again in a few moments.',
            'Service Unavailable': 'The site management service is temporarily unavailable. Please try again later.',
            'Bad Gateway': 'Server connection issue. Please try again shortly.',

            // site-specific business logic errors
            'site not found': 'The selected site could not be found. It may have been removed.',
            'Site not found': 'The site information could not be found. Please refresh the page.',
            'already exists': 'A site with this name already exists on this site.',
            'Manager already assigned': 'This manager is already assigned to another site.',
            'employees assigned': 'This site has employees assigned and cannot be deleted until they are reassigned.',
            'dependencies': 'This site cannot be deleted because it has active dependencies.',
            'name required': 'site name is required.',
            'invalid manager': 'The selected manager is not valid or available.',
        };

        // Check for specific error patterns
        for (const [pattern, friendlyMsg] of Object.entries(friendlyMessages)) {
            if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
                return friendlyMsg;
            }
        }

        // Handle HTTP status codes with site context
        switch (statusCode) {
            case 400:
                if (context === 'add') {
                    return 'The site information is invalid. Please check the site name and try again.';
                } else if (context === 'update') {
                    return 'The site update is invalid. Please check the information and try again.';
                } else if (context === 'delete') {
                    return 'This site cannot be deleted. It may have employees or other dependencies.';
                }
                return 'Invalid site information. Please check your input and try again.';
            case 401:
                return 'Your session has expired. Please log in again.';
            case 403:
                return 'You don\'t have permission to manage sites.';
            case 404:
                return 'The site or site could not be found. Please refresh the page.';
            case 405:
                if (context === 'update') {
                    return 'The site update request format is not supported. Please check that all required information is provided and try again.';
                } else if (context === 'delete') {
                    return 'site deletion is currently not supported by the system. Please contact your administrator.';
                } else if (context === 'add') {
                    return 'Adding sites is currently not supported by the system. Please contact your administrator.';
                }
                return 'This site operation is not currently supported by the system. Please contact your administrator.';
            case 408:
                return 'The site operation took too long. Please try again.';
            case 409:
                if (context === 'add') {
                    return 'A site with this name already exists on this site or there\'s a conflict with the assigned manager.';
                }
                return 'There\'s a conflict with the site information. Please refresh and try again.';
            case 415:
                return 'The site information format is not valid. Please try again.';
            case 422:
                if (context === 'add') {
                    return 'The site information could not be processed. Please check that all required fields are filled correctly.';
                } else if (context === 'update') {
                    return 'The site update could not be processed. Please check the information provided.';
                }
                return 'The site information could not be processed. Please check your input.';
            case 429:
                return 'Too many site operations. Please wait a moment before trying again.';
            case 500:
                return 'Something went wrong while managing the site. Please try again in a few moments.';
            case 502:
                return 'site management service connection issue. Please try again shortly.';
            case 503:
                return 'The site management service is temporarily unavailable. Please try again later.';
            case 504:
                return 'The site operation took too long to complete. Please try again.';
            default:
                break;
        }

        // Clean up technical error messages
        if (errorMessage) {
            // Remove common technical prefixes
            errorMessage = errorMessage.replace(/^Error:\s*/i, '');
            errorMessage = errorMessage.replace(/^TypeError:\s*/i, '');
            errorMessage = errorMessage.replace(/^ReferenceError:\s*/i, '');

            // If it still looks like a technical error, provide a contextual generic message
            if (errorMessage.includes('undefined') ||
                errorMessage.includes('null') ||
                errorMessage.includes('{}') ||
                errorMessage.includes('JSON') ||
                errorMessage.length > 150) {

                if (context === 'add') {
                    return 'Unable to add the site. Please check the information and try again.';
                } else if (context === 'update') {
                    return 'Unable to update the site. Please check the information and try again.';
                } else if (context === 'delete') {
                    return 'Unable to delete the site. It may have dependencies that need to be resolved first.';
                }
                return 'An unexpected error occurred while managing the site. Please try again or contact support.';
            }

            return errorMessage;
        }

        // Fallback message with context
        if (context === 'add') {
            return 'Unable to add the site. Please check the information and try again.';
        } else if (context === 'update') {
            return 'Unable to update the site. Please try again.';
        } else if (context === 'delete') {
            return 'Unable to delete the site. Please try again.';
        }

        return 'An unexpected error occurred while managing sites. Please try again or contact support.';
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
                        <div className="delete-site">
                            {isAdmin && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevents click event from bubbling to the card
                                        handleOpenDeleteModal();
                                    }}
                                    className="site-danger"
                                >
                                    <FaTrash />
                                </button>
                            )}

                        </div>
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
            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={hideConfirmDialog}
                confirmText="Yes, Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default SiteDetails;