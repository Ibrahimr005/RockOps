import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import './ProcurementOffers.scss';
import { useLocation } from 'react-router-dom';
import Tabs from "../../../components/common/Tabs/Tabs.jsx"

// Import services
import { offerService } from '../../../services/procurement/offerService.js';

// Import tabs
import UnstartedOffers from './UnstartedOffers/UnstartedOffers';
import InProgressOffers from './InprogressOffers/InProgressOffers';
import SubmittedOffers from './SubmittedOffers/SubmittedOffers';
import ValidatedOffers from "./ManagerValidatedOffers/ValidatedOffers";
import FinanceValidatedOffers from "./FinanceValidatedOffers/FinanceValidatedOffers";
import FinalizeOffers from "./FinalizeOffers/FinalizeOffers.jsx";
import CompletedOffers from "./CompletedOffers/CompletedOffers.jsx";

// Import PageHeader component
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';

// Icons
import {
    FiSearch, FiEdit, FiSend, FiX, FiChevronRight,
    FiClock, FiAlertCircle, FiCheckCircle, FiInbox, FiDollarSign
} from 'react-icons/fi';

// Add this to your imports at the top
import { FiCheck } from 'react-icons/fi';

const API_URL = 'http://localhost:8080/api/v1';

const ProcurementOffers = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const location = useLocation();

    // State
    const [pendingNewOffer, setPendingNewOffer] = useState(null);
    const [loading, setLoading] = useState(true);
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
    const [pendingFinanceOffer, setPendingFinanceOffer] = useState(null); // NEW: Track finance validated offer

    // Helper function for authenticated fetch (keep for backward compatibility with child components)
    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        console.log("token:" + token);

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
            console.log('📦 RECEIVED NEW OFFER FROM NAVIGATION:', location.state.newOffer);
            setPendingNewOffer(location.state.newOffer);
            setActiveTab(location.state.activeTab || 'unstarted');

            // Clear the navigation state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    // Fetch data using service
    useEffect(() => {
        // Get user role from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                let offersData;

                if (activeTab === 'unstarted') {
                    offersData = await offerService.getByStatus('UNSTARTED');
                } else if (activeTab === 'inprogress') {
                    offersData = await offerService.getByStatus('INPROGRESS');
                } else if (activeTab === 'submitted') {
                    offersData = await offerService.getByStatus('SUBMITTED');
                } else if (activeTab === 'validated') {
                    offersData = await offerService.getMultipleStatuses(['MANAGERACCEPTED', 'MANAGERREJECTED']);
                } else if (activeTab === 'finance') {
                    offersData = await offerService.getCompletedFinanceOffers();
                } else if (activeTab === 'finalize') {
                    offersData = await offerService.getByStatus('FINALIZING');
                } else if (activeTab === 'completed') {
                    offersData = await offerService.getByStatus('COMPLETED');
                } else {
                    offersData = [];
                }

                console.log(`📊 Fetched ${offersData.length} offers for ${activeTab} tab`);
                setOffers(offersData);

                // Set active offer based on context
                if (offersData.length > 0) {
                    // If we have a pending submitted offer and we're on the submitted tab, select it
                    if (pendingSubmittedOffer && activeTab === 'submitted') {
                        console.log('🎯 Looking for pending submitted offer:', pendingSubmittedOffer.id);
                        const submittedOffer = offersData.find(offer => offer.id === pendingSubmittedOffer.id);
                        if (submittedOffer) {
                            console.log('✅ Found submitted offer, setting as active');
                            setActiveOffer(submittedOffer);
                            setPendingSubmittedOffer(null);
                        } else {
                            console.log('⚠️ Submitted offer not found in data, selecting first offer');
                            setActiveOffer(offersData[0]);
                        }
                    }
                    // If we have a pending validated offer and we're on the validated tab, select it
                    else if (pendingValidatedOffer && activeTab === 'validated') {
                        const validatedOffer = offersData.find(offer => offer.id === pendingValidatedOffer.id);
                        if (validatedOffer) {
                            setActiveOffer(validatedOffer);
                            setPendingValidatedOffer(null);
                        } else {
                            setActiveOffer(offersData[0]);
                        }
                    }
                    // If we have a pending finance offer and we're on the finance tab, select it
                    else if (pendingFinanceOffer && activeTab === 'finance') {
                        const financeOffer = offersData.find(offer => offer.id === pendingFinanceOffer.id);
                        if (financeOffer) {
                            setActiveOffer(financeOffer);
                            setPendingFinanceOffer(null);
                        } else {
                            setActiveOffer(offersData[0]);
                        }
                    }
                    // If we have a pending finalized offer and we're on the finalize tab, select it
                    else if (pendingFinalizedOffer && activeTab === 'finalize') {
                        const finalizedOffer = offersData.find(offer => offer.id === pendingFinalizedOffer.id);
                        if (finalizedOffer) {
                            setActiveOffer(finalizedOffer);
                            setPendingFinalizedOffer(null);
                        } else {
                            setActiveOffer(offersData[0]);
                        }
                    }
                    // If we have a pending completed offer and we're on the completed tab, select it
                    else if (pendingCompletedOffer && activeTab === 'completed') {
                        setActiveOffer(pendingCompletedOffer);
                        setPendingCompletedOffer(null);
                    }
                    // If we have a pending new offer and we're on the unstarted tab, select it
                    else if (pendingNewOffer && activeTab === 'unstarted') {
                        const newOffer = offersData.find(offer => offer.id === pendingNewOffer.id);
                        if (newOffer) {
                            setActiveOffer(newOffer);
                            setPendingNewOffer(null);
                        } else {
                            setActiveOffer(offersData[0]);
                        }
                    }
                    // If we have an activeOffer and it exists in the new data, keep it selected
                    else if (activeOffer && offersData.find(offer => offer.id === activeOffer.id)) {
                        // Find the updated version of the active offer from the fetched data
                        const updatedActiveOffer = offersData.find(offer => offer.id === activeOffer.id);
                        setActiveOffer(updatedActiveOffer);
                    }
                    else {
                        // Otherwise, select the first offer
                        setActiveOffer(offersData[0]);
                    }
                } else {
                    setActiveOffer(null);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load data. Please try again.');
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab, pendingSubmittedOffer, pendingFinalizedOffer, pendingCompletedOffer, pendingNewOffer, pendingValidatedOffer, pendingFinanceOffer]);
// ⬆️ IMPORTANT: Removed 'activeOffer' from dependencies to prevent infinite loop; // Add pendingFinanceOffer

    // When active offer changes, fetch its request order
    useEffect(() => {
        const loadRequestOrderForActiveOffer = async () => {
            if (activeOffer && !activeOffer.requestOrder) {
                setLoading(true);
                try {
                    const requestOrder = await fetchRequestOrderForOffer(activeOffer.id);
                    if (requestOrder) {
                        // Update active offer with the request order
                        setActiveOffer({
                            ...activeOffer,
                            requestOrder: requestOrder
                        });
                    }
                    setLoading(false);
                } catch (error) {
                    console.error('Error loading request order:', error);
                    setLoading(false);
                }
            }
        };

        loadRequestOrderForActiveOffer();
    }, [activeOffer]);

    // Handle starting work on an offer (change from UNSTARTED to INPROGRESS)
// Handle starting work on an offer (change from UNSTARTED to INPROGRESS)
    const handleOfferStatusChange = async (offerId, newStatus, offerData = null) => {
        try {
            await offerService.updateStatus(offerId, newStatus);

            // If this is a submission (INPROGRESS -> SUBMITTED), redirect to submitted tab
            if (newStatus === 'SUBMITTED' && offerData) {
                console.log('📤 Offer submitted, switching to submitted tab with offer:', offerData);

                // Store the submitted offer for selection after tab switch
                setPendingSubmittedOffer({
                    ...offerData,
                    status: 'SUBMITTED'
                });

                // Switch to submitted tab - this will trigger the useEffect that loads offers
                setActiveTab('submitted');

                // Don't update the current offers list since we're switching tabs
                return;
            }

            // For other status changes, update the current tab's offers
            const updatedOffers = offers.filter(o => o.id !== offerId);
            setOffers(updatedOffers);

            // Update active offer
            if (activeOffer && activeOffer.id === offerId) {
                setActiveOffer(updatedOffers.length > 0 ? updatedOffers[0] : null);
            }

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
        console.log(`Offer ${action}:`, validatedOffer);

        // Store the validated offer for selection after tab switch
        setPendingValidatedOffer(validatedOffer);

        // Switch to validated tab
        setActiveTab('validated');
    };

    // NEW: Handle offer sent to finance callback
    const handleOfferSentToFinance = (financeOffer) => {
        console.log('Offer sent to finance:', financeOffer);

        // Store the finance offer for selection after tab switch
        setPendingFinanceOffer(financeOffer);

        // Switch to finance tab
        setActiveTab('finance');
    };

    // Prepare stats data for the intro card
    const getActiveTabLabel = () => {
        switch(activeTab) {
            case 'unstarted': return 'Unstarted Offers';
            case 'inprogress': return 'In Progress Offers';
            case 'submitted': return 'Submitted Offers';
            case 'validated': return 'Validated Offers';
            case 'finance': return 'Finance Validated Offers';
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
                                onRetryOffer={handleRetryOffer}
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