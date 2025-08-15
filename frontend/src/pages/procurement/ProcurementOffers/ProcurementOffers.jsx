import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import './ProcurementOffers.scss';

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

// Import the new component
import ProcurementIntroCard from '../../../components/common/IntroCard/IntroCard.jsx';

// Icons
import {
    FiSearch, FiEdit, FiSend, FiX, FiChevronRight,
    FiClock, FiAlertCircle, FiCheckCircle, FiInbox, FiDollarSign
} from 'react-icons/fi';

// Add this to your imports at the top
import { FiCheck } from 'react-icons/fi';
import offersImage from "../../../assets/imgs/pro_icon.png";
import offersImageDark from "../../../assets/imgs/pro_icon_dark.png"; // Add dark mode image

const API_URL = 'http://localhost:8080/api/v1';

const ProcurementOffers = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    // State
    const [loading, setLoading] = useState(true);
    const [offers, setOffers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('unstarted');
    const [activeOffer, setActiveOffer] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [userRole, setUserRole] = useState(''); // Added for role checking
    const [pendingSubmittedOffer, setPendingSubmittedOffer] = useState(null); // Track submitted offer for redirection
    const [pendingFinalizedOffer, setPendingFinalizedOffer] = useState(null); // Track finalized offer for redirection
    const [pendingCompletedOffer, setPendingCompletedOffer] = useState(null); // Track completed offer for redirection

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
                    offersData = await offerService.getMultipleStatuses(['FINANCE_ACCEPTED', 'FINANCE_PARTIALLY_ACCEPTED', 'FINANCE_REJECTED']);
                } else if (activeTab === 'finalize') {
                    offersData = await offerService.getByStatus('FINALIZING');
                } else if (activeTab === 'completed') {
                    offersData = await offerService.getByStatus('COMPLETED');
                } else {
                    offersData = [];
                }

                setOffers(offersData);

                // Set active offer based on context
                if (offersData.length > 0) {
                    // If we have a pending submitted offer and we're on the submitted tab, select it
                    if (pendingSubmittedOffer && activeTab === 'submitted') {
                        const submittedOffer = offersData.find(offer => offer.id === pendingSubmittedOffer.id);
                        if (submittedOffer) {
                            setActiveOffer(submittedOffer);
                            setPendingSubmittedOffer(null); // Clear the pending offer
                        } else {
                            setActiveOffer(offersData[0]);
                        }
                    }
                    // If we have a pending finalized offer and we're on the finalize tab, select it
                    else if (pendingFinalizedOffer && activeTab === 'finalize') {
                        const finalizedOffer = offersData.find(offer => offer.id === pendingFinalizedOffer.id);
                        if (finalizedOffer) {
                            setActiveOffer(finalizedOffer);
                            setPendingFinalizedOffer(null); // Clear the pending offer
                        } else {
                            setActiveOffer(offersData[0]);
                        }
                    }
                    // If we have a pending completed offer and we're on the completed tab, select it
                    else if (pendingCompletedOffer && activeTab === 'completed') {
                        setActiveOffer(pendingCompletedOffer);
                        setPendingCompletedOffer(null); // Clear the pending offer
                    }
                    // If we have an activeOffer and it exists in the new data, keep it selected
                    else if (activeOffer && offersData.find(offer => offer.id === activeOffer.id)) {
                        // Find the updated version of the active offer from the fetched data
                        const updatedActiveOffer = offersData.find(offer => offer.id === activeOffer.id);
                        setActiveOffer(updatedActiveOffer);
                    } else {
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
    }, [activeTab, pendingSubmittedOffer, pendingFinalizedOffer, pendingCompletedOffer]); // Add pendingCompletedOffer to dependencies

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

                // Switch to submitted tab
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

    // Handle offer completed callback - NEW FUNCTION
    const handleOfferCompleted = (completedOffer) => {
        // Store the completed offer for selection after tab switch
        setPendingCompletedOffer(completedOffer);

        // Switch to completed tab
        setActiveTab('completed');
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

    return (
        <div className="procurement-offers-container">
            {/* Header - Intro Card using the new component */}
            <ProcurementIntroCard
                title="Offers"
                label="PROCUREMENT CENTER"
                lightModeImage={offersImage}
                darkModeImage={offersImageDark}
                stats={statsData}
                onInfoClick={handleInfoClick}
            />

            {/* Tabs Navigation */}
            <div className="procurement-offers-tabs">
                <button
                    className={`procurement-offers-tab ${activeTab === 'unstarted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('unstarted')}
                >
                    <FiInbox /> Unstarted
                </button>
                <button
                    className={`procurement-offers-tab ${activeTab === 'inprogress' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inprogress')}
                >
                    <FiEdit /> In Progress
                </button>
                <button
                    className={`procurement-offers-tab ${activeTab === 'submitted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('submitted')}
                >
                    <FiSend /> Submitted
                </button>

                <button
                    className={`procurement-offers-tab ${activeTab === 'validated' ? 'active' : ''}`}
                    onClick={() => setActiveTab('validated')}
                >
                    <FiCheck /> Manager Validated
                </button>

                <button
                    className={`procurement-offers-tab ${activeTab === 'finance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('finance')}
                >
                    <FiDollarSign /> Finance Validated
                </button>

                <button
                    className={`procurement-offers-tab ${activeTab === 'finalize' ? 'active' : ''}`}
                    onClick={() => setActiveTab('finalize')}
                >
                    <FiCheckCircle /> Finalize
                </button>

                {/* Add the Completed Offers tab */}
                <button
                    className={`procurement-offers-tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    <FiCheckCircle /> Completed
                </button>
            </div>

            {/* Content Container with Theme Support */}
            <div className="procurement-content-container">
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
                            />
                        )}

                        {activeTab === 'submitted' && (
                            <SubmittedOffers
                                offers={filteredOffers}
                                setOffers={setOffers}
                                activeOffer={activeOffer}
                                setActiveOffer={setActiveOffer}
                                getTotalPrice={getTotalPrice}
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