import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProcurementOffers.scss';

// Import tabs
import UnstartedOffers from './UnstartedOffers/UnstartedOffers';
import InProgressOffers from './InprogressOffers/InProgressOffers';
import SubmittedOffers from './SubmittedOffers/SubmittedOffers';
import ValidatedOffers from "./ManagerValidatedOffers/ValidatedOffers";
import FinanceValidatedOffers from "./FinanceValidatedOffers/FinanceValidatedOffers";
import FinalizeOffers from "./FinalizeOffers/FinalizeOffers";
import CompletedOffers from "./CompletedOffers/CompletedOffers.jsx"; // Import the CompletedOffers component

// Icons
import {
    FiSearch, FiEdit, FiSend, FiX, FiChevronRight,
    FiClock, FiAlertCircle, FiCheckCircle, FiInbox, FiDollarSign
} from 'react-icons/fi';

// Add this to your imports at the top
import { FiCheck } from 'react-icons/fi';
import offersImage from "../../../assets/imgs/pro_icon.png";

const API_URL = 'http://localhost:8080/api/v1';


const ProcurementOffers = () => {
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [offers, setOffers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('unstarted');
    const [activeOffer, setActiveOffer] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [userRole, setUserRole] = useState(''); // Added for role checking

    // Helper function for authenticated fetch
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
            return await fetchWithAuth(`${API_URL}/offers/${offerId}/request-order`);
        } catch (error) {
            console.error(`Error fetching request order for offer ${offerId}:`, error);
            setError('Failed to load request order details. Please try again.');
            return null;
        }
    };

    // Fetch data
    useEffect(() => {
        // Get user role from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch offers based on active tab
                let offersData;
                if (activeTab === 'unstarted') {
                    offersData = await fetchWithAuth(`${API_URL}/offers?status=UNSTARTED`);
                } else if (activeTab === 'inprogress') {
                    offersData = await fetchWithAuth(`${API_URL}/offers?status=INPROGRESS`);
                } else if (activeTab === 'submitted') {
                    // Explicitly handle the submitted tab, using the correct format for multiple statuses
                    offersData = await fetchWithAuth(`${API_URL}/offers?status=SUBMITTED`);
                    // const sentOffers = await fetchWithAuth(`${API_URL}/offers?status=SENT`);
                    // const acceptedOffers = await fetchWithAuth(`${API_URL}/offers?status=ACCEPTED`);
                    // const rejectedOffers = await fetchWithAuth(`${API_URL}/offers?status=REJECTED`);

                    // Combine all the relevant statuses
                    // offersData = [...submittedOffers, ...sentOffers, ...acceptedOffers, ...rejectedOffers];
                } else if (activeTab === 'validated') {
                    // Get ACCEPTED and REJECTED offers for the Validated tab
                    const acceptedOffers = await fetchWithAuth(`${API_URL}/offers?status=MANAGERACCEPTED`);
                    const rejectedOffers = await fetchWithAuth(`${API_URL}/offers?status=MANAGERREJECTED`);

                    // Combine the relevant statuses
                    offersData = [...acceptedOffers, ...rejectedOffers];


                    // offersData = allValidatedOffers.filter(offer =>
                    //     offer.financeStatus === 'PENDING_FINANCE_REVIEW' || offer.financeStatus === null
                    // );

                } else if (activeTab === 'finance') {
                    // Get finance reviewed offers
                    // This endpoint would need to be implemented in your backend
                    const acceptedOffers = await fetchWithAuth(`${API_URL}/offers?status=FINANCE_ACCEPTED`);
                    const accepted2Offers = await fetchWithAuth(`${API_URL}/offers?status=FINANCE_PARTIALLY_ACCEPTED`);
                    const rejectedOffers = await fetchWithAuth(`${API_URL}/offers?status=FINANCE_REJECTED`);
                    offersData = [...acceptedOffers,...accepted2Offers, ...rejectedOffers];

                } else if (activeTab === 'finalize') {
                    // Get offers with finance status FINANCE_ACCEPTED
                    offersData = await fetchWithAuth(`${API_URL}/offers?status=FINALIZING`);
                } else if (activeTab === 'completed') {
                    // Get completed offers
                    offersData = await fetchWithAuth(`${API_URL}/offers?status=COMPLETED`);
                } else {
                    offersData = [];
                }

                setOffers(offersData);

                // Set first offer as active if available
                if (offersData.length > 0) {
                    setActiveOffer(offersData[0]);
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
    }, [activeTab]);

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
    const handleOfferStatusChange = async (offerId, newStatus) => {
        try {
            await fetchWithAuth(`${API_URL}/offers/${offerId}/status?status=${newStatus}`, {
                method: 'PUT'
            });

            // Remove the offer from the current tab's list
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

    // Get the tab description
    const getTabDescription = () => {
        switch(activeTab) {
            case 'unstarted':
                return '(New offers created when request order was accepted - need items added)';
            case 'inprogress':
                return '(Offers that are being worked on but not yet submitted)';
            case 'submitted':
                return '(Offers that have been sent to managers for review)';
            case 'validated':
                return '(Offers that have been accepted or rejected by managers and are sent to the finance)';
            case 'finance':
                return '(Offers that have been reviewed by finance)';
            case 'finalize':
                return '(Offers that have been accepted by finance and are ready for final confirmation)';
            case 'completed':
                return '(Offers that have been fully processed and completed)';
            default:
                return '';
        }
    };

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

    const handleOfferFinalized = (finalizedOfferId) => {
        // Remove the finalized offer from the offers list
        setOffers(prevOffers => prevOffers.filter(offer => offer.id !== finalizedOfferId));
    };

    return (
        <div className="procurement-offers-container">
            {/*/!* Notification system *!/*/}
            {/*{error && (*/}
            {/*    <div className="procurement-notification procurement-notification-error">*/}
            {/*        <FiAlertCircle className="procurement-notification-icon" />*/}
            {/*        <span>{error}</span>*/}
            {/*        <button*/}
            {/*            className="procurement-notification-close"*/}
            {/*            onClick={() => setError(null)}*/}
            {/*        >*/}
            {/*            <FiX />*/}
            {/*        </button>*/}
            {/*    </div>*/}
            {/*)}*/}

            {/*{success && (*/}
            {/*    <div className="procurement-notification procurement-notification-success">*/}
            {/*        <FiCheckCircle className="procurement-notification-icon" />*/}
            {/*        <span>{success}</span>*/}
            {/*        <button*/}
            {/*            className="procurement-notification-close"*/}
            {/*            onClick={() => setSuccess(null)}*/}
            {/*        >*/}
            {/*            <FiX />*/}
            {/*        </button>*/}
            {/*    </div>*/}
            {/*)}*/}

            {/* Header - Intro Card */}
            <div className="procurement-intro-card">
                <div className="procurement-intro-left">
                    <img
                        src={offersImage}
                        alt="Offers"
                        className="procurement-intro-image"
                    />
                </div>

                <div className="procurement-intro-content">
                    <div className="procurement-intro-header">
                        <span className="procurement-label">PROCUREMENT CENTER</span>
                        <h2 className="procurement-intro-title">Offers</h2>
                    </div>

                    <div className="procurement-stats">
                        <div className="procurement-stat-item">
                            <span className="procurement-stat-value">{offers.length}</span>
                            <span className="procurement-stat-label">
                                 {activeTab === 'unstarted' ? 'Unstarted Offers' :
                                     activeTab === 'inprogress' ? 'In Progress Offers' :
                                         activeTab === 'submitted' ? 'Submitted Offers' :
                                             activeTab === 'validated' ? 'Validated Offers' :
                                                 activeTab === 'finance' ? 'Finance Validated Offers' :
                                                     activeTab === 'finalize' ? 'Finalize Offers' :
                                                         'Completed Offers'}
                            </span>
                        </div>
                        <div className="procurement-stat-item">
                            <span className="procurement-stat-value">
                                ${offers.reduce((total, offer) => total + getTotalPrice(offer), 0).toFixed(2)}
                            </span>
                            <span className="procurement-stat-label">Total Value</span>
                        </div>
                    </div>
                </div>

                <div className="procurement-intro-right">
                    <button
                        className="procurement-back-button"
                        onClick={() => navigate('/procurement/request-orders')}
                    >
                        <FiChevronRight className="icon-rotate-180" /> Back to Request Orders
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="procurement-tabs">
                <button
                    className={`procurement-tab ${activeTab === 'unstarted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('unstarted')}
                >
                    <FiInbox /> Unstarted
                </button>
                <button
                    className={`procurement-tab ${activeTab === 'inprogress' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inprogress')}
                >
                    <FiEdit /> In Progress
                </button>
                <button
                    className={`procurement-tab ${activeTab === 'submitted' ? 'active' : ''}`}
                    onClick={() => setActiveTab('submitted')}
                >
                    <FiSend /> Submitted
                </button>

                <button
                    className={`procurement-tab ${activeTab === 'validated' ? 'active' : ''}`}
                    onClick={() => setActiveTab('validated')}
                >
                    <FiCheck /> Manager Validated
                </button>

                <button
                    className={`procurement-tab ${activeTab === 'finance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('finance')}
                >
                    <FiDollarSign /> Finance Validated
                </button>

                <button
                    className={`procurement-tab ${activeTab === 'finalize' ? 'active' : ''}`}
                    onClick={() => setActiveTab('finalize')}
                >
                    <FiCheckCircle /> Finalize
                </button>

                {/* Add the Completed Offers tab */}
                <button
                    className={`procurement-tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    <FiCheckCircle /> Completed
                </button>
            </div>

            {/* Search and Description */}
            <div className="procurement-section-description">
                {getTabDescription()}

                <div className="procurement-search-container">
                    <input
                        type="text"
                        placeholder="Search offers..."
                        className="procurement-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="procurement-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
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
                            setOffers={setOffers}  // ← ADD THIS LINE
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
                            onRetryOffer={handleRetryOffer} // Pass the callback
                        />
                    )}

                    {activeTab === 'finance' && (
                        <FinanceValidatedOffers
                            offers={filteredOffers}
                            activeOffer={activeOffer}
                            setActiveOffer={setActiveOffer}
                            getTotalPrice={getTotalPrice}
                            fetchWithAuth={fetchWithAuth}
                            API_URL={API_URL}
                        />
                    )}

                    {activeTab === 'finalize' && (
                        <FinalizeOffers
                            offers={filteredOffers}
                            activeOffer={activeOffer}
                            setActiveOffer={setActiveOffer}
                            getTotalPrice={getTotalPrice}
                            fetchWithAuth={fetchWithAuth}
                            API_URL={API_URL}
                            setError={setError}              // ADD THIS
                            setSuccess={setSuccess}          // ADD THIS
                            onOfferFinalized={handleOfferFinalized}  // ADD THIS
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
    );
};

export default ProcurementOffers;