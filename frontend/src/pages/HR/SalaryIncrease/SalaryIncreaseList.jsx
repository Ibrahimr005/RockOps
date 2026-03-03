import React, { useState, useEffect, useCallback } from 'react';
import {
    FaCheck, FaTimes, FaSpinner, FaPlus, FaDollarSign,
    FaClock, FaCheckCircle, FaTimesCircle, FaChartLine
} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable/DataTable';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import CreateSalaryIncreaseModal from './components/CreateSalaryIncreaseModal';
import ReviewSalaryIncreaseModal from './components/ReviewSalaryIncreaseModal';
import {
    salaryIncreaseService,
    SALARY_INCREASE_STATUS_CONFIG,
    REQUEST_TYPE_CONFIG
} from '../../../services/hr/salaryIncreaseService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { ADMIN, HR_MANAGER, HR_EMPLOYEE, FINANCE_MANAGER } from '../../../utils/roles.js';
import './SalaryIncreaseList.scss';

const SalaryIncreaseList = () => {
    const { showSuccess, showError } = useSnackbar();
    const { currentUser } = useAuth();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [reviewModal, setReviewModal] = useState({ isVisible: false, request: null, role: null });

    const userRole = currentUser?.role;
    const isHR = [ADMIN, HR_MANAGER].includes(userRole);
    const isFinance = [ADMIN, FINANCE_MANAGER].includes(userRole);
    const canCreate = [ADMIN, HR_MANAGER, HR_EMPLOYEE].includes(userRole);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [requestsRes, statsRes] = await Promise.all([
                salaryIncreaseService.getAll(),
                salaryIncreaseService.getStatistics()
            ]);
            setRequests(requestsRes.data || []);
            setStatistics(statsRes.data || {});
        } catch (error) {
            showError('Failed to load salary increase requests');
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
        const config = SALARY_INCREASE_STATUS_CONFIG[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
        return (
            <span
                className="salary-increase-status-badge"
                style={{ backgroundColor: config.bgColor, color: config.color, border: `1px solid ${config.color}20` }}
            >
                {config.label}
            </span>
        );
    };

    const renderTypeBadge = (type) => {
        const config = REQUEST_TYPE_CONFIG[type] || { label: type, color: '#6b7280', bgColor: '#f3f4f6' };
        return (
            <span
                className="salary-increase-type-badge"
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
            if (reviewModal.role === 'HR') {
                await salaryIncreaseService.hrDecision(requestId, approved, comments, rejectionReason);
            } else {
                await salaryIncreaseService.financeDecision(requestId, approved, comments, rejectionReason);
            }
            showSuccess(approved
                ? `Request ${reviewModal.role === 'HR' ? 'approved — forwarded to Finance' : 'approved and applied'}`
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
                <div className="salary-increase-employee-cell">
                    <span className="salary-increase-employee-name">{row.employeeName}</span>
                    <span className="salary-increase-employee-number">{row.employeeNumber}</span>
                </div>
            )
        },
        {
            accessor: 'requestType',
            header: 'Type',
            sortable: true,
            render: (row) => renderTypeBadge(row.requestType)
        },
        {
            accessor: 'currentSalary',
            header: 'Current Salary',
            sortable: true,
            render: (row) => formatCurrency(row.currentSalary)
        },
        {
            accessor: 'requestedSalary',
            header: 'Requested Salary',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>
                    {formatCurrency(row.requestedSalary)}
                </span>
            )
        },
        {
            accessor: 'increasePercentage',
            header: 'Increase %',
            sortable: true,
            render: (row) => (
                <span className="salary-increase-percentage">
                    +{(row.increasePercentage || 0).toFixed(2)}%
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
                { value: 'PENDING_HR', label: 'Pending HR' },
                { value: 'PENDING_FINANCE', label: 'Pending Finance' },
                { value: 'APPROVED', label: 'Approved' },
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
            label: 'HR Review',
            icon: <FaCheck />,
            onClick: (row) => handleReview(row, 'HR'),
            show: (row) => isHR && row.status === 'PENDING_HR',
            className: 'approve'
        },
        {
            label: 'Finance Review',
            icon: <FaCheck />,
            onClick: (row) => handleReview(row, 'FINANCE'),
            show: (row) => isFinance && row.status === 'PENDING_FINANCE',
            className: 'approve'
        }
    ];

    const statsCards = [
        { label: 'Total Requests', value: statistics.total || 0, icon: <FaChartLine />, variant: 'primary' },
        { label: 'Pending HR', value: statistics.pendingHR || 0, icon: <FaClock />, variant: 'warning' },
        { label: 'Pending Finance', value: statistics.pendingFinance || 0, icon: <FaClock />, variant: 'info' },
        { label: 'Applied', value: statistics.applied || 0, icon: <FaCheckCircle />, variant: 'success' },
        { label: 'Rejected', value: statistics.rejected || 0, icon: <FaTimesCircle />, variant: 'danger' }
    ];

    return (
        <div className="salary-increase-list-page">
            <PageHeader
                title="Salary Increase Requests"
                subtitle="Manage employee and position-level salary increase requests"
            />

            <StatisticsCards cards={statsCards} />

            <DataTable
                data={requests}
                columns={columns}
                loading={loading}
                emptyMessage="No salary increase requests found"
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
                <CreateSalaryIncreaseModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadData();
                    }}
                />
            )}

            {reviewModal.isVisible && reviewModal.request && (
                <ReviewSalaryIncreaseModal
                    request={reviewModal.request}
                    role={reviewModal.role}
                    onClose={handleReviewClose}
                    onSubmit={handleReviewSubmit}
                />
            )}
        </div>
    );
};

export default SalaryIncreaseList;
