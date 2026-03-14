import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import './ProcurementOffers.scss';
import { useLocation } from 'react-router-dom';
import Tabs from "../../../components/common/Tabs/Tabs.jsx"

// Import services
import { offerService } from '../../../services/procurement/offerService.js';

// Import React Query hooks
import { useOffers, useOffersByMultipleStatuses, useCompletedFinanceOffers } from '../../../hooks/queries/useOffers.js';

// Import tabs
import UnstartedOffers from './UnstartedOffers/UnstartedOffers';
import InProgressOffers from './InprogressOffers/InProgressOffers';
import SubmittedOffers from './SubmittedOffers/SubmittedOffers';
import ValidatedOffers from "./ManagerValidatedOffers/ValidatedOffers";
import FinanceValidatedOffers from "./FinanceValidatedOffers/FinanceValidatedOffers";
import InspectionOffers from "./InspectionOffers/InspectionOffers.jsx";
import FinalizeOffers from "./FinalizeOffers/FinalizeOffers.jsx";
import CompletedOffers from "./CompletedOffers/CompletedOffers.jsx";

// Import PageHeader component
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';

// Icons
import {
    FiSearch, FiEdit, FiSend, FiX, FiChevronRight,
    FiClock, FiAlertCircle, FiCheckCircle, FiInbox, FiDollarSign, FiClipboard
} from 'react-icons/fi';

// Add this to your imports at the top
import { FiCheck } from 'react-icons/fi';

import { API_BASE_URL } from '../../../config/api.config';
const API_URL = `${API_BASE_URL}/api/v1`;

