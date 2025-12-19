import React, { useState, useEffect } from 'react';
import { FiEye, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import OfferReviewForm from './OfferReviewForm';
import './OfferReviews.scss';

const OfferReviewsList = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [activeFilter, setActiveFilter] = useState('pending'); // 'pending', 'all', 'approved', 'rejected'
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchOffers();
    }, [activeFilter]);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            let response;

            if (activeFilter === 'pending') {
                response = await financeService.accountsPayable.offerReviews.getPending();
            } else if (activeFilter === 'all') {
                response = await financeService.accountsPayable.offerReviews.getAll();
            } else {
                response = await financeService.accountsPayable.offerReviews.getByStatus(activeFilter.toUpperCase());
            }

            setOffers(response.data || []);
        } catch (err) {
            console.error('Error fetching offers:', err);
            showError('Failed to load offers');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (offer) => {
        setSelectedOffer(offer);
        setShowReviewForm(true);
    };

    const handleReviewSubmit = () => {
        setShowReviewForm(false);
        setSelectedOffer(null);
        fetchOffers();
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const columns = [
        {
            header: 'Offer Number',
            accessor: 'offerNumber',
            sortable: true
        },
        {
            header: 'Total Amount',
            accessor: 'totalAmount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                    {formatCurrency(row.totalAmount)}
                </span>
            )
        },
        {
            header: 'Currency',
            accessor: 'currency',
            sortable: true
        },
        {
            header: 'Department',
            accessor: 'department',
            sortable: true
        },
        {
            header: 'Created At',
            accessor: 'createdAt',
            sortable: true,
            render: (row) => formatDate(row.createdAt)
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => {
                if (!row.status) {
                    return <span className="status-badge status-pending">Pending Review</span>;
                }
                return (
                    <span className={`status-badge status-${row.status.toLowerCase()}`}>
                        {row.status}
                    </span>
                );
            }
        }
    ];

    const actions = [
        {
            label: 'Review',
            icon: <FiEye />,
            onClick: handleReview,
            className: 'rockops-table__action-button primary',
            show: (row) => !row.status // Only show for pending offers
        }
    ];

    const filterableColumns = [
        {
            header: 'Currency',
            accessor: 'currency',
            filterType: 'select'
        },
        {
            header: 'Department',
            accessor: 'department',
            filterType: 'select'
        }
    ];

    return (
        <div className="offer-reviews-list">
            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('pending')}
                >
                    <FiCheckCircle />
                    <span>Pending Review</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    <FiEye />
                    <span>All Reviews</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('approved')}
                >
                    <FiCheckCircle />
                    <span>Approved</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('rejected')}
                >
                    <FiXCircle />
                    <span>Rejected</span>
                </button>
            </div>

            <DataTable
                data={offers}
                columns={columns}
                loading={loading}
                actions={actions}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyMessage={
                    activeFilter === 'pending'
                        ? 'No offers pending review'
                        : `No ${activeFilter} offers found`
                }
                defaultSortField="createdAt"
                defaultSortDirection="desc"
            />

            {showReviewForm && selectedOffer && (
                <OfferReviewForm
                    offer={selectedOffer}
                    onClose={() => {
                        setShowReviewForm(false);
                        setSelectedOffer(null);
                    }}
                    onSubmit={handleReviewSubmit}
                />
            )}
        </div>
    );
};

export default OfferReviewsList;