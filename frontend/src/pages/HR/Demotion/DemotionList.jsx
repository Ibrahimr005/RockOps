import React, { useState, useEffect, useCallback } from 'react';
import {
    FaCheck, FaTimes, FaSpinner, FaPlus, FaArrowDown,
    FaClock, FaCheckCircle, FaTimesCircle, FaChartLine
} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable/DataTable';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import CreateDemotionModal from './components/CreateDemotionModal';
import ReviewDemotionModal from './components/ReviewDemotionModal';
import {
    demotionService,
    DEMOTION_STATUS_CONFIG
} from '../../../services/hr/demotionService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { ADMIN, HR_MANAGER, HR_EMPLOYEE } from '../../../utils/roles.js';
import './DemotionList.scss';

const DemotionList = () => {
    const { showSuccess, showError } = useSnackbar();
    const { currentUser } = useAuth();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [reviewModal, setReviewModal] = useState({ isVisible: false, request: null, role: null });

    const userRole = currentUser?.role;
    const isHR = [ADMIN, HR_MANAGER].includes(userRole);
    const canCreate = [ADMIN, HR_MANAGER, HR_EMPLOYEE].includes(userRole);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [requestsRes, statsRes] = await Promise.all([
                demotionService.getAll(),
                demotionService.getStatistics()
            ]);
            setRequests(requestsRes.data || []);
            setStatistics(statsRes.data || {});
        } catch (error) {
            showError('Failed to load demotion requests');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => { loadData(); }, [loadData]);

    const formatCurrency = (amount) => {
        if (amount == null) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'EGP', minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const renderStatusBadge = (status) => {
        const config = DEMOTION_STATUS_CONFIG[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
        return (
            <span
                className="demotion-status-badge"
                style={{ backgroundColor: config.bgColor, color: config.color, border: `1px solid ${config.color}20` }}
            >
                {config.label}
            </span>
        );
    };

    const handleReview = (request, role) => {
        setReviewModal({ isVisible: true, request, role });
    };

    const handleReviewClose = () => {
        setReviewModal({ isVisible: false, request: null, role: null });
    };

    const handleReviewSubmit = async (requestId, approved, comments, rejectionReason) => {
        try {
            if (reviewModal.role === 'DEPT_HEAD') {
                await demotionService.deptHeadDecision(requestId, approved, comments, rejectionReason);
            } else {
                await demotionService.hrDecision(requestId, approved, comments, rejectionReason);
            }
            showSuccess(approved
                ? (reviewModal.role === 'DEPT_HEAD'
                    ? 'Request approved — forwarded to HR'
                    : 'Demotion approved and applied')
                : 'Request rejected'
            );
            handleReviewClose();
            loadData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to process decision');
        }
    };

    const columns = [
        {
            accessor: 'requestNumber',
            header: 'Request #',
            sortable: true,
            filterable: true,
            filterType: 'text'
        },
        {
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row) => (
                <div className="demotion-employee-cell">
                    <span className="demotion-employee-name">{row.employeeName}</span>
                    <span className="demotion-employee-number">{row.employeeNumber}</span>
                </div>
            )
        },
        {
            accessor: 'currentPositionName',
            header: 'Current Position',
            sortable: true,
            filterable: true,
            filterType: 'text'
        },
        {
            accessor: 'newPositionName',
            header: 'New Position',
            sortable: true,
            render: (row) => (
                <span className="demotion-new-position">
                    <FaArrowDown className="demotion-arrow-icon" /> {row.newPositionName}
                </span>
            )
        },
        {
            accessor: 'currentSalary',
            header: 'Current Salary',
            sortable: true,
            render: (row) => formatCurrency(row.currentSalary)
        },
        {
            accessor: 'newSalary',
            header: 'New Salary',
            sortable: true,
            render: (row) => (
                <span className="demotion-new-salary">
                    {formatCurrency(row.newSalary)}
                </span>
            )
        },
        {
            accessor: 'salaryReductionPercentage',
            header: 'Reduction %',
            sortable: true,
            render: (row) => (
                <span className="demotion-reduction-percentage">
                    -{(row.salaryReductionPercentage || 0).toFixed(2)}%
                </span>
            )
        },
        {
            accessor: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            filterOptions: [
                { value: 'PENDING', label: 'Pending' },
                { value: 'DEPT_HEAD_APPROVED', label: 'Dept Head Approved' },
                { value: 'HR_APPROVED', label: 'HR Approved' },
                { value: 'APPLIED', label: 'Applied' },
                { value: 'REJECTED', label: 'Rejected' }
            ],
            render: (row) => renderStatusBadge(row.status)
        },
        {
            accessor: 'createdAt',
            header: 'Requested',
            sortable: true,
            render: (row) => formatDate(row.createdAt)
        }
    ];

    const actions = [
        {
            label: 'Dept Head Review',
            icon: <FaCheck />,
            onClick: (row) => handleReview(row, 'DEPT_HEAD'),
            show: (row) => isHR && row.status === 'PENDING',
            className: 'approve'
        },
        {
            label: 'HR Review',
            icon: <FaCheck />,
            onClick: (row) => handleReview(row, 'HR'),
            show: (row) => isHR && row.status === 'DEPT_HEAD_APPROVED',
            className: 'approve'
        }
    ];

    const statsCards = [
        { label: 'Total Requests', value: statistics.total || 0, icon: <FaChartLine />, variant: 'primary' },
        { label: 'Pending', value: statistics.pending || 0, icon: <FaClock />, variant: 'warning' },
        { label: 'Dept Head Approved', value: statistics.deptHeadApproved || 0, icon: <FaClock />, variant: 'info' },
        { label: 'Applied', value: statistics.applied || 0, icon: <FaCheckCircle />, variant: 'success' },
        { label: 'Rejected', value: statistics.rejected || 0, icon: <FaTimesCircle />, variant: 'danger' }
    ];

    return (
        <div className="demotion-list-page">
            <PageHeader
                title="Demotion Requests"
                subtitle="Manage employee demotion and position downgrade requests"
            />

            <StatisticsCards cards={statsCards} />

            <DataTable
                data={requests}
                columns={columns}
                loading={loading}
                emptyMessage="No demotion requests found"
                actions={actions}
                actionsColumnWidth="150px"
                showSearch={true}
                showFilters={true}
                defaultSortField="createdAt"
                defaultSortDirection="desc"
                defaultItemsPerPage={10}
                showAddButton={canCreate}
                addButtonText="New Request"
                addButtonIcon={<FaPlus />}
                onAddClick={() => setShowCreateModal(true)}
            />

            {showCreateModal && (
                <CreateDemotionModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadData();
                    }}
                />
            )}

            {reviewModal.isVisible && reviewModal.request && (
                <ReviewDemotionModal
                    request={reviewModal.request}
                    role={reviewModal.role}
                    onClose={handleReviewClose}
                    onSubmit={handleReviewSubmit}
                />
            )}
        </div>
    );
};

export default DemotionList;
