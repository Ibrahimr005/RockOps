import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaPercent, FaCalendarAlt } from 'react-icons/fa';
import { employeeDeductionService } from '../../../../services/payroll/employeeDeductionService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import ContentLoader from '../../../../components/common/ContentLoader/ContentLoader.jsx';

const DeductionsTab = ({ employee, formatCurrency }) => {
    const { showError } = useSnackbar();
    const [deductions, setDeductions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employee?.id) {
            fetchDeductions();
        }
    }, [employee?.id]);

    const fetchDeductions = async () => {
        try {
            setLoading(true);
            const response = await employeeDeductionService.getDeductionsByEmployee(employee.id);
            setDeductions(response.data || []);
        } catch (error) {
            console.error('Error fetching deductions:', error);
            showError('Failed to load deductions');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate summary
    const activeDeductions = deductions.filter(d => d.isActive);
    const totalMonthlyActive = activeDeductions
        .filter(d => d.frequency === 'MONTHLY')
        .reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalDeducted = deductions.reduce((sum, d) => sum + (d.totalDeducted || 0), 0);

    const getStatusBadge = (deduction) => {
        if (deduction.isActive) {
            return <span className="status-badge completed">Active</span>;
        }
        return <span className="status-badge cancelled">Inactive</span>;
    };

    const columns = [
        {
            header: 'Deduction #',
            accessor: 'deductionNumber',
            sortable: true,
            width: '130px'
        },
        {
            header: 'Type',
            accessor: 'displayName',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.displayName || row.deductionTypeName}</div>
                    {row.categoryDisplayName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {row.categoryDisplayName}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Method',
            accessor: 'calculationMethod',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => row.calculationMethod === 'PERCENTAGE'
                ? `${row.percentageValue}%`
                : 'Fixed'
        },
        {
            header: 'Amount',
            accessor: 'amount',
            sortable: true,
            render: (row) => formatCurrency(row.amount)
        },
        {
            header: 'Frequency',
            accessor: 'frequency',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => row.frequencyDisplayName || row.frequency?.replace(/_/g, ' ')
        },
        {
            header: 'Effective From',
            accessor: 'effectiveStartDate',
            sortable: true,
            render: (row) => formatDate(row.effectiveStartDate)
        },
        {
            header: 'Total Deducted',
            accessor: 'totalDeducted',
            sortable: true,
            render: (row) => formatCurrency(row.totalDeducted || 0)
        },
        {
            header: 'Times Applied',
            accessor: 'deductionCount',
            sortable: true,
            render: (row) => row.deductionCount || 0
        },
        {
            header: 'Status',
            accessor: 'isActive',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => getStatusBadge(row)
        }
    ];

    if (loading) {
        return (
            <div className="deductions-info tab-panel">
                <ContentLoader text="Loading deductions..." />
            </div>
        );
    }

    return (
        <div className="deductions-info tab-panel">
            <StatisticsCards
                cards={[
                    {
                        icon: <FaMinus />,
                        label: 'Active Deductions',
                        value: activeDeductions.length,
                        variant: 'primary',
                        subtitle: `of ${deductions.length} total`
                    },
                    {
                        icon: <FaCalendarAlt />,
                        label: 'Monthly Deductions',
                        value: formatCurrency(totalMonthlyActive),
                        variant: 'warning',
                        subtitle: 'Active monthly'
                    },
                    {
                        icon: <FaPercent />,
                        label: 'Total Deducted',
                        value: formatCurrency(totalDeducted),
                        variant: 'info',
                        subtitle: 'Lifetime total'
                    }
                ]}
                columns={3}
            />

            <DataTable
                data={deductions}
                columns={columns}
                isLoading={loading}
                emptyMessage="No deductions found for this employee"
                searchPlaceholder="Search deductions..."
                defaultSortField="effectiveStartDate"
                defaultSortDirection="desc"
                exportFileName={`${employee.firstName}_${employee.lastName}_Deductions`}
            />
        </div>
    );
};

export default DeductionsTab;
