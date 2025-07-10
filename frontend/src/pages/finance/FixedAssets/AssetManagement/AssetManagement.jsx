import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaPlus, FaCalculator, FaTimes, FaCalendarAlt, FaDollarSign, FaBarcode, FaInfoCircle } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import './AssetManagement.css';

const AssetManagement = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cost: '',
        purchaseDate: '',
        depreciationStartDate: '',
        usefulLifeYears: '',
        depreciationMethod: '',
        salvageValue: '',
        serialNumber: '',
        status: 'ACTIVE'
    });
    const [formLoading, setFormLoading] = useState(false);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:8080/api/v1/fixed-assets`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch assets');
            }

            const assetsData = await response.json();

            // For each asset, get its current book value
            const assetsWithBookValue = await Promise.all(
                assetsData.map(async (asset) => {
                    try {
                        const bookValueResponse = await fetch(
                            `http://localhost:8080/api/v1/fixed-assets/${asset.id}/book-value`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        const bookValue = bookValueResponse.ok ? await bookValueResponse.json() : 0;

                        return {
                            ...asset,
                            currentBookValue: bookValue
                        };
                    } catch (error) {
                        console.error(`Error fetching book value for asset ${asset.id}:`, error);
                        return {
                            ...asset,
                            currentBookValue: 0
                        };
                    }
                })
            );

            setAssets(assetsWithBookValue);
        } catch (error) {
            console.error('Error fetching assets:', error);
            showError('Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssetDetails = async (assetId) => {
        try {
            const [assetResponse, monthlyDepResponse, accumulatedDepResponse] = await Promise.all([
                fetch(`http://localhost:8080/api/v1/fixed-assets/${assetId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`http://localhost:8080/api/v1/fixed-assets/${assetId}/depreciation/monthly`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`http://localhost:8080/api/v1/fixed-assets/${assetId}/depreciation/accumulated`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            const assetData = assetResponse.ok ? await assetResponse.json() : null;
            const monthlyDep = monthlyDepResponse.ok ? await monthlyDepResponse.json() : 0;
            const accumulatedDep = accumulatedDepResponse.ok ? await accumulatedDepResponse.json() : 0;

            return {
                ...assetData,
                monthlyDepreciation: monthlyDep,
                accumulatedDepreciation: accumulatedDep
            };
        } catch (error) {
            console.error('Error fetching asset details:', error);
            return null;
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            cost: '',
            purchaseDate: '',
            depreciationStartDate: '',
            usefulLifeYears: '',
            depreciationMethod: '',
            salvageValue: '',
            serialNumber: '',
            status: 'ACTIVE'
        });
    };

    const populateForm = (asset) => {
        setFormData({
            name: asset.name || '',
            description: asset.description || '',
            cost: asset.cost || '',
            purchaseDate: asset.purchaseDate || '',
            depreciationStartDate: asset.depreciationStartDate || '',
            usefulLifeYears: asset.usefulLifeYears || '',
            depreciationMethod: asset.depreciationMethod || '',
            salvageValue: asset.salvageValue || '',
            serialNumber: asset.serialNumber || '',
            status: asset.status || 'ACTIVE'
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const errors = [];

        if (!formData.name.trim()) errors.push('Asset name is required');
        if (!formData.cost || formData.cost <= 0) errors.push('Valid cost is required');
        if (!formData.purchaseDate) errors.push('Purchase date is required');
        if (!formData.depreciationStartDate) errors.push('Depreciation start date is required');
        if (!formData.usefulLifeYears || formData.usefulLifeYears <= 0) errors.push('Valid useful life is required');
        if (!formData.depreciationMethod) errors.push('Depreciation method is required');
        if (!formData.status) errors.push('Status is required');

        return errors;
    };

    const handleSaveAsset = async () => {
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            showError(validationErrors.join(', '));
            return;
        }

        try {
            setFormLoading(true);

            const requestData = {
                name: formData.name,
                description: formData.description,
                cost: parseFloat(formData.cost),
                purchaseDate: formData.purchaseDate,
                depreciationStartDate: formData.depreciationStartDate,
                usefulLifeYears: parseInt(formData.usefulLifeYears),
                depreciationMethod: formData.depreciationMethod,
                salvageValue: formData.salvageValue ? parseFloat(formData.salvageValue) : null,
                serialNumber: formData.serialNumber,
                status: formData.status
            };

            const url = selectedAsset
                ? `http://localhost:8080/api/v1/fixed-assets/${selectedAsset.id}`
                : `http://localhost:8080/api/v1/fixed-assets`;

            const method = selectedAsset ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Failed to ${selectedAsset ? 'update' : 'create'} asset`);
            }

            const savedAsset = await response.json();

            if (selectedAsset) {
                setAssets(prev => prev.map(asset =>
                    asset.id === selectedAsset.id ? { ...savedAsset, currentBookValue: 0 } : asset
                ));
                showSuccess(`Asset "${formData.name}" updated successfully`);
            } else {
                setAssets(prev => [...prev, { ...savedAsset, currentBookValue: savedAsset.cost }]);
                showSuccess(`Asset "${formData.name}" created successfully`);
            }

            setShowAddModal(false);
            setSelectedAsset(null);
            resetForm();
        } catch (error) {
            console.error('Error saving asset:', error);
            showError(`Failed to ${selectedAsset ? 'update' : 'create'} asset`);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteAsset = async (asset) => {
        if (!window.confirm(`Are you sure you want to delete ${asset.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/v1/fixed-assets/${asset.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete asset');
            }

            setAssets(prev => prev.filter(a => a.id !== asset.id));
            showSuccess(`${asset.name} deleted successfully`);
        } catch (error) {
            console.error('Error deleting asset:', error);
            showError('Failed to delete asset');
        }
    };

    const handleCalculateDepreciation = async (asset) => {
        try {
            const [monthlyResponse, accumulatedResponse] = await Promise.all([
                fetch(`http://localhost:8080/api/v1/fixed-assets/${asset.id}/depreciation/monthly`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`http://localhost:8080/api/v1/fixed-assets/${asset.id}/depreciation/accumulated`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            if (monthlyResponse.ok && accumulatedResponse.ok) {
                const monthlyDep = await monthlyResponse.json();
                const accumulatedDep = await accumulatedResponse.json();

                showSuccess(
                    `Depreciation calculated for ${asset.name}:\n` +
                    `Monthly: $${monthlyDep.toLocaleString()}\n` +
                    `Accumulated: $${accumulatedDep.toLocaleString()}`
                );
            } else {
                throw new Error('Failed to calculate depreciation');
            }
        } catch (error) {
            console.error('Error calculating depreciation:', error);
            showError('Failed to calculate depreciation');
        }
    };

    const handleRowClick = async (row) => {
        const detailedAsset = await fetchAssetDetails(row.id);
        if (detailedAsset) {
            setSelectedAsset(detailedAsset);
            setShowDetailsModal(true);
        } else {
            showError('Failed to load asset details');
        }
    };

    const columns = [
        {
            id: 'name',
            header: 'Asset Name',
            accessor: 'name',
            minWidth: '200px',
            flexWeight: 3
        },
        {
            id: 'cost',
            header: 'Cost',
            accessor: 'cost',
            minWidth: '130px',
            flexWeight: 1,
            render: (row, value) => `$${value ? value.toLocaleString() : '0'}`
        },
        {
            id: 'purchaseDate',
            header: 'Purchase Date',
            accessor: 'purchaseDate',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'status',
            minWidth: '100px',
            flexWeight: 1,
            render: (row, value) => (
                <span className={`asset-management__status-badge asset-management__status-${value ? value.toLowerCase() : 'unknown'}`}>
                    {value || 'UNKNOWN'}
                </span>
            )
        },
        {
            id: 'currentBookValue',
            header: 'Book Value',
            accessor: 'currentBookValue',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => `$${value ? value.toLocaleString() : '0'}`
        },
        {
            id: 'site',
            header: 'Site',
            accessor: 'site.name',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => value || 'N/A'
        }
    ];

    const filterableColumns = [
        { accessor: 'status', header: 'Status', filterType: 'select' },
        { accessor: 'site.name', header: 'Site', filterType: 'select' },
        { accessor: 'name', header: 'Asset Name', filterType: 'text' }
    ];

    const actions = [
        // {
        //     label: 'View Details',
        //     icon: <FaEye />,
        //     className: 'view',
        //     onClick: handleRowClick
        // },
        {
            label: 'Calculate Depreciation',
            icon: <FaCalculator />,
            className: 'primary',
            onClick: handleCalculateDepreciation
        },
        {
            label: 'Edit Asset',
            icon: <FaEdit />,
            className: 'edit',
            onClick: (row) => {
                setSelectedAsset(row);
                populateForm(row);
                setShowAddModal(true);
            }
        },
        {
            label: 'Delete Asset',
            icon: <FaTrash />,
            className: 'delete',
            onClick: handleDeleteAsset,
            isDisabled: (row) => row.status === 'DISPOSED'
        }
    ];

    const handleAddAsset = () => {
        setSelectedAsset(null);
        resetForm();
        setShowAddModal(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (value) => {
        if (!value) return '$0.00';
        return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return '#10b981';
            case 'inactive': return '#6b7280';
            case 'maintenance': return '#f59e0b';
            case 'disposed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div className="asset-management">
            <DataTable
                data={assets}
                columns={columns}
                loading={loading}
                tableTitle="Fixed Assets Management"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                actions={actions}
                showAddButton={true}
                addButtonText="Add New Asset"
                addButtonIcon={<FaPlus />}
                onAddClick={handleAddAsset}
                emptyMessage="No fixed assets found. Start by adding your first asset."
                onRowClick={handleRowClick}
            />

            {/* Asset Details Modal */}
            {showDetailsModal && selectedAsset && (
                <div className="asset-management__modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="asset-management__modal-content asset-management__modal-content--large" onClick={(e) => e.stopPropagation()}>
                        <div className="asset-management__modal-header">
                            <h3 className="asset-management__modal-title">
                                Asset Details - {selectedAsset.name}
                            </h3>
                            <button
                                className="asset-management__modal-close"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="asset-management__modal-body">
                            <div className="asset-management__details-grid">
                                {/* Basic Information */}
                                <div className="asset-management__details-section">
                                    <h4 className="asset-management__details-section-title">
                                        <FaInfoCircle /> Basic Information
                                    </h4>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Asset Name:</span>
                                        <span className="asset-management__details-value">{selectedAsset.name}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Description:</span>
                                        <span className="asset-management__details-value">{selectedAsset.description || 'No description provided'}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Status:</span>
                                        <span
                                            className="asset-management__details-value"
                                            style={{
                                                color: getStatusColor(selectedAsset.status),
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {selectedAsset.status}
                                        </span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Serial Number:</span>
                                        <span className="asset-management__details-value">{selectedAsset.serialNumber || 'N/A'}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Site:</span>
                                        <span className="asset-management__details-value">{selectedAsset.site?.name || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Financial Information */}
                                <div className="asset-management__details-section">
                                    <h4 className="asset-management__details-section-title">
                                        <FaDollarSign /> Financial Information
                                    </h4>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Purchase Cost:</span>
                                        <span className="asset-management__details-value">{formatCurrency(selectedAsset.cost)}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Salvage Value:</span>
                                        <span className="asset-management__details-value">{formatCurrency(selectedAsset.salvageValue)}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Current Book Value:</span>
                                        <span className="asset-management__details-value" style={{ color: '#10b981', fontWeight: 'bold' }}>
                                            {formatCurrency(selectedAsset.currentBookValue)}
                                        </span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Monthly Depreciation:</span>
                                        <span className="asset-management__details-value">{formatCurrency(selectedAsset.monthlyDepreciation)}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Accumulated Depreciation:</span>
                                        <span className="asset-management__details-value">{formatCurrency(selectedAsset.accumulatedDepreciation)}</span>
                                    </div>
                                </div>

                                {/* Depreciation Information */}
                                <div className="asset-management__details-section">
                                    <h4 className="asset-management__details-section-title">
                                        <FaCalculator /> Depreciation Information
                                    </h4>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Depreciation Method:</span>
                                        <span className="asset-management__details-value">{selectedAsset.depreciationMethod?.replace('_', ' ') || 'N/A'}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Useful Life:</span>
                                        <span className="asset-management__details-value">{selectedAsset.usefulLifeYears} years</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Depreciation Start Date:</span>
                                        <span className="asset-management__details-value">{formatDate(selectedAsset.depreciationStartDate)}</span>
                                    </div>
                                </div>

                                {/* Date Information */}
                                <div className="asset-management__details-section">
                                    <h4 className="asset-management__details-section-title">
                                        <FaCalendarAlt /> Date Information
                                    </h4>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Purchase Date:</span>
                                        <span className="asset-management__details-value">{formatDate(selectedAsset.purchaseDate)}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Created Date:</span>
                                        <span className="asset-management__details-value">{formatDate(selectedAsset.createdDate)}</span>
                                    </div>
                                    <div className="asset-management__details-row">
                                        <span className="asset-management__details-label">Last Updated:</span>
                                        <span className="asset-management__details-value">{formatDate(selectedAsset.updatedDate)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="asset-management__modal-actions">
                            <button
                                className="asset-management__btn asset-management__btn--secondary"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                Close
                            </button>
                            <button
                                className="asset-management__btn asset-management__btn--primary"
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    populateForm(selectedAsset);
                                    setShowAddModal(true);
                                }}
                            >
                                Edit Asset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="asset-management__modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="asset-management__modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="asset-management__modal-header">
                            <h3 className="asset-management__modal-title">
                                {selectedAsset ? 'Edit Asset' : 'Add New Asset'}
                            </h3>
                            <button
                                className="asset-management__modal-close"
                                onClick={() => setShowAddModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="asset-management__modal-body">
                            <form className="asset-management__form">
                                <div className="asset-management__form-grid">
                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Asset Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="asset-management__form-input"
                                            placeholder="Enter asset name"
                                            required
                                        />
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Cost *
                                        </label>
                                        <input
                                            type="number"
                                            name="cost"
                                            value={formData.cost}
                                            onChange={handleInputChange}
                                            className="asset-management__form-input"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Purchase Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="purchaseDate"
                                            value={formData.purchaseDate}
                                            onChange={handleInputChange}
                                            className="asset-management__form-input"
                                            required
                                        />
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Depreciation Start Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="depreciationStartDate"
                                            value={formData.depreciationStartDate}
                                            onChange={handleInputChange}
                                            className="asset-management__form-input"
                                            required
                                        />
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Useful Life (Years) *
                                        </label>
                                        <input
                                            type="number"
                                            name="usefulLifeYears"
                                            value={formData.usefulLifeYears}
                                            onChange={handleInputChange}
                                            className="asset-management__form-input"
                                            placeholder="Years"
                                            min="1"
                                            max="100"
                                            required
                                        />
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Depreciation Method *
                                        </label>
                                        <select
                                            name="depreciationMethod"
                                            value={formData.depreciationMethod}
                                            onChange={handleInputChange}
                                            className="asset-management__form-select"
                                            required
                                        >
                                            <option value="">Select depreciation method</option>
                                            <option value="STRAIGHT_LINE">Straight Line</option>
                                            <option value="DECLINING_BALANCE">Declining Balance</option>
                                        </select>
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Status *
                                        </label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            className="asset-management__form-select"
                                            required
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="DISPOSED">Disposed</option>
                                        </select>
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Salvage Value
                                        </label>
                                        <input
                                            type="number"
                                            name="salvageValue"
                                            value={formData.salvageValue}
                                            onChange={handleInputChange}
                                            className="asset-management__form-input"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="asset-management__form-group">
                                        <label className="asset-management__form-label">
                                            Serial Number
                                        </label>
                                        <input
                                            type="text"
                                            name="serialNumber"
                                            value={formData.serialNumber}
                                            onChange={handleInputChange}
                                            className="asset-management__form-input"
                                            placeholder="Enter serial number"
                                        />
                                    </div>

                                    <div className="asset-management__form-group asset-management__form-group--full">
                                        <label className="asset-management__form-label">
                                            Description
                                        </label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            className="asset-management__form-textarea"
                                            placeholder="Enter asset description"
                                            rows="3"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="asset-management__modal-actions">
                            <button
                                className="asset-management__btn asset-management__btn--secondary"
                                onClick={() => setShowAddModal(false)}
                                disabled={formLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="asset-management__btn asset-management__btn--primary"
                                onClick={handleSaveAsset}
                                disabled={formLoading}
                            >
                                {formLoading ? 'Saving...' : (selectedAsset ? 'Update Asset' : 'Create Asset')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetManagement;