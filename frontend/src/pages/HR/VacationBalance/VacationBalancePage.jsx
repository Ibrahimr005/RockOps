import React, {useEffect, useMemo, useState} from 'react';
import {BsCalendar2Week, BsClockHistory, BsExclamationTriangle, BsPersonCheck, BsPlusCircle,} from 'react-icons/bs';
import {FaAward} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';
import ContentLoader from '../../../components/common/ContentLoader/ContentLoader.jsx';
import {useSnackbar} from '../../../contexts/SnackbarContext.jsx';
import './VacationBalancePage.scss';
import {vacationBalanceService} from "../../../services/hr/vacationBalanceService.jsx";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";

const VacationBalancePage = () => {
    // State management
    const [vacationBalances, setVacationBalances] = useState([]);
    const [filteredBalances, setFilteredBalances] = useState([]);
    const [lowBalanceEmployees, setLowBalanceEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({key: null, direction: 'asc'});

    // Modals state
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
    const [showInitializeModal, setShowInitializeModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const {showSuccess, showError} = useSnackbar();

    // Generate year options
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push(i);
        }
        return years;
    }, []);

    // Fetch data on component mount and year change
    useEffect(() => {
        fetchVacationBalances();
        fetchLowBalanceEmployees();
    }, [selectedYear]);

    // Filter and search effect
    useEffect(() => {
        filterAndSearchBalances();
    }, [vacationBalances, searchTerm, filterType]);

    const fetchVacationBalances = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await vacationBalanceService.getAllVacationBalances(selectedYear);

            if (response.data?.success) {
                setVacationBalances(response.data.data || []);
            } else {
                throw new Error(response.data?.error || 'Failed to fetch vacation balances');
            }
        } catch (err) {
            console.error('Error fetching vacation balances:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch vacation balances';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLowBalanceEmployees = async () => {
        try {
            const response = await vacationBalanceService.getEmployeesWithLowBalance({
                year: selectedYear,
                threshold: 5
            });

            if (response.data?.success) {
                setLowBalanceEmployees(response.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching low balance employees:', err);
        }
    };

    const filterAndSearchBalances = () => {
        let filtered = [...vacationBalances];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(balance =>
                balance.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply type filter
        switch (filterType) {
            case 'low':
                filtered = filtered.filter(balance => balance.hasLowBalance);
                break;
            case 'unused':
                filtered = filtered.filter(balance => balance.hasUnusedDays);
                break;
            case 'high_utilization':
                filtered = filtered.filter(balance => balance.utilizationRate > 80);
                break;
            case 'all':
            default:
                break;
        }

        setFilteredBalances(filtered);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({key, direction});

        const sortedBalances = [...filteredBalances].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredBalances(sortedBalances);
    };

    const handleInitializeBalances = async () => {
        try {
            await vacationBalanceService.initializeYearlyBalances(selectedYear);
            showSuccess(`Vacation balances initialized for ${selectedYear}`);
            fetchVacationBalances();
            setShowInitializeModal(false);
        } catch (err) {
            showError(err.response?.data?.error || 'Failed to initialize balances');
        }
    };

    const handleCarryForward = async (carryForwardData) => {
        try {
            await vacationBalanceService.carryForwardBalances(carryForwardData);
            showSuccess(`Vacation days carried forward from ${carryForwardData.fromYear} to ${carryForwardData.toYear}`);
            fetchVacationBalances();
            setShowCarryForwardModal(false);
        } catch (err) {
            showError(err.response?.data?.error || 'Failed to carry forward balances');
        }
    };

    const handleAwardBonus = async (bonusData) => {
        try {
            await vacationBalanceService.awardBonusDays(selectedEmployee.employeeId, bonusData);
            showSuccess(`Awarded ${bonusData.bonusDays} bonus days to ${selectedEmployee.employeeName}`);
            fetchVacationBalances();
            setShowBonusModal(false);
            setSelectedEmployee(null);
        } catch (err) {
            showError(err.response?.data?.error || 'Failed to award bonus days');
        }
    };

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        if (!vacationBalances.length) return {
            totalEmployees: 0,
            averageRemaining: 0,
            lowBalanceCount: 0,
            unusedDaysCount: 0,
            totalAllocated: 0,
            totalUsed: 0,
            utilizationRate: 0
        };

        const totalEmployees = vacationBalances.length;
        const totalAllocated = vacationBalances.reduce((sum, balance) => sum + balance.totalAllocated, 0);
        const totalUsed = vacationBalances.reduce((sum, balance) => sum + balance.usedDays, 0);
        const totalRemaining = vacationBalances.reduce((sum, balance) => sum + balance.remainingDays, 0);
        const lowBalanceCount = vacationBalances.filter(balance => balance.hasLowBalance).length;
        const unusedDaysCount = vacationBalances.filter(balance => balance.hasUnusedDays).length;

        return {
            totalEmployees,
            averageRemaining: Math.round(totalRemaining / totalEmployees),
            lowBalanceCount,
            unusedDaysCount,
            totalAllocated,
            totalUsed,
            utilizationRate: totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0
        };
    }, [vacationBalances]);

    // Table columns configuration
    const columns = [
        {
            key: 'employeeName',
            header: 'Employee',
            sortable: true,
            render: (balance) => (
                <div className="vacation-balance-employee-info">
                    <div className="vacation-balance-employee-name">{balance.employeeName}</div>
                    <div className="vacation-balance-employee-id">ID: {balance.employeeId.slice(-8)}</div>
                </div>
            )
        },
        {
            key: 'totalAllocated',
            header: 'Allocated',
            sortable: true,
            render: (balance) => <span className="vacation-balance-days-count">{balance.totalAllocated}</span>
        },
        {
            key: 'usedDays',
            header: 'Used',
            sortable: true,
            render: (balance) => <span
                className="vacation-balance-days-count vacation-balance-used">{balance.usedDays}</span>
        },
        {
            key: 'pendingDays',
            header: 'Pending',
            sortable: true,
            render: (balance) => (
                <span
                    className={`vacation-balance-days-count ${balance.pendingDays > 0 ? 'vacation-balance-pending' : ''}`}>
                    {balance.pendingDays}
                </span>
            )
        },
        {
            key: 'remainingDays',
            header: 'Remaining',
            sortable: true,
            render: (balance) => (
                <span
                    className={`vacation-balance-days-count ${balance.hasLowBalance ? 'vacation-balance-low' : 'vacation-balance-remaining'}`}>
                    {balance.remainingDays}
                </span>
            )
        },
        {
            key: 'carriedForward',
            header: 'Carried Forward',
            sortable: true,
            render: (balance) => (
                <span className="vacation-balance-days-count vacation-balance-carried">{balance.carriedForward}</span>
            )
        },
        {
            key: 'bonusDays',
            header: 'Bonus',
            sortable: true,
            render: (balance) => (
                <span
                    className={`vacation-balance-days-count ${balance.bonusDays > 0 ? 'vacation-balance-bonus' : ''}`}>
                    {balance.bonusDays}
                </span>
            )
        },
        {
            key: 'utilizationRate',
            header: 'Utilization',
            sortable: true,
            render: (balance) => (
                <div className="vacation-balance-utilization-cell">
                    <span className="vacation-balance-utilization-rate">{balance.utilizationRate}%</span>
                    <div className="vacation-balance-utilization-bar">
                        <div
                            className="vacation-balance-utilization-fill"
                            style={{width: `${Math.min(balance.utilizationRate, 100)}%`}}
                        />
                    </div>
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (balance) => (
                <div className="vacation-balance-action-buttons">
                    <button
                        className="btn btn-sm vacation-balance-bonus-btn"
                        onClick={() => {
                            setSelectedEmployee(balance);
                            setShowBonusModal(true);
                        }}
                        title="Award Bonus Days"
                    >
                        <FaAward/>
                    </button>
                </div>
            )
        }
    ];

    if (isLoading) {
        return <ContentLoader/>;
    }

    return (
        <div className="vacation-balance-page">
            {/* Page Header */}
            <div className="departments-header">

                    <h1>Vacation Balance Management<p className="employees-header__subtitle">Manage employee vacation
                        balances and allocations</p></h1>

                <div className="vacation-balance-header-actions">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="vacation-balance-year-selector"
                    >
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button
                        className="btn btn-primary vacation-balance-init-btn"
                        onClick={() => setShowInitializeModal(true)}
                    >
                        <BsPlusCircle/> Initialize Year
                    </button>
                    <button
                        className="btn btn-secondary vacation-balance-carry-forward-btn"
                        onClick={() => setShowCarryForwardModal(true)}
                    >
                        <BsClockHistory/> Carry Forward
                    </button>
                </div>

            </div>

            {/* Summary Statistics Cards */}
            <div className="vacation-balance-stats-container">
                <div className="vacation-balance-stat-card vacation-balance-stat-employees">
                    <div className="vacation-balance-stat-content">
                        <div className="vacation-balance-stat-icon">
                            <BsPersonCheck/>
                        </div>
                        <div className="vacation-balance-stat-info">
                            <h3 className="vacation-balance-stat-title">Total Employees</h3>
                            <div className="vacation-balance-stat-value">{summaryStats.totalEmployees}</div>
                        </div>
                    </div>
                </div>
                <div className="vacation-balance-stat-card vacation-balance-stat-remaining">
                    <div className="vacation-balance-stat-content">
                        <div className="vacation-balance-stat-icon">
                            <BsCalendar2Week/>
                        </div>
                        <div className="vacation-balance-stat-info">
                            <h3 className="vacation-balance-stat-title">Avg Remaining Days</h3>
                            <div className="vacation-balance-stat-value">{summaryStats.averageRemaining}</div>
                        </div>
                    </div>
                </div>
                <div className="vacation-balance-stat-card vacation-balance-stat-alerts">
                    <div className="vacation-balance-stat-content">
                        <div className="vacation-balance-stat-icon">
                            <BsExclamationTriangle/>
                        </div>
                        <div className="vacation-balance-stat-info">
                            <h3 className="vacation-balance-stat-title">Low Balance Alerts</h3>
                            <div className="vacation-balance-stat-value">{summaryStats.lowBalanceCount}</div>
                        </div>
                    </div>
                </div>
                <div className="vacation-balance-stat-card vacation-balance-stat-utilization">
                    <div className="vacation-balance-stat-content">
                        <div className="vacation-balance-stat-icon">
                            <BsClockHistory/>
                        </div>
                        <div className="vacation-balance-stat-info">
                            <h3 className="vacation-balance-stat-title">Overall Utilization</h3>
                            <div className="vacation-balance-stat-value">{summaryStats.utilizationRate}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            {/*<div className="vacation-balance-controls">*/}
            {/*    <div className="vacation-balance-search-controls">*/}
            {/*        <div className="vacation-balance-search-box">*/}
            {/*            <BsSearch className="vacation-balance-search-icon" />*/}
            {/*            <input*/}
            {/*                type="text"*/}
            {/*                placeholder="Search employees..."*/}
            {/*                value={searchTerm}*/}
            {/*                onChange={(e) => setSearchTerm(e.target.value)}*/}
            {/*                className="vacation-balance-search-input"*/}
            {/*            />*/}
            {/*        </div>*/}
            {/*        <button*/}
            {/*            className={`btn btn-secondary vacation-balance-filter-toggle ${showFilters ? 'active' : ''}`}*/}
            {/*            onClick={() => setShowFilters(!showFilters)}*/}
            {/*        >*/}
            {/*            <BsFilter />*/}
            {/*            Filters*/}
            {/*            {showFilters ? <FaCaretUp /> : <FaCaretDown />}*/}
            {/*        </button>*/}
            {/*    </div>*/}

            {/*    {showFilters && (*/}
            {/*        <div className="vacation-balance-filter-options">*/}
            {/*            <div className="vacation-balance-filter-group">*/}
            {/*                <label>Filter by:</label>*/}
            {/*                <select*/}
            {/*                    value={filterType}*/}
            {/*                    onChange={(e) => setFilterType(e.target.value)}*/}
            {/*                    className="vacation-balance-filter-select"*/}
            {/*                >*/}
            {/*                    <option value="all">All Employees</option>*/}
            {/*                    <option value="low">Low Balance</option>*/}
            {/*                    <option value="unused">Unused Days</option>*/}
            {/*                    <option value="high_utilization">High Utilization (80%+)</option>*/}
            {/*                </select>*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    )}*/}
            {/*</div>*/}

            {/* Low Balance Alert */}
            {lowBalanceEmployees.length > 0 && (
                <div className="vacation-balance-alert-card">
                    <BsExclamationTriangle className="vacation-balance-alert-icon"/>
                    <div className="vacation-balance-alert-content">
                        <h4>Low Balance Alert</h4>
                        <p>{lowBalanceEmployees.length} employee(s) have low vacation balance (≤5 days remaining)</p>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="vacation-balance-table-container">
                <DataTable
                    data={filteredBalances}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage="No vacation balance data found"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />
            </div>

            {/* Modals */}
            {showBonusModal && (
                <BonusModal
                    employee={selectedEmployee}
                    year={selectedYear}
                    onSubmit={handleAwardBonus}
                    onClose={() => {
                        setShowBonusModal(false);
                        setSelectedEmployee(null);
                    }}
                />
            )}

            {showCarryForwardModal && (
                <CarryForwardModal
                    currentYear={selectedYear}
                    onSubmit={handleCarryForward}
                    onClose={() => setShowCarryForwardModal(false)}
                />
            )}

            {showInitializeModal && (
                <InitializeModal
                    year={selectedYear}
                    onConfirm={handleInitializeBalances}
                    onClose={() => setShowInitializeModal(false)}
                />
            )}
        </div>
    );
};

// Modal components using existing modal styles
const BonusModal = ({employee, year, onSubmit, onClose}) => {
    const [bonusDays, setBonusDays] = useState(1);
    const [reason, setReason] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({year, bonusDays, reason});
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <FaAward/>
                        Award Bonus Days
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Employee</label>
                            <input
                                type="text"
                                value={employee?.employeeName}
                                disabled
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Bonus Days *</label>
                            <input
                                type="number"
                                min="1"
                                value={bonusDays}
                                onChange={(e) => setBonusDays(parseInt(e.target.value))}
                                required
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Reason *</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                placeholder="Reason for awarding bonus days"
                                className="form-textarea"
                                rows="3"
                            />
                        </div>
                    </div>

                </form>
                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
                        Award Bonus
                    </button>
                </div>
            </div>
        </div>
    );
};

const CarryForwardModal = ({currentYear, onSubmit, onClose}) => {
    const [fromYear, setFromYear] = useState(currentYear - 1);
    const [toYear, setToYear] = useState(currentYear);
    const [maxCarryForward, setMaxCarryForward] = useState(5);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({fromYear, toYear, maxCarryForward});
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container modal-md" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <BsClockHistory/>
                        Carry Forward Vacation Days
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="modal-body">
                        <div className="form-group">
                            <label>From Year *</label>
                            <input
                                type="number"
                                value={fromYear}
                                onChange={(e) => setFromYear(parseInt(e.target.value))}
                                required
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>To Year *</label>
                            <input
                                type="number"
                                value={toYear}
                                onChange={(e) => setToYear(parseInt(e.target.value))}
                                required
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Max Days to Carry Forward *</label>
                            <input
                                type="number"
                                min="0"
                                value={maxCarryForward}
                                onChange={(e) => setMaxCarryForward(parseInt(e.target.value))}
                                required
                                className="form-input"
                            />
                        </div>
                    </div>

                </form>
                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
                        Carry Forward
                    </button>
                </div>
            </div>
        </div>
    );
};

const InitializeModal = ({year, onConfirm, onClose}) => {
    return (
        <ConfirmationDialog
            isVisible={true}
            type="info"
            title="Initialize Vacation Balances"
            message={`This will create vacation balance records for all active employees for ${year}.\n\nExisting records will not be affected.`}
            confirmText="Initialize"
            cancelText="Cancel"
            onConfirm={onConfirm}
            onCancel={onClose}
            size="medium"
        />
    );
};

export default VacationBalancePage;