const ProcurementOffers = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const location = useLocation();

    // State
    const [pendingNewOffer, setPendingNewOffer] = useState(null);
    const [offers, setOffers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('unstarted');
    const [activeOffer, setActiveOffer] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [userRole, setUserRole] = useState('');
    const [pendingSubmittedOffer, setPendingSubmittedOffer] = useState(null);
    const [pendingFinalizedOffer, setPendingFinalizedOffer] = useState(null);
    const [pendingCompletedOffer, setPendingCompletedOffer] = useState(null);
    const [pendingValidatedOffer, setPendingValidatedOffer] = useState(null);
    const [pendingFinanceOffer, setPendingFinanceOffer] = useState(null);
    const [pendingInspectionOffer, setPendingInspectionOffer] = useState(null);

    // Map activeTab to the status used by useOffers
    const statusForTab = useMemo(() => {
        switch (activeTab) {
            case 'unstarted': return 'UNSTARTED';
            case 'inprogress': return 'INPROGRESS';
            case 'submitted': return 'SUBMITTED';
            case 'inspection': return 'INSPECTION_PENDING';
            case 'finalize': return 'FINALIZING';
            case 'completed': return 'COMPLETED';
            default: return null; // validated and finance use specialized hooks
        }
    }, [activeTab]);

    // Standard single-status query (used for most tabs)
    const {
        data: singleStatusData,
        isLoading: singleStatusLoading,
        refetch: refetchSingleStatus
    } = useOffers(statusForTab, {
        enabled: statusForTab !== null,
    });

    // Validated tab uses multiple statuses
    const {
        data: validatedData,
        isLoading: validatedLoading,
        refetch: refetchValidated
    } = useOffersByMultipleStatuses(['MANAGERACCEPTED', 'MANAGERREJECTED'], {
        enabled: activeTab === 'validated',
    });

    // Finance tab uses its own endpoint
    const {
        data: financeData,
        isLoading: financeLoading,
        refetch: refetchFinance
    } = useCompletedFinanceOffers({
        enabled: activeTab === 'finance',
    });

    // Derive the correct data and loading state based on the active tab
    const hookData = useMemo(() => {
        if (activeTab === 'validated') return validatedData || [];
        if (activeTab === 'finance') return financeData || [];
        return singleStatusData || [];
    }, [activeTab, singleStatusData, validatedData, financeData]);

    // Separate loading state for request order fetch (not managed by React Query)
    const [requestOrderLoading, setRequestOrderLoading] = useState(false);

    const loading = useMemo(() => {
        if (requestOrderLoading) return true;
        if (activeTab === 'validated') return validatedLoading;
        if (activeTab === 'finance') return financeLoading;
        if (statusForTab !== null) return singleStatusLoading;
        return false;
    }, [activeTab, singleStatusLoading, validatedLoading, financeLoading, statusForTab, requestOrderLoading]);

    // Refetch function that calls the right query's refetch
    const refetchOffers = useCallback(() => {
        if (activeTab === 'validated') return refetchValidated();
        if (activeTab === 'finance') return refetchFinance();
        return refetchSingleStatus();
    }, [activeTab, refetchSingleStatus, refetchValidated, refetchFinance]);

    // Track previous hook data to detect changes (replaces the old fetchData callback)
    const prevHookDataRef = useRef(null);

    // Sync hook data into local offers state + handle active offer selection
    useEffect(() => {
        // Skip if data hasn't actually changed (reference comparison)
        if (hookData === prevHookDataRef.current) return;
        prevHookDataRef.current = hookData;

        const offersData = hookData;
        setOffers(offersData);

        // Set active offer based on context
        if (offersData.length > 0) {
            if (pendingSubmittedOffer && activeTab === 'submitted') {
                const submittedOffer = offersData.find(offer => offer.id === pendingSubmittedOffer.id);
                setActiveOffer(submittedOffer || offersData[0]);
                setPendingSubmittedOffer(null);
            }
            else if (pendingValidatedOffer && activeTab === 'validated') {
                const validatedOffer = offersData.find(offer => offer.id === pendingValidatedOffer.id);
                setActiveOffer(validatedOffer || offersData[0]);
                setPendingValidatedOffer(null);
            }
            else if (pendingFinanceOffer && activeTab === 'finance') {
                const financeOffer = offersData.find(offer => offer.id === pendingFinanceOffer.id);
                setActiveOffer(financeOffer || offersData[0]);
                setPendingFinanceOffer(null);
            }
            else if (pendingInspectionOffer && activeTab === 'inspection') {
                const inspectionOffer = offersData.find(offer => offer.id === pendingInspectionOffer.id);
                setActiveOffer(inspectionOffer || offersData[0]);
                setPendingInspectionOffer(null);
            }
            else if (pendingFinalizedOffer && activeTab === 'finalize') {
                const finalizedOffer = offersData.find(offer => offer.id === pendingFinalizedOffer.id);
                setActiveOffer(finalizedOffer || offersData[0]);
                setPendingFinalizedOffer(null);
            }
            else if (pendingCompletedOffer && activeTab === 'completed') {
                setActiveOffer(pendingCompletedOffer);
                setPendingCompletedOffer(null);
            }
            else if (pendingNewOffer && activeTab === 'unstarted') {
                const newOffer = offersData.find(offer => offer.id === pendingNewOffer.id);
                setActiveOffer(newOffer || offersData[0]);
                setPendingNewOffer(null);
            }
            else if (activeOffer && offersData.find(offer => offer.id === activeOffer.id)) {
                const updatedActiveOffer = offersData.find(offer => offer.id === activeOffer.id);
                setActiveOffer(updatedActiveOffer);
            }
            else {
                setActiveOffer(offersData[0]);
            }
        } else {
            setActiveOffer(null);
        }
    }, [hookData, activeTab, pendingSubmittedOffer, pendingValidatedOffer, pendingFinanceOffer, pendingInspectionOffer, pendingFinalizedOffer, pendingCompletedOffer, pendingNewOffer]);

    // Helper function for authenticated fetch (keep for backward compatibility with child components)
    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication token not found');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        const response = await fetch(url, mergedOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Error: ${response.status}`);
        }

        // Check if response is 204 No Content or has no content
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null; // Return null for empty responses
        }

        return response.json();
    };

    // Fetch request order for a specific offer
    const fetchRequestOrderForOffer = async (offerId) => {
        try {
            return await offerService.getRequestOrder(offerId);
        } catch (error) {
            console.error(`Error fetching request order for offer ${offerId}:`, error);
            setError('Failed to load request order details. Please try again.');
            return null;
        }
    };

    useEffect(() => {
        if (location.state?.newOffer) {
            setPendingNewOffer(location.state.newOffer);
            setActiveTab(location.state.activeTab || 'unstarted');

            // Clear the navigation state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    // Get user role from localStorage on mount
    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }
    }, []);

    // Refetch data when pending offer state changes trigger a tab switch that needs fresh data
    useEffect(() => {
        refetchOffers();
    }, [pendingSubmittedOffer, pendingFinalizedOffer, pendingCompletedOffer, pendingNewOffer, pendingValidatedOffer, pendingFinanceOffer, pendingInspectionOffer]);

    // When active offer changes, fetch its request order
    useEffect(() => {
        const loadRequestOrderForActiveOffer = async () => {
            if (activeOffer && !activeOffer.requestOrder) {
                setRequestOrderLoading(true);
                try {
                    const requestOrder = await fetchRequestOrderForOffer(activeOffer.id);
                    if (requestOrder) {
                        // Update active offer with the request order
                        setActiveOffer({
                            ...activeOffer,
                            requestOrder: requestOrder
                        });
                    }
                    setRequestOrderLoading(false);
                } catch (error) {
                    console.error('Error loading request order:', error);
                    setRequestOrderLoading(false);
                }
            }
        };

        loadRequestOrderForActiveOffer();
    }, [activeOffer]);

    // Handle starting work on an offer (change from UNSTARTED to INPROGRESS)
    const handleOfferStatusChange = async (offerId, newStatus, offerData = null) => {
        try {
            await offerService.updateStatus(offerId, newStatus);

            // If this is a submission (INPROGRESS -> SUBMITTED), redirect to submitted tab
            if (newStatus === 'SUBMITTED' && offerData) {

                // Store the submitted offer for selection after tab switch
                setPendingSubmittedOffer({
                    ...offerData,
                    status: 'SUBMITTED'
                });

                // Switch to submitted tab - the hook will automatically refetch
                setActiveTab('submitted');

                // Don't update the current offers list since we're switching tabs
                return;
            }

            // For other status changes, update the current tab's offers locally for immediate UI feedback
            const updatedOffers = offers.filter(o => o.id !== offerId);
            setOffers(updatedOffers);

            // Update active offer
            if (activeOffer && activeOffer.id === offerId) {
                setActiveOffer(updatedOffers.length > 0 ? updatedOffers[0] : null);
            }

            // Refetch to ensure consistency with server
            refetchOffers();

            setSuccess(`Offer ${newStatus.toLowerCase()} successfully!`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error updating offer status:', error);
            setError('Failed to update offer status. Please try again.');
            setTimeout(() => setError(null), 3000);
        }
    };
    // Get total price for an offer
    const getTotalPrice = (offer) => {
        if (!offer || !offer.offerItems) return 0;
        return offer.offerItems.reduce((sum, item) => {
            const itemPrice = item.totalPrice ? parseFloat(item.totalPrice) : 0;
            return sum + itemPrice;
        }, 0);
    };

    // Count offers by status
    const getStatusCounts = () => {
        return {
            unstarted: activeTab === 'unstarted' ? offers.length : 0,
            inprogress: activeTab === 'inprogress' ? offers.length : 0,
            submitted: activeTab === 'submitted' ? offers.length : 0,
            completed: activeTab === 'completed' ? offers.length : 0
        };
    };

    const statusCounts = getStatusCounts();

    // Filter offers based on search term
    const filteredOffers = offers.filter(offer => {
        return searchTerm
            ? offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            offer.description?.toLowerCase().includes(searchTerm.toLowerCase())
            : true;
    });

    const handleRetryOffer = (newOffer) => {
        // Switch to the in-progress tab
        setActiveTab('inprogress');

        // Set the active offer to the newly created one
        setActiveOffer(newOffer);
    };

    // Handle delete offer callback
    const handleDeleteOffer = (offerId) => {
        // Remove the deleted offer from the offers array
        setOffers(prevOffers => prevOffers.filter(offer => offer.id !== offerId));

        // Clear the active offer if it was the deleted one
        if (activeOffer?.id === offerId) {
            setActiveOffer(null);
        }
    };

    const handleOfferFinalized = (finalizedOfferId) => {
        // Remove the finalized offer from the offers list
        setOffers(prevOffers => prevOffers.filter(offer => offer.id !== finalizedOfferId));
    };

    // Handle info button click
    const handleInfoClick = () => {
        // Navigate back to request orders or show info modal
        navigate('/procurement/request-orders');
    };

    // Handle offer started callback
    const handleOfferStarted = (startedOffer) => {
        // Switch to inprogress tab
        setActiveTab('inprogress');

        // Set the started offer as active (it will have INPROGRESS status now)
        setActiveOffer({
            ...startedOffer,
            status: 'INPROGRESS'
        });
    };

    // Handle offer sent to finalize callback
    const handleOfferSentToFinalize = (finalizedOffer) => {
        // Store the finalized offer for selection after tab switch
        setPendingFinalizedOffer(finalizedOffer);

        // Switch to finalize tab
        setActiveTab('finalize');
    };

    // Handle offer completed callback
    const handleOfferCompleted = (completedOffer) => {
        // Store the completed offer for selection after tab switch
        setPendingCompletedOffer(completedOffer);

        // Switch to completed tab
        setActiveTab('completed');
    };

    // Handle offer validated (approved/declined) callback
    const handleOfferValidated = (validatedOffer, action) => {

        // Store the validated offer for selection after tab switch
        setPendingValidatedOffer(validatedOffer);

        // Switch to validated tab
        setActiveTab('validated');
    };

    // NEW: Handle offer sent to finance callback
    const handleOfferSentToFinance = (financeOffer) => {

        // Store the finance offer for selection after tab switch
        setPendingFinanceOffer(financeOffer);

        // Switch to finance tab
        setActiveTab('finance');
    };

    // Handle offer sent to inspection (from finance approval of equipment offers)
    const handleOfferSentToInspection = (inspectionOffer) => {
        setPendingInspectionOffer(inspectionOffer);
        setActiveTab('inspection');
    };

    // Handle offer reset to unstarted (from failed inspection)
    const handleOfferResetToUnstarted = (offer) => {
        setPendingNewOffer(offer);
        setActiveTab('unstarted');
    };

    // Prepare stats data for the intro card
    const getActiveTabLabel = () => {
        switch(activeTab) {
            case 'unstarted': return 'Unstarted Offers';
            case 'inprogress': return 'In Progress Offers';
            case 'submitted': return 'Submitted Offers';
            case 'validated': return 'Validated Offers';
            case 'finance': return 'Finance Validated Offers';
            case 'inspection': return 'Inspection Offers';
            case 'finalize': return 'Finalize Offers';
            case 'completed': return 'Completed Offers';
            default: return 'Offers';
        }
    };

    const statsData = [
        {
            value: offers.length,
            label: getActiveTabLabel()
        }
    ];

    // Clear search when switching tabs
    const handleTabChange = (newTab) => {
        setSearchTerm(''); // Clear search term when switching tabs
        setActiveTab(newTab);
    };

    // Handle search input changes
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div className="procurement-offers-container">
            <PageHeader
                title="Offers"
                subtitle="Manage procurement offers and vendor proposals throughout the entire procurement lifecycle"
            />

            {/* Tabs Navigation */}

            <Tabs
                tabs={[
                    {
                        id: 'unstarted',
                        label: 'Unstarted',
                        icon: <FiInbox />
                    },
                    {
                        id: 'inprogress',
                        label: 'In Progress',
                        icon: <FiEdit />
                    },
                    {
                        id: 'submitted',
                        label: 'Submitted',
                        icon: <FiSend />
                    },
                    {
                        id: 'validated',
                        label: 'Manager Validated',
                        icon: <FiCheck />
                    },
                    {
                        id: 'finance',
                        label: 'Finance Validated',
                        icon: <FiDollarSign />
                    },
                    {
                        id: 'inspection',
                        label: 'Inspection',
                        icon: <FiClipboard />
                    },
                    {
                        id: 'finalize',
                        label: 'Finalize',
                        icon: <FiCheckCircle />
                    },
                    {
                        id: 'completed',
                        label: 'Completed',
                        icon: <FiCheckCircle />
                    }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Content Container with Theme Support */}
            <div className="procurement-content-container">
                {/* Search Bar Section */}
                <div className="procurement-section-description">


                    <div className="procurement-search-container">
                        <FiSearch className="procurement-search-icon" />
                        <input
                            type="text"
                            className="procurement-search-input"
                            placeholder={`Search offers in ${getActiveTabLabel().toLowerCase()}...`}
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        {searchTerm && (
                            <button
                                className="procurement-search-clear"
                                onClick={clearSearch}
                                style={{
                                    position: 'absolute',
                                    right: '0.6rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-muted)',
                                    padding: '0.2rem',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = 'var(--color-surface-hover)';
                                    e.target.style.color = 'var(--color-text-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = 'var(--color-text-muted)';
                                }}
                            >
                                <FiX size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Render the active tab component */}
                {loading ? (
                    <div className="procurement-loading">
                        <div className="procurement-spinner"></div>
                        <p>Loading offers data...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'unstarted' && (
                            <UnstartedOffers
                                offers={filteredOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                handleOfferStatusChange={handleOfferStatusChange}
                                onOfferStarted={handleOfferStarted}
                                onDeleteOffer={handleDeleteOffer}  // ADD THIS LINE
                            />
                        )}

                        {activeTab === 'inprogress' && (
                            <InProgressOffers
                                offers={filteredOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                handleOfferStatusChange={handleOfferStatusChange}
                                fetchWithAuth={fetchWithAuth}
                                API_URL={API_URL}
                                setError={setError}
                                setSuccess={setSuccess}
                                onDeleteOffer={handleDeleteOffer}  // ADD THIS LINE
                            />
                        )}

                        {activeTab === 'submitted' && (
                            <SubmittedOffers
                                offers={filteredOffers}
                                setOffers={setOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                getTotalPrice={getTotalPrice}
                                onOfferValidated={handleOfferValidated}
                            />
                        )}

                        {activeTab === 'validated' && (
                            <ValidatedOffers
                                offers={filteredOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                getTotalPrice={getTotalPrice}
                                onRetryOffer={handleRetryOffer}
                                onDeleteOffer={handleDeleteOffer}
                                onOfferSentToFinance={handleOfferSentToFinance} // NEW: Pass the finance callback
                            />
                        )}

                        {activeTab === 'finance' && (
                            <FinanceValidatedOffers
                                offers={filteredOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                getTotalPrice={getTotalPrice}
                                setError={setError}
                                setSuccess={setSuccess}
                                onOfferFinalized={handleOfferSentToFinalize}
                                onOfferSentToInspection={handleOfferSentToInspection}
                                onRetryOffer={handleRetryOffer}
                                onDeleteOffer={handleDeleteOffer}
                            />
                        )}

                        {activeTab === 'inspection' && (
                            <InspectionOffers
                                offers={filteredOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                getTotalPrice={getTotalPrice}
                                setError={setError}
                                setSuccess={setSuccess}
                                onOfferFinalized={handleOfferSentToFinalize}
                                onOfferResetToUnstarted={handleOfferResetToUnstarted}
                                onDeleteOffer={handleDeleteOffer}
                            />
                        )}

                        {activeTab === 'finalize' && (
                            <FinalizeOffers
                                offers={filteredOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                getTotalPrice={getTotalPrice}
                                setError={setError}
                                setSuccess={setSuccess}
                                onOfferFinalized={handleOfferFinalized}
                                onOfferCompleted={handleOfferCompleted}
                                onDeleteOffer={handleDeleteOffer}
                            />
                        )}

                        {/* Render the CompletedOffers component when the completed tab is active */}
                        {activeTab === 'completed' && (
                            <CompletedOffers
                                offers={filteredOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                getTotalPrice={getTotalPrice}
                                fetchWithAuth={fetchWithAuth}
                                API_URL={API_URL}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ProcurementOffers;