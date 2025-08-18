import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiPlus, FiEye, FiCheck, FiX, FiClock, FiUser, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import DataTable from '../../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../../contexts/SnackbarContext';

const PositionPromotions = ({ position, positionId, onRefresh }) => {
    const { showSuccess, showError } = useSnackbar();
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });

    useEffect(() => {
        fetchPromotions();
    }, [positionId]);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            // Mock data for now - this would be replaced with actual API call
            const mockPromotions = [
                {
                    id: 1,
                    employeeName: 'John Doe',
                    employeeId: 'EMP001',
                    fromPosition: 'Junior Developer',
                    toPosition: position.positionName,
                    promotionDate: '2024-01-15',
                    effectiveDate: '2024-02-01',
                    approvedBy: 'Jane Smith',
                    status: 'APPROVED',
                    salaryIncrease: 15000,
                    reason: 'Excellent performance and leadership skills'
                },
                {
                    id: 2,
                    employeeName: 'Alice Johnson',
                    employeeId: 'EMP002',
                    fromPosition: 'Intern',
                    toPosition: position.positionName,
                    promotionDate: '2024-02-20',
                    effectiveDate: '2024-03-01',
                    approvedBy: null,
                    status: 'PENDING',
                    salaryIncrease: 25000,
                    reason: 'Completed internship successfully'
                }
            ];

            setPromotions(mockPromotions);

            // Calculate stats
            const total = mockPromotions.length;
            const pending = mockPromotions.filter(p => p.status === 'PENDING').length;
            const approved = mockPromotions.filter(p => p.status === 'APPROVED').length;
            const rejected = mockPromotions.filter(p => p.status === 'REJECTED').length;

            setStats({ total, pending, approved, rejected });
        } catch (err) {
            console.error('Error fetching promotions:', err);
            setPromotions([]);
            setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleViewPromotion = (promotion) => {
        console.log('View promotion:', promotion);
    };

    const handleApprovePromotion = (promotion) => {
        console.log('Approve promotion:', promotion);
        showSuccess(`Promotion for ${promotion.employeeName} approved successfully!`);
    };

    const handleRejectPromotion = (promotion) => {
        console.log('Reject promotion:', promotion);
        showSuccess(`Promotion for ${promotion.employeeName} rejected.`);
    };

    const formatSalaryIncrease = (amount) => {
        if (!amount) return 'N/A';
        return `+$${Number(amount).toLocaleString()}`;
    };

    // Promotion columns for DataTable
    const columns = [
        {
            header: 'Promotion ID',
            accessor: 'id',
            sortable: true,
            render: (row) => (
                <span className="promotion-id">#{row.id}</span>
            )
        },
        {
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            render: (row) => (
                <div className="employee-info">
                    <span className="name">{row.employeeName}</span>
                    <span className="employee-id">{row.employeeId}</span>
                </div>
            )
        },
        {
            header: 'Promotion Path',
            accessor: 'promotionPath',
            sortable: false,
            render: (row) => (
                <div className="promotion-path">
                    <div className="from-position">
                        <span className="label">From:</span>
                        <span className="position">{row.fromPosition}</span>
                    </div>
                    <div className="arrow">
                        <FiArrowUp />
                    </div>
                    <div className="to-position">
                        <span className="label">To:</span>
                        <span className="position">{row.toPosition}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Promotion Date',
            accessor: 'promotionDate',
            sortable: true,
            render: (row) => new Date(row.promotionDate).toLocaleDateString()
        },
        {
            header: 'Effective Date',
            accessor: 'effectiveDate',
            sortable: true,
            render: (row) => row.effectiveDate ? new Date(row.effectiveDate).toLocaleDateString() : 'N/A'
        },
        {
            header: 'Salary Increase',
            accessor: 'salaryIncrease',
            sortable: true,
            render: (row) => (
                <span className="salary-increase">
                    {formatSalaryIncrease(row.salaryIncrease)}
                </span>
            )
        },
        {
            header: 'Approved By',
            accessor: 'approvedBy',
            sortable: true,
            render: (row) => row.approvedBy || 'Pending'
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.status.toLowerCase()}`}>
                    {row.status}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: 'View',
            icon: <FiEye />,
            onClick: handleViewPromotion,
            className: 'primary',
        },
        {
            label: 'Approve',
            icon: <FiCheck />,
            onClick: handleApprovePromotion,
            className: 'success',
            condition: (row) => row.status === 'PENDING'
        },
        {
            label: 'Reject',
            icon: <FiX />,
            onClick: handleRejectPromotion,
            className: 'danger',
            condition: (row) => row.status === 'PENDING'
        }
    ];

    return (
        <div className="position-promotions">
            {/* Statistics Cards */}
            <div className="promotions-stats">
                <div className="stat-card">
                    <div className="stat-icon total">
                        <FiTrendingUp />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Promotions</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pending">
                        <FiClock />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.pending}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon approved">
                        <FiCheck />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.approved}</span>
                        <span className="stat-label">Approved</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon rejected">
                        <FiX />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.rejected}</span>
                        <span className="stat-label">Rejected</span>
                    </div>
                </div>
            </div>

            {/* Position Summary */}
            <div className="promotion-summary">
                <div className="summary-header">
                    <h4>Promotion Target Position</h4>
                </div>
                <div className="summary-content">
                    <div className="summary-item">
                        <label>Position</label>
                        <span>{position.positionName}</span>
                    </div>
                    <div className="summary-item">
                        <label>Department</label>
                        <span>{position.department || 'N/A'}</span>
                    </div>
                    <div className="summary-item">
                        <label>Experience Level</label>
                        <span>
                            {position.experienceLevel ?
                                position.experienceLevel.replace('_', ' ').toLowerCase()
                                    .replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'
                            }
                        </span>
                    </div>
                    <div className="summary-item">
                        <label>Base Salary</label>
                        <span>
                            {position.monthlyBaseSalary ?
                                `$${Number(position.monthlyBaseSalary).toLocaleString()}/month` :
                                'N/A'
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Promotions Data Table */}
            <div className="promotions-table-container">
                <div className="table-header">
                    <h3>
                        <FiTrendingUp /> Promotion History
                    </h3>
                    <div className="table-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={fetchPromotions}
                            disabled={loading}
                        >
                            Refresh
                        </button>
                        <button className="btn btn-primary">
                            <FiPlus /> Create Promotion Request
                        </button>
                    </div>
                </div>

                <DataTable
                    data={promotions}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    tableTitle="Promotions"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={['status', 'fromPosition']}
                    defaultSortField="promotionDate"
                    defaultSortDirection="desc"
                    emptyMessage={
                        <div className="position-empty-state">
                            <FiTrendingUp className="empty-icon" />
                            <h4>No Promotion History</h4>
                            <p>This position doesn't have any promotion records yet.</p>
                            <button className="btn btn-primary">
                                <FiPlus /> Create First Promotion Request
                            </button>
                        </div>
                    }
                />
            </div>

            {/* Promotion Analytics */}
            <div className="promotion-analytics">
                <div className="analytics-card">
                    <div className="card-header">
                        <h4>Promotion Trends</h4>
                    </div>
                    <div className="card-content">
                        <div className="trend-item">
                            <div className="trend-icon up">
                                <FiArrowUp />
                            </div>
                            <div className="trend-content">
                                <span className="trend-value">25%</span>
                                <span className="trend-label">Promotion Rate This Year</span>
                            </div>
                        </div>
                        <div className="trend-item">
                            <div className="trend-icon">
                                <FiUser />
                            </div>
                            <div className="trend-content">
                                <span className="trend-value">18 months</span>
                                <span className="trend-label">Average Time to Promotion</span>
                            </div>
                        </div>
                        <div className="trend-item">
                            <div className="trend-icon up">
                                <FiTrendingUp />
                            </div>
                            <div className="trend-content">
                                <span className="trend-value">$22,500</span>
                                <span className="trend-label">Average Salary Increase</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="card-header">
                        <h4>Quick Actions</h4>
                    </div>
                    <div className="card-content">
                        <div className="action-buttons">
                            <button className="action-btn">
                                <FiPlus />
                                <span>New Promotion Request</span>
                            </button>
                            <button className="action-btn">
                                <FiTrendingUp />
                                <span>Promotion Report</span>
                            </button>
                            <button className="action-btn">
                                <FiUser />
                                <span>Eligible Employees</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PositionPromotions;