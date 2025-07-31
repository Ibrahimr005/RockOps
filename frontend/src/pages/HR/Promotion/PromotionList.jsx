// src/pages/HR/Promotion/PromotionList.jsx - Enhanced with RBAC and Error Handling
import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Clock, CheckCircle, XCircle, FileText, BarChart3, Users, AlertTriangle, Download, Settings, RefreshCw } from 'lucide-react';
import DataTable from '../../../components/common/DataTable/DataTable';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import promotionService from '../../../services/hr/promotionService';
import AddPromotionForm from './components/AddPromotionForm';
import ReviewPromotionModal from './components/ReviewPromotionModal';
import PromotionDetailsModal from './components/PromotionDetailsModal';
import {
    usePromotionPermissions,
    canPerformPromotionAction,
    getAllowedPromotionActions,
    hasPromotionViewAccess
} from '../../../utils/rbac.js';
import { createPromotionErrorHandler } from '../../../utils/hr/promotionErrorHandler';
import './PromotionList.scss';

const PromotionList = () => {
    const { showSuccess, showError, showWarning } = useSnackbar();
    const { currentUser, isAuthenticated } = useAuth();

    // Get user permissions using RBAC
    const permissions = usePromotionPermissions({ currentUser, isAuthenticated });

    // Create specialized error handler for promotions
    const errorHandler = createPromotionErrorHandler(showError, showWarning);

    // State management
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(''); // For debugging
    const [statistics, setStatistics] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        implemented: 0,
        rejected: 0
    });

    // Modal states
    const [showAddForm, setShowAddForm] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    // RBAC: Early return if user doesn't have view access
    if (!hasPromotionViewAccess(currentUser)) {
        return (
            <div className="promotion-list-container">
                <div className="unauthorized-access">
                    <AlertTriangle size={48} className="text-warning" />
                    <h3>Access Denied</h3>
                    <p>You don't have permission to view promotion requests.</p>
                    <p>Contact your HR administrator for access.</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        if (permissions.canView) {
            fetchPromotions();

            // Only fetch statistics if user has permission
            if (permissions.canViewStatistics) {
                fetchStatistics();
            }
        }
    }, [permissions.canView, permissions.canViewStatistics]);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('=== Starting fetchPromotions ===');

            // Test if the service exists
            if (!promotionService) {
                throw new Error('Promotion service is not available');
            }

            console.log('Promotion service available, calling getAllPromotionRequests...');

            const response = await promotionService.getAllPromotionRequests();

            console.log('Raw API Response:', response);
            console.log('Response type:', typeof response);
            console.log('Response keys:', response ? Object.keys(response) : 'null');

            // Handle different possible response structures
            let promotionsData = [];
            let debugMessage = '';

            if (response) {
                if (response.data) {
                    console.log('Response.data:', response.data);
                    console.log('Response.data type:', typeof response.data);

                    if (response.data.success && response.data.data) {
                        // Spring Boot wrapped response: { success: true, data: [...] }
                        promotionsData = response.data.data;
                        debugMessage = `Found data in response.data.data (${promotionsData.length} items)`;
                    } else if (Array.isArray(response.data)) {
                        // Direct array response: { data: [...] }
                        promotionsData = response.data;
                        debugMessage = `Found data in response.data array (${promotionsData.length} items)`;
                    } else if (response.data.data && Array.isArray(response.data.data)) {
                        // Nested data: { data: { data: [...] } }
                        promotionsData = response.data.data;
                        debugMessage = `Found data in response.data.data array (${promotionsData.length} items)`;
                    } else {
                        // Try to use response.data directly
                        promotionsData = response.data;
                        debugMessage = `Using response.data directly: ${typeof promotionsData}`;
                    }
                } else if (Array.isArray(response)) {
                    // Direct array response
                    promotionsData = response;
                    debugMessage = `Response is direct array (${promotionsData.length} items)`;
                } else {
                    debugMessage = `Unexpected response structure: ${JSON.stringify(response)}`;
                }
            } else {
                debugMessage = 'Response is null or undefined';
            }

            console.log('Debug message:', debugMessage);
            console.log('Final promotionsData:', promotionsData);
            console.log('promotionsData type:', typeof promotionsData);
            console.log('promotionsData isArray:', Array.isArray(promotionsData));

            // Ensure we have an array
            if (!Array.isArray(promotionsData)) {
                console.warn('promotionsData is not an array, converting to empty array');
                promotionsData = [];
            }

            // Log first item structure if available
            if (promotionsData.length > 0) {
                console.log('First promotion item:', promotionsData[0]);
                console.log('First promotion keys:', Object.keys(promotionsData[0]));
            }

            setPromotions(promotionsData);
            setDebugInfo(debugMessage);
            setError(null);

            console.log('=== fetchPromotions completed successfully ===');

        } catch (error) {
            console.error('=== Error in fetchPromotions ===');
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error response:', error.response);
            console.error('Error stack:', error.stack);

            // Use specialized error handler
            errorHandler.handleFetchError(error, 'promotion requests', 'Loading promotion list');

            setPromotions([]);
            setDebugInfo(`Error: ${error.message}`);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            console.log('=== Fetching statistics ===');

            const response = await promotionService.getPromotionStatistics();
            console.log('Statistics response:', response);

            let statsData = {
                total: 0,
                pending: 0,
                approved: 0,
                implemented: 0,
                rejected: 0
            };

            if (response && response.data) {
                if (response.data.success && response.data.data) {
                    statsData = response.data.data;
                } else {
                    statsData = response.data;
                }
            }

            console.log('Final statistics:', statsData);
            setStatistics(statsData);

        } catch (error) {
            console.error('Error fetching statistics:', error);
            // Use specialized error handler for statistics (non-critical)
            errorHandler.handleFetchError(error, 'promotion statistics', 'Loading dashboard stats');
        }
    };

    const handleAddPromotion = async (promotionData) => {
        // RBAC: Check if user can create promotions
        if (!permissions.canCreate) {
            showError('You do not have permission to create promotion requests.');
            return;
        }

        try {
            console.log('Creating promotion with data:', promotionData);

            const response = await promotionService.createPromotionRequest(promotionData);
            console.log('Create promotion response:', response);

            showSuccess('Promotion request created successfully');
            setShowAddForm(false);

            // Refresh data
            await fetchPromotions();
            if (permissions.canViewStatistics) {
                await fetchStatistics();
            }

        } catch (error) {
            // Use specialized error handler
            errorHandler.handleCreateError(error, 'Creating new promotion request');
        }
    };

    const handleReviewPromotion = async (promotionId, reviewData) => {
        // RBAC: Check if user can review promotions
        if (!permissions.canReview) {
            showError('You do not have permission to review promotion requests.');
            return;
        }

        try {
            console.log('Reviewing promotion:', { promotionId, reviewData });

            const response = await promotionService.reviewPromotionRequest(promotionId, reviewData);

            console.log('Review successful:', response);
            showSuccess(`Promotion request ${reviewData.action.toLowerCase()}d successfully`);

            setShowReviewModal(false);
            setSelectedPromotion(null);

            // Refresh data
            await fetchPromotions();
            if (permissions.canViewStatistics) {
                await fetchStatistics();
            }
        } catch (error) {
            // Use specialized error handler
            errorHandler.handleReviewError(error, `Reviewing promotion ${promotionId}`);
        }
    };

    const handleImplementPromotion = async (promotionId) => {
        // RBAC: Check if user can implement promotions
        if (!permissions.canImplement) {
            showError('You do not have permission to implement promotion requests.');
            return;
        }

        try {
            console.log('Implementing promotion:', promotionId);

            const response = await promotionService.implementPromotionRequest(promotionId);

            console.log('Implementation successful:', response);
            showSuccess('Promotion implemented successfully');

            // Refresh data
            await fetchPromotions();
            if (permissions.canViewStatistics) {
                await fetchStatistics();
            }
        } catch (error) {
            // Use specialized error handler
            errorHandler.handleImplementError(error, `Implementing promotion ${promotionId}`);
        }
    };

    const handleCancelPromotion = async (promotionId, reason) => {
        // RBAC: Check if user can cancel promotions
        if (!permissions.canCancel) {
            showError('You do not have permission to cancel promotion requests.');
            return;
        }

        try {
            console.log('Cancelling promotion:', { promotionId, reason });

            const response = await promotionService.cancelPromotionRequest(promotionId, reason);

            console.log('Cancellation successful:', response);
            showSuccess('Promotion request cancelled successfully');

            // Refresh data
            await fetchPromotions();
            if (permissions.canViewStatistics) {
                await fetchStatistics();
            }
        } catch (error) {
            // Use specialized error handler
            errorHandler.handleCancelError(error, `Cancelling promotion ${promotionId}`);
        }
    };

    const handleExportData = async () => {
        // RBAC: Check if user can export data
        if (!permissions.canExport) {
            showError('You do not have permission to export promotion data.');
            return;
        }

        try {
            console.log('Exporting promotion data...');

            const exportOptions = {
                format: 'csv',
                status: statusFilter || null,
                // Add other filters as needed
            };

            const response = await promotionService.exportPromotionData(exportOptions);

            // Handle file download
            if (response.data) {
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `promotion-requests-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                showSuccess('Promotion data exported successfully');
            }
        } catch (error) {
            // Use specialized error handler
            errorHandler.handleGenericError(error, 'export', 'Exporting promotion data');
        }
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            'DRAFT': 'status-badge status-draft',
            'PENDING': 'status-badge pending',
            'UNDER_REVIEW': 'status-badge under-review',
            'APPROVED': 'status-badge approved',
            'REJECTED': 'status-badge rejected',
            'IMPLEMENTED': 'status-badge completed',
            'CANCELLED': 'status-badge cancelled'
        };

        return (
            <span className={statusClasses[status] || 'status-badge'}>
                {status?.replace('_', ' ')}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const priorityClasses = {
            'LOW': 'status-badge low',
            'NORMAL': 'status-badge medium',
            'HIGH': 'status-badge high',
            'URGENT': 'status-badge urgent'
        };

        return (
            <span className={priorityClasses[priority] || 'status-badge medium'}>
                {priority}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Define actions for DataTable with RBAC
    const actions = [
        {
            label: 'View',
            icon: <FileText size={14} />,
            onClick: (row) => {
                setSelectedPromotion(row);
                setShowDetailsModal(true);
            },
            className: 'primary',
            show: () => permissions.canView
        },
        {
            label: 'Review',
            icon: <CheckCircle size={14} />,
            onClick: (row) => {
                if (canPerformPromotionAction(currentUser, 'review', row.status)) {
                    setSelectedPromotion(row);
                    setShowReviewModal(true);
                } else {
                    showWarning('This promotion cannot be reviewed in its current status.');
                }
            },
            className: 'primary',
            show: (row) => permissions.canReview && canPerformPromotionAction(currentUser, 'review', row.status)
        },
        {
            label: 'Implement',
            icon: <TrendingUp size={14} />,
            onClick: (row) => {
                if (canPerformPromotionAction(currentUser, 'implement', row.status)) {
                    handleImplementPromotion(row.id);
                } else {
                    showWarning('This promotion cannot be implemented in its current status.');
                }
            },
            className: 'secondary',
            show: (row) => permissions.canImplement && canPerformPromotionAction(currentUser, 'implement', row.status)
        },
        {
            label: 'Cancel',
            icon: <XCircle size={14} />,
            onClick: (row) => {
                if (canPerformPromotionAction(currentUser, 'cancel', row.status)) {
                    const reason = window.prompt('Please provide a reason for cancellation:');
                    if (reason) {
                        handleCancelPromotion(row.id, reason);
                    }
                } else {
                    showWarning('This promotion cannot be cancelled in its current status.');
                }
            },
            className: 'secondary',
            show: (row) => permissions.canCancel && canPerformPromotionAction(currentUser, 'cancel', row.status)
        }
    ];

    const columns = [
        {
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            render: (row) => (
                <div className="promotion-employee-cell">
                    <div className="employee-name">{row.employeeName || row.employee?.fullName || 'N/A'}</div>
                    <div className="employee-id text-muted">ID: {row.employeeId || row.employee?.id || 'N/A'}</div>
                </div>
            )
        },
        {
            header: 'Current Position',
            accessor: 'currentPositionName',
            sortable: true,
            render: (row) => (
                <div className="position-cell">
                    <div className="position-name">{row.currentPositionName || row.currentJobPosition?.positionName || 'N/A'}</div>
                    <div className="department-name text-muted">{row.currentDepartmentName || row.currentJobPosition?.department || ''}</div>
                </div>
            )
        },
        {
            header: 'Proposed Position',
            accessor: 'proposedPositionName',
            sortable: true,
            render: (row) => (
                <div className="position-cell">
                    <div className="position-name text-success">{row.promotedToPositionName || row.promotedToJobPosition?.positionName || 'N/A'}</div>
                    <div className="department-name text-muted">{row.promotedToDepartmentName || row.promotedToJobPosition?.department || ''}</div>
                </div>
            )
        },
        {
            header: 'Salary Change',
            accessor: 'salaryChange',
            sortable: true,
            render: (row) => {
                const currentSalary = parseFloat(row.currentSalary) || 0;
                const proposedSalary = parseFloat(row.proposedSalary) || 0;

                if (currentSalary === 0 || proposedSalary === 0) {
                    return <div className="salary-change-cell">N/A</div>;
                }

                const increase = proposedSalary - currentSalary;
                const percentage = ((increase / currentSalary) * 100).toFixed(1);

                return (
                    <div className="salary-change-cell">
                        <div className="salary-increase text-success">
                            +{formatCurrency(increase)}
                        </div>
                        <div className="salary-percentage text-muted">+{percentage}%</div>
                    </div>
                );
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => getStatusBadge(row.status)
        },
        {
            header: 'Priority',
            accessor: 'priority',
            sortable: true,
            render: (row) => getPriorityBadge(row.priority)
        },
        {
            header: 'Request Date',
            accessor: 'requestDate',
            sortable: true,
            render: (row) => formatDate(row.requestDate || row.createdAt)
        },
        {
            header: 'Effective Date',
            accessor: 'proposedEffectiveDate',
            sortable: true,
            render: (row) => formatDate(row.proposedEffectiveDate || row.actualEffectiveDate)
        }
    ];

    // Conditionally show statistics based on permissions
    const introStats = permissions.canViewStatistics ? [
        { label: 'Total Requests', value: statistics.total || statistics.totalRequests || 0 },
        { label: 'Pending Review', value: statistics.pending || statistics.pendingRequests || 0 },
        { label: 'Approved', value: statistics.approved || statistics.approvedRequests || 0 },
        { label: 'Implemented', value: statistics.implemented || statistics.implementedRequests || 0 }
    ] : [
        { label: 'Total Visible', value: promotions.length },
        { label: 'Access Level', value: permissions.isHRManager ? 'Manager' : 'Employee' }
    ];

    // Define filterable columns for DataTable
    const filterableColumns = [
        { header: 'Employee Name', accessor: 'employeeName' },
        { header: 'Current Position', accessor: 'currentPositionName' },
        { header: 'Proposed Position', accessor: 'proposedPositionName' },
        { header: 'Current Department', accessor: 'currentDepartment' },
        { header: 'Proposed Department', accessor: 'proposedDepartment' }
    ];

    // Custom filters for status and priority
    const customFilters = [
        {
            label: 'Status',
            component: (
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-control"
                >
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="IMPLEMENTED">Implemented</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            )
        },
        {
            label: 'Priority',
            component: (
                <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="form-control"
                >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                </select>
            )
        }
    ];

    // Filter data based on custom filters
    const filteredPromotions = promotions.filter(promotion => {
        const statusMatch = !statusFilter || promotion.status === statusFilter;
        const priorityMatch = !priorityFilter || promotion.priority === priorityFilter;
        return statusMatch && priorityMatch;
    });

    // Role-based UI customization
    const getPageTitle = () => {
        if (permissions.isAdmin) return "Employee Promotions (Admin)";
        if (permissions.isHRManager) return "Employee Promotions (Manager)";
        return "Employee Promotions";
    };

    const getPageDescription = () => {
        if (permissions.isHRManager) {
            return "Manage and review employee promotion requests";
        }
        return "View employee promotion requests";
    };

    return (
        <div className="promotion-list-container">
            {/* Header with IntroCard */}
            <IntroCard
                icon={<TrendingUp size={48} />}
                label="Human Resources"
                title={getPageTitle()}
                description={getPageDescription()}
                stats={introStats}
            />

            {!permissions.isHRManager && !permissions.isAdmin && permissions.canView && (
                <div className="alert alert-info" style={{ margin: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={20} />
                        <div>
                            <strong>HR Employee Access</strong>
                            <p style={{ margin: 0, fontSize: '14px' }}>
                                You can create and view promotion requests. Contact HR Management to review or implement promotions.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={Array.isArray(filteredPromotions) ? filteredPromotions : []}
                columns={columns}
                loading={loading}
                error={error}
                onRetry={fetchPromotions}
                actions={actions}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                customFilters={customFilters}
                searchPlaceholder="Search by employee name, position..."
                showExportButton={permissions.canExport}
                exportFileName="promotion-requests"
                onExportClick={handleExportData}
                showAddButton={permissions.canCreate}
                addButtonText="New Promotion Request"
                addButtonIcon={<Plus size={18} />}
                onAddClick={() => setShowAddForm(true)}
                emptyMessage="No promotion requests found"
                emptyDescription={
                    permissions.canCreate
                        ? "Create a new promotion request to get started"
                        : "No promotion requests are currently available"
                }
                // Additional toolbar buttons for managers
                customToolbarButtons={permissions.isHRManager ? [
                    {
                        label: 'Refresh',
                        icon: <RefreshCw size={18} />,
                        onClick: async () => {
                            setLoading(true);
                            try {
                                await fetchPromotions();
                                if (permissions.canViewStatistics) {
                                    await fetchStatistics();
                                }
                                showSuccess('Data refreshed successfully');
                            } catch (error) {
                                errorHandler.handleFetchError(error, 'promotion data', 'Refreshing data');
                            } finally {
                                setLoading(false);
                            }
                        },
                        className: 'btn-outline-info'
                    },
                    {
                        label: 'Analytics',
                        icon: <BarChart3 size={18} />,
                        onClick: () => showWarning('Analytics feature coming soon'),
                        className: 'btn-outline-primary',
                        show: permissions.canViewAnalytics
                    },
                    {
                        label: 'Bulk Actions',
                        icon: <Settings size={18} />,
                        onClick: () => showWarning('Bulk actions feature coming soon'),
                        className: 'btn-outline-secondary',
                        show: permissions.canPerformBulkActions
                    }
                ] : [
                    {
                        label: 'Refresh',
                        icon: <RefreshCw size={18} />,
                        onClick: async () => {
                            setLoading(true);
                            try {
                                await fetchPromotions();
                                showSuccess('Data refreshed successfully');
                            } catch (error) {
                                errorHandler.handleFetchError(error, 'promotion data', 'Refreshing data');
                            } finally {
                                setLoading(false);
                            }
                        },
                        className: 'btn-outline-info'
                    }
                ]}
            />

            {/* Modals - Only render if user has appropriate permissions */}
            {permissions.canCreate && (
                <AddPromotionForm
                    isOpen={showAddForm}
                    onClose={() => setShowAddForm(false)}
                    onSubmit={handleAddPromotion}
                />
            )}

            {permissions.canReview && showReviewModal && (
                <ReviewPromotionModal
                    isOpen={showReviewModal}
                    onClose={() => {
                        setShowReviewModal(false);
                        setSelectedPromotion(null);
                    }}
                    promotion={selectedPromotion}
                    onSubmit={handleReviewPromotion}
                />
            )}

            {showDetailsModal && (
                <PromotionDetailsModal
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedPromotion(null);
                    }}
                    promotion={selectedPromotion}
                    userPermissions={permissions}
                    onActionClick={(action, promotion) => {
                        // Handle actions from details modal
                        switch (action) {
                            case 'review':
                                if (permissions.canReview) {
                                    setShowReviewModal(true);
                                }
                                break;
                            case 'implement':
                                if (permissions.canImplement) {
                                    handleImplementPromotion(promotion.id);
                                    setShowDetailsModal(false);
                                }
                                break;
                            case 'cancel':
                                if (permissions.canCancel) {
                                    const reason = window.prompt('Please provide a reason for cancellation:');
                                    if (reason) {
                                        handleCancelPromotion(promotion.id, reason);
                                        setShowDetailsModal(false);
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                    }}
                />
            )}


        </div>
    );
};

export default PromotionList;