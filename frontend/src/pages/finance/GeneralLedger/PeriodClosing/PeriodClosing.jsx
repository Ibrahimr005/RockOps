import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaLock, FaLockOpen, FaCheck, FaExclamationTriangle, FaPlus } from 'react-icons/fa';
import { useAuth } from "../../../../Contexts/AuthContext";
import DataTable from '../../../../components/common/DataTable/DataTable';
import './PeriodClosing.css';

const PeriodClosing = () => {
    const [accountingPeriods, setAccountingPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
    const [confirmationModal, setConfirmationModal] = useState({
        show: false,
        periodId: null,
        action: null, // 'close' or 'reopen'
    });

    // Add new period modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPeriod, setNewPeriod] = useState({
        name: '',
        startDate: '',
        endDate: ''
    });

    const isFinanceManager = currentUser?.role === "FINANCE_MANAGER";

    useEffect(() => {
        fetchAccountingPeriods();
    }, []);

    const fetchAccountingPeriods = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('http://localhost:8080/api/v1/accounting-periods', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Fetched periods raw data:", data);

            // Ensure data is an array
            const periodsArray = Array.isArray(data) ? data : [];
            setAccountingPeriods(periodsArray);

            // Debug the data structure
            if (periodsArray.length > 0) {
                console.log("First period object:", periodsArray[0]);
                console.log("First period keys:", Object.keys(periodsArray[0]));
            }

            setError(null);
        } catch (err) {
            setError('Error: ' + err.message);
            console.error("Error fetching accounting periods:", err);
            setAccountingPeriods([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePeriod = (periodId, currentlyClosed) => {
        console.log(`Toggling period ${periodId}, currently closed: ${currentlyClosed}`);
        setConfirmationModal({
            show: true,
            periodId,
            action: currentlyClosed ? 'reopen' : 'close',
        });
    };

    const confirmPeriodAction = async () => {
        try {
            const token = localStorage.getItem('token');
            const { periodId, action } = confirmationModal;

            if (!token) {
                throw new Error('No authentication token found');
            }

            // Note: Based on your backend, we only have a close endpoint, not reopen
            if (action === 'close') {
                const response = await fetch(`http://localhost:8080/api/v1/accounting-periods/${periodId}/close`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notes: 'Period closed by finance manager' })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                // Refresh periods after successful action
                await fetchAccountingPeriods();
                setConfirmationModal({ show: false, periodId: null, action: null });
            } else {
                // Your backend doesn't seem to have a reopen endpoint at the moment
                setError('Reopening periods is not currently supported');
                setConfirmationModal({ show: false, periodId: null, action: null });
            }
        } catch (err) {
            setError('Error: ' + err.message);
            console.error("Error updating accounting period:", err);
            setConfirmationModal({ show: false, periodId: null, action: null });
        }
    };

    const cancelPeriodAction = () => {
        setConfirmationModal({ show: false, periodId: null, action: null });
    };

    const handleNewPeriodChange = (e) => {
        const { name, value } = e.target;
        setNewPeriod(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreatePeriod = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            // Validate form data
            if (!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) {
                throw new Error('Please fill in all required fields');
            }

            const response = await fetch('http://localhost:8080/api/v1/accounting-periods', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newPeriod)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}. ${errorData}`);
            }

            // Reset form and close modal
            setNewPeriod({
                name: '',
                startDate: '',
                endDate: ''
            });
            setShowAddModal(false);

            // Refresh periods list
            await fetchAccountingPeriods();
            setError(null); // Clear any previous errors
        } catch (err) {
            setError('Error creating period: ' + err.message);
            console.error("Error creating period:", err);
        }
    };

    const formatPeriodRange = (period) => {
        try {
            if (!period.startDate || !period.endDate) {
                return 'Invalid date range';
            }
            const startDate = new Date(period.startDate).toLocaleDateString();
            const endDate = new Date(period.endDate).toLocaleDateString();
            return `${startDate} - ${endDate}`;
        } catch (err) {
            console.error('Error formatting date range:', err);
            return 'Invalid date range';
        }
    };

    const columns = [
        {
            id: 'name',
            header: 'Period Name',
            accessor: 'name',
            sortable: true,
            minWidth: '200px'
        },
        {
            id: 'dateRange',
            header: 'Date Range',
            accessor: 'startDate', // Use a simple accessor for DataTable
            sortable: false,
            width: '200px',
            render: (row) => formatPeriodRange(row) // Use render instead of function accessor
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'closed',
            sortable: true,
            width: '120px',
            render: (row) => (
                <span className={`status-badge ${row.closed ? 'closed' : 'open'}`}>
                    {row.closed ? 'Closed' : 'Open'}
                </span>
            )
        }
    ];

    // Fix the actions array - remove conditional functions that might cause issues
    const actions = isFinanceManager ? [
        {
            icon: <FaLock />,
            label: 'Close Period',
            onClick: (row) => handleTogglePeriod(row.id, row.closed),
            className: 'action-close',
            isDisabled: (row) => row.closed // Only show for open periods
        },
        {
            icon: <FaLockOpen />,
            label: 'Reopen Period',
            onClick: (row) => handleTogglePeriod(row.id, row.closed),
            className: 'action-reopen',
            isDisabled: (row) => !row.closed // Only show for closed periods
        }
    ] : [];

    // Error boundary - if there's an error, show it instead of crashing
    if (error && error.includes('Cannot read properties')) {
        return (
            <div className="period-closing-container">
                <div className="error-container">
                    <h3>Component Error</h3>
                    <p>There was an error loading the Period Closing component.</p>
                    <p>Error: {error}</p>
                    <button onClick={() => {
                        setError(null);
                        fetchAccountingPeriods();
                    }}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="period-closing-container">
                <div className="loading-container">Loading accounting periods...</div>
            </div>
        );
    }

    return (
        <div className="period-closing-container">
            <div className="pc-header">
                <h2>Accounting Periods</h2>
                {isFinanceManager && (
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <FaPlus /> New Period
                    </button>
                )}
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <DataTable
                data={accountingPeriods}
                columns={columns}
                actions={actions}
                loading={loading}
                showSearch={true}
                showFilters={true}
                defaultSortField="name"
                defaultSortDirection="desc"
                tableTitle="Accounting Periods"
                emptyMessage="No accounting periods found"
            />

            {/* Add Period Modal */}
            {showAddModal && (
                <div className="period-modal-overlay">
                    <div className="period-modal-content">
                        <div className="period-modal-header">
                            <h2>Add Accounting Period</h2>
                            <button className="period-modal-close-button" onClick={() => setShowAddModal(false)}>×</button>
                        </div>

                        <div className="period-modal-body">
                            <div className="period-form-card">
                                <form onSubmit={handleCreatePeriod}>
                                    <div className="period-form-group">
                                        <label className="period-form-label">Period Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={newPeriod.name}
                                            onChange={handleNewPeriodChange}
                                            className="period-form-control"
                                            required
                                            placeholder="e.g., Q1 2024"
                                        />
                                    </div>

                                    <div className="period-form-group">
                                        <label className="period-form-label">Start Date</label>
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={newPeriod.startDate}
                                            onChange={handleNewPeriodChange}
                                            className="period-form-control"
                                            required
                                        />
                                    </div>

                                    <div className="period-form-group">
                                        <label className="period-form-label">End Date</label>
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={newPeriod.endDate}
                                            onChange={handleNewPeriodChange}
                                            className="period-form-control"
                                            required
                                        />
                                    </div>

                                    <div className="period-form-actions">
                                        <button
                                            type="button"
                                            className="period-cancel-button"
                                            onClick={() => setShowAddModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="period-submit-button"
                                        >
                                            Create Period
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmationModal.show && (
                <div className="period-modal-overlay">
                    <div className="period-modal-content period-confirmation-content">
                        <div className="period-modal-header">
                            <h2>{confirmationModal.action === 'close' ? 'Close Period' : 'Reopen Period'}</h2>
                            <button className="period-modal-close-button" onClick={cancelPeriodAction}>×</button>
                        </div>

                        <div className="period-modal-body">
                            <div className="period-confirmation-icon warning">
                                <FaExclamationTriangle />
                            </div>
                            <div className="period-confirmation-message">
                                {confirmationModal.action === 'close'
                                    ? 'Are you sure you want to close this accounting period? This action cannot be undone.'
                                    : 'Are you sure you want to reopen this accounting period?'
                                }
                            </div>
                            <div className="period-form-actions">
                                <button
                                    className="period-cancel-button"
                                    onClick={cancelPeriodAction}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="period-submit-button"
                                    onClick={confirmPeriodAction}
                                >
                                    {confirmationModal.action === 'close' ? 'Close Period' : 'Reopen Period'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PeriodClosing;