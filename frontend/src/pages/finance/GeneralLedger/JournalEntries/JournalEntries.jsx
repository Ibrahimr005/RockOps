import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './JournalEntries.css';
import { useAuth } from "../../../../contexts/AuthContext";
import { FaBook, FaSearch, FaFilter, FaPlus, FaCheck, FaTimes, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";

const JournalEntries = () => {
    const [journalEntries, setJournalEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { showError, showSuccess } = useSnackbar();

    // Filter states - simplified since DataTable handles filtering
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState({
        startDate: '',
        endDate: ''
    });

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);

    // Form state for new entry
    const [formData, setFormData] = useState({
        entryDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        description: '',
        documentPath: null,
        entryLines: [
            { description: '', amount: '', debit: true },
            { description: '', amount: '', debit: false }
        ]
    });

    const isFinanceManager = currentUser?.role === "FINANCE_MANAGER";
    const isFinanceEmployee = currentUser?.role === "FINANCE_EMPLOYEE" || isFinanceManager;

    useEffect(() => {
        fetchJournalEntries();
    }, [statusFilter, dateFilter]);

    const fetchJournalEntries = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            let url = 'http://localhost:8080/api/v1/journal-entries';

            // Add filters to the URL if they exist
            const params = new URLSearchParams();

            if (statusFilter !== 'ALL') {
                params.append('status', statusFilter);
            }

            if (dateFilter.startDate && dateFilter.endDate) {
                params.append('startDate', dateFilter.startDate);
                params.append('endDate', dateFilter.endDate);
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched journal entries:', data);

            // Ensure data is always an array
            const entriesArray = Array.isArray(data) ? data : [];
            setJournalEntries(entriesArray);
            setError(null);
        } catch (err) {
            showError('Could not fetch journal entries. Please try again.');
            console.error("Error fetching journal entries:", err);
            setJournalEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        // Reset form data
        setFormData({
            entryDate: new Date().toISOString().split('T')[0],
            referenceNumber: '',
            description: '',
            documentPath: null,
            entryLines: [
                { description: '', amount: '', debit: true },
                { description: '', amount: '', debit: false }
            ]
        });
        setShowAddModal(true);
    };

    const handleOpenDetailModal = async (entry) => {
        try {
            // If we need to fetch complete entry details
            if (!entry.entryLines || entry.entryLines.length === 0) {
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:8080/api/v1/journal-entries/${entry.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

                const detailedEntry = await response.json();
                setSelectedEntry(detailedEntry);
            } else {
                setSelectedEntry(entry);
            }

            setShowDetailModal(true);
        } catch (err) {
            showError('Could not fetch journal entry details. Please try again.');
            console.error("Error fetching journal entry details:", err);
        }
    };

    const handleCloseModals = () => {
        setShowAddModal(false);
        setShowDetailModal(false);
        setSelectedEntry(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleLineChange = (index, field, value) => {
        const updatedLines = [...formData.entryLines];
        updatedLines[index] = { ...updatedLines[index], [field]: value };
        setFormData({ ...formData, entryLines: updatedLines });
    };

    const addEntryLine = () => {
        setFormData({
            ...formData,
            entryLines: [...formData.entryLines, { description: '', amount: '', debit: false }]
        });
    };

    const removeEntryLine = (index) => {
        const updatedLines = formData.entryLines.filter((_, i) => i !== index);
        setFormData({ ...formData, entryLines: updatedLines });
    };

    const calculateTotals = () => {
        let totalDebits = 0;
        let totalCredits = 0;

        formData.entryLines.forEach(line => {
            const amount = parseFloat(line.amount) || 0;
            if (line.debit) {
                totalDebits += amount;
            } else {
                totalCredits += amount;
            }
        });

        return { totalDebits, totalCredits };
    };

    const isBalanced = () => {
        const { totalDebits, totalCredits } = calculateTotals();
        return totalDebits === totalCredits;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isBalanced()) {
            alert('Journal entry must be balanced (debits must equal credits)');
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            alert('Authentication token not found. Please log in again.');
            return;
        }

        const formDataToSend = new FormData();

        // Create a copy without the file for JSON conversion
        const entryData = { ...formData };
        delete entryData.documentPath;

        formDataToSend.append("journalEntryData", JSON.stringify(entryData));

        // Add document if selected
        if (formData.documentPath) {
            formDataToSend.append("document", formData.documentPath);
        }

        try {
            const response = await fetch("http://localhost:8080/api/v1/journal-entries", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formDataToSend,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}. ${errorText}`);
            }

            // Refresh entries and close modal
            await fetchJournalEntries();
            handleCloseModals();
            showSuccess('Journal entry created successfully!');
        } catch (err) {
            console.error("Failed to add journal entry:", err.message);
            showError('Could not create journal entry. Please check your input and try again.');
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, documentPath: e.target.files[0] });
    };

    const handleApproveEntry = async (id) => {
        const token = localStorage.getItem("token");

        if (!token) {
            alert('Authentication token not found. Please log in again.');
            return;
        }

        try {
            console.log('Attempting to approve entry with ID:', id);

            // First, check if the entry exists and get its current state
            const checkResponse = await fetch(`http://localhost:8080/api/v1/journal-entries/${id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (checkResponse.ok) {
                const entryDetails = await checkResponse.json();
                console.log('Entry details:', entryDetails);

                // Check if current user is trying to approve their own entry
                if (entryDetails.createdBy === currentUser?.username || entryDetails.createdBy === currentUser?.name) {
                    showError('You cannot approve your own journal entries. Another finance manager must review and approve this entry.');
                    return;
                }

                // Check entry status
                if (entryDetails.status !== 'PENDING') {
                    showError(`Cannot approve entry. Current status: ${entryDetails.status}`);
                    return;
                }
            } else {
                console.error('Failed to fetch entry details:', checkResponse.status);
                showError('Could not verify entry details. Please try again.');
                return;
            }

            // Proceed with approval
            const approveResponse = await fetch(`http://localhost:8080/api/v1/journal-entries/${id}/approve`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    comments: "Approved by finance manager"
                })
            });

            console.log('Approve response status:', approveResponse.status);

            if (!approveResponse.ok) {
                const errorText = await approveResponse.text();
                console.error('Approve error response:', errorText);

                // Handle specific error cases
                switch (approveResponse.status) {
                    case 400:
                        // Try to parse the error message from backend
                        try {
                            const errorJson = JSON.parse(errorText);
                            if (errorJson.error && errorJson.error.includes('cannot approve')) {
                                showError('You cannot approve your own journal entries. Another finance manager must review and approve this entry.');
                            } else {
                                showError(`Approval failed: ${errorJson.error || 'Invalid request. Please check entry status and your permissions.'}`);
                            }
                        } catch (parseError) {
                            showError('You cannot approve your own journal entries. Another finance manager must review and approve this entry.');
                        }
                        break;
                    case 401:
                        showError('Session expired. Please log in again.');
                        break;
                    case 403:
                        showError('You do not have permission to approve entries. Only Finance Managers can approve journal entries.');
                        break;
                    case 404:
                        showError('Journal entry not found.');
                        break;
                    default:
                        showError(`Server error: Unable to approve entry. Please try again later.`);
                }
                return;
            }

            // Success
            const result = await approveResponse.json();
            console.log('Approval successful:', result);

            // Refresh entries and close modal
            await fetchJournalEntries();
            handleCloseModals();
            showSuccess('Journal entry approved successfully!');

        } catch (err) {
            console.error("Failed to approve journal entry:", err);
            showError('Network error: Unable to connect to server. Please check your connection and try again.');
        }
    };

    const handleRejectEntry = async (id, reason) => {
        const token = localStorage.getItem("token");

        if (!token) {
            alert('Authentication token not found. Please log in again.');
            return;
        }

        if (!reason || reason.trim() === '') {
            alert('Please provide a reason for rejection.');
            return;
        }

        try {
            console.log('Rejecting entry with ID:', id, 'Reason:', reason);

            const response = await fetch(`http://localhost:8080/api/v1/journal-entries/${id}/reject`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    reason: reason.trim()
                })
            });

            console.log('Reject response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! Status: ${response.status}. ${errorText}`);
            }

            const result = await response.json();
            console.log('Reject result:', result);

            // Refresh entries and close modal
            await fetchJournalEntries();
            handleCloseModals();
            showSuccess('Journal entry rejected successfully!');
        } catch (err) {
            console.error("Failed to reject journal entry:", err);
            showError('Failed to reject journal entry: ' + err.message);
        }
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'entryDate',
            header: 'DATE',
            accessor: 'entryDate',
            sortable: true,
            width: '120px',
            render: (row) => {
                try {
                    return new Date(row.entryDate).toLocaleDateString();
                } catch (e) {
                    return row.entryDate || 'Invalid Date';
                }
            }
        },
        {
            id: 'referenceNumber',
            header: 'REFERENCE',
            accessor: 'referenceNumber',
            sortable: true,
            width: '150px'
        },
        {
            id: 'description',
            header: 'DESCRIPTION',
            accessor: 'description',
            sortable: true,
            minWidth: '200px',
            flexWeight: 2
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            sortable: true,
            width: '150px'
        },
        {
            id: 'status',
            header: 'STATUS',
            accessor: 'status',
            sortable: true,
            width: '120px',
            render: (row) => (
                <span className={`status-badge status-badge--${(row.status || 'pending').toLowerCase()}`}>
                    {row.status || 'PENDING'}
                </span>
            )
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            onClick: (row) => handleOpenDetailModal(row),
            className: 'journal-action-view'
        }
    ];

    // Add approval/rejection actions for finance managers on pending entries
    if (isFinanceManager) {
        // We'll handle the approval logic within the detail modal
        // since we need to check if the current user created the entry
    }

    // Define filterable columns for DataTable search/filter functionality
    const filterableColumns = [
        { header: 'Reference', accessor: 'referenceNumber', filterType: 'text' },
        { header: 'Description', accessor: 'description', filterType: 'text' },
        { header: 'Created By', accessor: 'createdBy', filterType: 'text' },
        { header: 'Status', accessor: 'status', filterType: 'select' }
    ];

    // Calculate total amount for each entry (sum of debits or credits)
    const enrichedJournalEntries = journalEntries.map(entry => ({
        ...entry,
        totalAmount: entry.entryLines ?
            entry.entryLines.reduce((total, line) => total + (parseFloat(line.amount) || 0), 0) / 2 : 0
    }));

    return (
        <div className="journal-entries-container">
            {/* Custom header with external filters */}



            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* DataTable with proper integration */}
            <DataTable
                data={enrichedJournalEntries}
                columns={columns}
                actions={actions}
                loading={loading}
                tableTitle="Journal Entries" // We're using custom header above
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultSortField="entryDate"
                defaultSortDirection="desc"
                emptyMessage="No journal entries found"
                showAddButton={true}
                addButtonText="Add Entry"
                addButtonIcon={<FaPlus />}
                onAddClick={handleOpenAddModal}
                showExportButton={true}
                exportFileName="journal_entries"
                exportButtonText="Export Excel"
                itemsPerPageOptions={[10, 25, 50, 100]}
                defaultItemsPerPage={25}
                className="journal-data-table"
            />

            {/* Add Journal Entry Modal - Keep existing modal implementation */}
            {showAddModal && (
                <div className="journal-modal-overlay">
                    <div className="journal-modal-content">
                        <div className="journal-modal-header">
                            <h2>Add Journal Entry</h2>
                            <button className="journal-modal-close-button" onClick={handleCloseModals}>×</button>
                        </div>

                        <div className="journal-modal-body">
                            <div className="journal-form-card">
                                <div className="journal-document-section">
                                    <label htmlFor="documentUpload" className="journal-document-upload-label">
                                        <div className="journal-document-placeholder">
                                            {formData.documentPath ? (
                                                <span className="journal-filename">{formData.documentPath.name}</span>
                                            ) : (
                                                <span className="journal-upload-icon">+</span>
                                            )}
                                        </div>
                                        <span className="journal-upload-text">Upload Document</span>
                                    </label>
                                    <input
                                        type="file"
                                        id="documentUpload"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        style={{ display: "none" }}
                                    />
                                </div>

                                <div className="journal-form-fields">
                                    <form onSubmit={handleSubmit}>
                                        <div className="journal-form-grid">
                                            <div className="journal-form-group">
                                                <label>Date</label>
                                                <input
                                                    type="date"
                                                    name="entryDate"
                                                    value={formData.entryDate}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>

                                            <div className="journal-form-group">
                                                <label>Reference</label>
                                                <input
                                                    type="text"
                                                    name="referenceNumber"
                                                    value={formData.referenceNumber}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>

                                            <div className="journal-form-group full-width">
                                                <label>Description</label>
                                                <input
                                                    type="text"
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="journal-entry-lines-section">
                                            <div className="journal-entry-lines-header">
                                                <h3>Entry Lines</h3>
                                                <button
                                                    type="button"
                                                    className="journal-add-line-button"
                                                    onClick={addEntryLine}
                                                >
                                                    + Add Line
                                                </button>
                                            </div>

                                            <div className="journal-entry-lines-list">
                                                <div className="journal-entry-line-header">
                                                    <div>Description</div>
                                                    <div>Amount</div>
                                                    <div>Type</div>
                                                    <div></div>
                                                </div>

                                                {formData.entryLines.map((line, index) => (
                                                    <div key={index} className="journal-entry-line-item">
                                                        <div>
                                                            <input
                                                                type="text"
                                                                value={line.description}
                                                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                                                placeholder="Description"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <input
                                                                type="number"
                                                                value={line.amount}
                                                                onChange={(e) => handleLineChange(index, 'amount', e.target.value)}
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="Amount"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <select
                                                                value={line.debit}
                                                                onChange={(e) => handleLineChange(index, 'debit', e.target.value === 'true')}
                                                            >
                                                                <option value="true">Debit</option>
                                                                <option value="false">Credit</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            {formData.entryLines.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    className="journal-remove-line-button"
                                                                    onClick={() => removeEntryLine(index)}
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="journal-entry-totals">
                                                <div className="journal-total-item">
                                                    <span>Total Debits:</span>
                                                    <span className="journal-total-value">{calculateTotals().totalDebits.toFixed(2)}</span>
                                                </div>
                                                <div className="journal-total-item">
                                                    <span>Total Credits:</span>
                                                    <span className="journal-total-value">{calculateTotals().totalCredits.toFixed(2)}</span>
                                                </div>
                                                <div className={`journal-balance-status ${isBalanced() ? 'balanced' : 'unbalanced'}`}>
                                                    {isBalanced() ? 'Balanced' : 'Unbalanced'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="journal-form-actions">
                                            <button
                                                type="submit"
                                                className="journal-submit-button"
                                                disabled={!isBalanced()}
                                            >
                                                Create Entry
                                            </button>
                                            <button
                                                type="button"
                                                className="journal-cancel-button"
                                                onClick={handleCloseModals}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Journal Entry Detail Modal - Enhanced with approval actions */}
            {showDetailModal && selectedEntry && (
                <div className="journal-modal-overlay">
                    <div className="journal-modal-content">
                        <div className="journal-modal-header">
                            <h2>Journal Entry Details</h2>
                            <button className="journal-modal-close-button" onClick={handleCloseModals}>×</button>
                        </div>

                        <div className="journal-modal-body">
                            <div className="journal-detail-container">
                                <div className="journal-detail-header">
                                    <div className="journal-detail-status">
                                        <span className={`status-badge status-badge--${(selectedEntry.status || 'pending').toLowerCase()}`}>
                                            {selectedEntry.status || 'PENDING'}
                                        </span>
                                    </div>

                                    {selectedEntry.documentPath && (
                                        <div className="journal-detail-document">
                                            <a
                                                href={selectedEntry.documentPath}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="journal-document-link"
                                            >
                                                View Document
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="journal-detail-info">
                                    <div className="journal-detail-item">
                                        <span className="journal-detail-label">Reference:</span>
                                        <span className="journal-detail-value">{selectedEntry.referenceNumber || 'N/A'}</span>
                                    </div>
                                    <div className="journal-detail-item">
                                        <span className="journal-detail-label">Date:</span>
                                        <span className="journal-detail-value">
                                            {selectedEntry.entryDate ? new Date(selectedEntry.entryDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="journal-detail-item">
                                        <span className="journal-detail-label">Description:</span>
                                        <span className="journal-detail-value">{selectedEntry.description || 'N/A'}</span>
                                    </div>
                                    <div className="journal-detail-item">
                                        <span className="journal-detail-label">Created By:</span>
                                        <span className="journal-detail-value">{selectedEntry.createdBy || 'N/A'}</span>
                                    </div>

                                    {selectedEntry.status && selectedEntry.status !== 'PENDING' && (
                                        <>
                                            <div className="journal-detail-item">
                                                <span className="journal-detail-label">Reviewed By:</span>
                                                <span className="journal-detail-value">{selectedEntry.reviewedBy || 'N/A'}</span>
                                            </div>
                                            {selectedEntry.reviewedAt && (
                                                <div className="journal-detail-item">
                                                    <span className="journal-detail-label">Review Date:</span>
                                                    <span className="journal-detail-value">
                                                        {new Date(selectedEntry.reviewedAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {selectedEntry.approvalComments && (
                                        <div className="journal-detail-item">
                                            <span className="journal-detail-label">Approval Comments:</span>
                                            <span className="journal-detail-value">{selectedEntry.approvalComments}</span>
                                        </div>
                                    )}

                                    {selectedEntry.rejectionReason && (
                                        <div className="journal-detail-item">
                                            <span className="journal-detail-label">Rejection Reason:</span>
                                            <span className="journal-detail-value">{selectedEntry.rejectionReason}</span>
                                        </div>
                                    )}
                                </div>

                                {selectedEntry.entryLines && selectedEntry.entryLines.length > 0 && (
                                    <div className="journal-entry-lines-section">
                                        <h3>Entry Lines</h3>
                                        <div className="journal-entry-lines-list">
                                            <div className="journal-entry-line-header">
                                                <div>Description</div>
                                                <div>Debit</div>
                                                <div>Credit</div>
                                            </div>

                                            {selectedEntry.entryLines.map((line, index) => (
                                                <div key={index} className="journal-entry-line-item">
                                                    <div>{line.description || 'N/A'}</div>
                                                    <div>
                                                        {line.debit ? parseFloat(line.amount || 0).toFixed(2) : ''}
                                                    </div>
                                                    <div>
                                                        {!line.debit ? parseFloat(line.amount || 0).toFixed(2) : ''}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="journal-entry-totals">
                                                <div className="journal-total-item">
                                                    <span>Total Debits:</span>
                                                    <span className="journal-total-value">
                                                        {selectedEntry.entryLines.reduce((total, line) =>
                                                            total + (line.debit ? parseFloat(line.amount || 0) : 0), 0
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="journal-total-item">
                                                    <span>Total Credits:</span>
                                                    <span className="journal-total-value">
                                                        {selectedEntry.entryLines.reduce((total, line) =>
                                                            total + (!line.debit ? parseFloat(line.amount || 0) : 0), 0
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedEntry.status === 'PENDING' && isFinanceManager && (
                                    <div className="journal-form-actions">
                                        {/* Only show approve/reject buttons if user didn't create this entry */}
                                        {selectedEntry.createdBy !== currentUser?.username && selectedEntry.createdBy !== currentUser?.name ? (
                                            <>
                                                <button
                                                    className="journal-submit-button"
                                                    onClick={() => handleApproveEntry(selectedEntry.id)}
                                                >
                                                    <FaCheck /> Approve
                                                </button>
                                                <button
                                                    className="journal-cancel-button"
                                                    onClick={() => {
                                                        const reason = prompt('Enter reason for rejection:');
                                                        if (reason && reason.trim()) {
                                                            handleRejectEntry(selectedEntry.id, reason.trim());
                                                        }
                                                    }}
                                                >
                                                    <FaTimes /> Reject
                                                </button>
                                            </>
                                        ) : (
                                            <div className="journal-self-entry-notice">
                                                <p>⚠️ You cannot approve or reject your own journal entries.</p>
                                                <p>Another finance manager must review and approve this entry.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JournalEntries;