import React, { useState, useEffect } from 'react';
import { FaCalculator, FaEye, FaFileDownload, FaTimes, FaInfoCircle, FaDollarSign, FaCalendarAlt, FaChartLine, FaClock } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import './DepreciationManagement.css';

const DepreciationManagement = () => {
    const [depreciationData, setDepreciationData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchDepreciationData();
    }, []);

    const fetchDepreciationData = async () => {
        try {
            setLoading(true);

            // Fetch all assets first
            const assetsResponse = await fetch(`http://localhost:8080/api/v1/fixed-assets`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!assetsResponse.ok) {
                throw new Error('Failed to fetch assets');
            }

            const assets = await assetsResponse.json();

            // For each asset, get depreciation data
            const depreciationPromises = assets.map(async (asset) => {
                try {
                    const [monthlyResponse, accumulatedResponse, bookValueResponse] = await Promise.all([
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
                        }),
                        fetch(`http://localhost:8080/api/v1/fixed-assets/${asset.id}/book-value`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                'Content-Type': 'application/json'
                            }
                        })
                    ]);

                    const monthlyDepreciation = monthlyResponse.ok ? await monthlyResponse.json() : 0;
                    const accumulatedDepreciation = accumulatedResponse.ok ? await accumulatedResponse.json() : 0;
                    const currentBookValue = bookValueResponse.ok ? await bookValueResponse.json() : 0;

                    return {
                        id: asset.id,
                        assetName: asset.name,
                        category: asset.category,
                        cost: asset.cost || 0,
                        purchaseDate: asset.purchaseDate,
                        usefulLifeYears: asset.usefulLifeYears,
                        depreciationMethod: asset.depreciationMethod,
                        depreciationStartDate: asset.depreciationStartDate,
                        monthlyDepreciation: monthlyDepreciation,
                        accumulatedDepreciation: accumulatedDepreciation,
                        currentBookValue: currentBookValue,
                        status: asset.status,
                        salvageValue: asset.salvageValue,
                        serialNumber: asset.serialNumber,
                        description: asset.description,
                        site: asset.site,
                        createdDate: asset.createdDate,
                        updatedDate: asset.updatedDate
                    };
                } catch (error) {
                    console.error(`Error fetching depreciation data for asset ${asset.id}:`, error);
                    return {
                        id: asset.id,
                        assetName: asset.name,
                        category: asset.category,
                        cost: asset.cost || 0,
                        purchaseDate: asset.purchaseDate,
                        usefulLifeYears: asset.usefulLifeYears,
                        depreciationMethod: asset.depreciationMethod,
                        depreciationStartDate: asset.depreciationStartDate,
                        monthlyDepreciation: 0,
                        accumulatedDepreciation: 0,
                        currentBookValue: 0,
                        status: asset.status,
                        salvageValue: asset.salvageValue,
                        serialNumber: asset.serialNumber,
                        description: asset.description,
                        site: asset.site,
                        createdDate: asset.createdDate,
                        updatedDate: asset.updatedDate
                    };
                }
            });

            const depreciationResults = await Promise.all(depreciationPromises);
            setDepreciationData(depreciationResults);

        } catch (error) {
            console.error('Error fetching depreciation data:', error);
            showError('Failed to load depreciation data');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssetDepreciationDetails = async (assetId) => {
        try {
            const [assetResponse, monthlyResponse, accumulatedResponse, bookValueResponse] = await Promise.all([
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
                }),
                fetch(`http://localhost:8080/api/v1/fixed-assets/${assetId}/book-value`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            const assetData = assetResponse.ok ? await assetResponse.json() : null;
            const monthlyDep = monthlyResponse.ok ? await monthlyResponse.json() : 0;
            const accumulatedDep = accumulatedResponse.ok ? await accumulatedResponse.json() : 0;
            const bookValue = bookValueResponse.ok ? await bookValueResponse.json() : 0;

            return {
                ...assetData,
                monthlyDepreciation: monthlyDep,
                accumulatedDepreciation: accumulatedDep,
                currentBookValue: bookValue
            };
        } catch (error) {
            console.error('Error fetching asset depreciation details:', error);
            return null;
        }
    };

    const handleRecalculateDepreciation = async (asset) => {
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

                // Update the specific asset in the data
                setDepreciationData(prev => prev.map(item =>
                    item.id === asset.id
                        ? { ...item, monthlyDepreciation: monthlyDep, accumulatedDepreciation: accumulatedDep }
                        : item
                ));

                showSuccess(
                    `Depreciation recalculated for ${asset.assetName}:\n` +
                    `Monthly: $${monthlyDep.toLocaleString()}\n` +
                    `Accumulated: $${accumulatedDep.toLocaleString()}`
                );
            } else {
                throw new Error('Failed to recalculate depreciation');
            }
        } catch (error) {
            console.error('Error recalculating depreciation:', error);
            showError('Failed to recalculate depreciation');
        }
    };

    const handleRowClick = async (row) => {
        const detailedAsset = await fetchAssetDepreciationDetails(row.id);
        if (detailedAsset) {
            setSelectedAsset(detailedAsset);
            setShowDetailsModal(true);
        } else {
            showError('Failed to load asset depreciation details');
        }
    };

    const columns = [
        {
            id: 'assetName',
            header: 'Asset Name',
            accessor: 'assetName',
            minWidth: '200px',
            flexWeight: 3
        },
        {
            id: 'cost',
            header: 'Cost',
            accessor: 'cost',
            minWidth: '130px',
            flexWeight: 1,
            render: (row, value) => `$${value.toLocaleString()}`
        },
        {
            id: 'depreciationMethod',
            header: 'Method',
            accessor: 'depreciationMethod',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => {
                switch(value) {
                    case 'STRAIGHT_LINE': return 'Straight Line';
                    case 'DECLINING_BALANCE': return 'Declining Balance';
                    default: return value || 'N/A';
                }
            }
        },
        {
            id: 'usefulLifeYears',
            header: 'Useful Life',
            accessor: 'usefulLifeYears',
            minWidth: '100px',
            flexWeight: 1,
            render: (row, value) => `${value} years`
        },
        {
            id: 'depreciationStartDate',
            header: 'Depreciation Start Date',
            accessor: 'depreciationStartDate',
            minWidth: '100px',
            flexWeight: 1,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            id: 'monthlyDepreciation',
            header: 'Monthly Depreciation',
            accessor: 'monthlyDepreciation',
            minWidth: '150px',
            flexWeight: 1,
            render: (row, value) => (
                <span className="depreciation-management__depreciation-amount">
                    ${value.toLocaleString()}
                </span>
            )
        },
        {
            id: 'accumulatedDepreciation',
            header: 'Accumulated',
            accessor: 'accumulatedDepreciation',
            minWidth: '130px',
            flexWeight: 1,
            render: (row, value) => (
                <span className="depreciation-management__accumulated-amount">
                    ${value.toLocaleString()}
                </span>
            )
        },
        {
            id: 'currentBookValue',
            header: 'Book Value',
            accessor: 'currentBookValue',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => (
                <span className="depreciation-management__book-value-amount">
                    ${value.toLocaleString()}
                </span>
            )
        }
    ];

    const filterableColumns = [
        { accessor: 'category', header: 'Category', filterType: 'select' },
        { accessor: 'depreciationMethod', header: 'Method', filterType: 'select' },
        { accessor: 'status', header: 'Status', filterType: 'select' },
        { accessor: 'assetName', header: 'Asset Name', filterType: 'text' }
    ];

    const actions = [
        // {
        //     label: 'View Details',
        //     icon: <FaEye />,
        //     className: 'view',
        //     onClick: handleRowClick
        // },
        // {
        //     label: 'Recalculate',
        //     icon: <FaCalculator />,
        //     className: 'primary',
        //     onClick: handleRecalculateDepreciation
        // },
        // {
        //     label: 'Export Report',
        //     icon: <FaFileDownload />,
        //     className: 'approve',
        //     onClick: (row) => {
        //         showSuccess(`Exporting depreciation report for ${row.assetName}`);
        //     }
        // }
    ];

    const calculateTotalMonthlyDepreciation = () => {
        return depreciationData.reduce((total, asset) => total + (asset.monthlyDepreciation || 0), 0);
    };

    const calculateTotalAccumulatedDepreciation = () => {
        return depreciationData.reduce((total, asset) => total + (asset.accumulatedDepreciation || 0), 0);
    };

    const calculateTotalBookValue = () => {
        return depreciationData.reduce((total, asset) => total + (asset.currentBookValue || 0), 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (value) => {
        if (!value && value !== 0) return '$0.00';
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

    const calculateDepreciationRate = (asset) => {
        if (!asset.usefulLifeYears || asset.usefulLifeYears === 0) return 0;
        return ((1 / asset.usefulLifeYears) * 100).toFixed(2);
    };

    const calculateRemainingLife = (asset) => {
        if (!asset.depreciationStartDate || !asset.usefulLifeYears) return 'N/A';

        const startDate = new Date(asset.depreciationStartDate);
        const currentDate = new Date();
        const yearsElapsed = (currentDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
        const remainingYears = Math.max(0, asset.usefulLifeYears - yearsElapsed);

        return `${remainingYears.toFixed(1)} years`;
    };

    const calculateDepreciationProgress = (asset) => {
        if (!asset.cost || asset.cost === 0) return 0;
        return ((asset.accumulatedDepreciation / asset.cost) * 100).toFixed(1);
    };

    return (
        <div className="depreciation-management">
            {/* Summary Cards */}
            <div className="depreciation-management__summary">
                <div className="depreciation-management__summary-card depreciation-management__summary-card--monthly">
                    <h3 className="depreciation-management__summary-title">Total Monthly Depreciation</h3>
                    <p className="depreciation-management__summary-amount">
                        ${calculateTotalMonthlyDepreciation().toLocaleString()}
                    </p>
                </div>
                <div className="depreciation-management__summary-card depreciation-management__summary-card--accumulated">
                    <h3 className="depreciation-management__summary-title">Total Accumulated Depreciation</h3>
                    <p className="depreciation-management__summary-amount">
                        ${calculateTotalAccumulatedDepreciation().toLocaleString()}
                    </p>
                </div>
                <div className="depreciation-management__summary-card depreciation-management__summary-card--book-value">
                    <h3 className="depreciation-management__summary-title">Total Current Book Value</h3>
                    <p className="depreciation-management__summary-amount">
                        ${calculateTotalBookValue().toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Depreciation Table */}
            <DataTable
                data={depreciationData}
                columns={columns}
                loading={loading}
                tableTitle="Asset Depreciation Schedule"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                actions={actions}
                emptyMessage="No depreciation data available."
                onRowClick={handleRowClick}
            />

            {/* Depreciation Details Modal */}
            {showDetailsModal && selectedAsset && (
                <div className="depreciation-management__modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="depreciation-management__modal-content depreciation-management__modal-content--large" onClick={(e) => e.stopPropagation()}>
                        <div className="depreciation-management__modal-header">
                            <h3 className="depreciation-management__modal-title">
                                Depreciation Details - {selectedAsset.name}
                            </h3>
                            <button
                                className="depreciation-management__modal-close"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="depreciation-management__modal-body">
                            <div className="depreciation-management__details-grid">
                                {/* Asset Information */}
                                <div className="depreciation-management__details-section">
                                    <h4 className="depreciation-management__details-section-title">
                                        <FaInfoCircle /> Asset Information
                                    </h4>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Asset Name:</span>
                                        <span className="depreciation-management__details-value">{selectedAsset.name}</span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Serial Number:</span>
                                        <span className="depreciation-management__details-value">{selectedAsset.serialNumber || 'N/A'}</span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Status:</span>
                                        <span
                                            className="depreciation-management__details-value"
                                            style={{
                                                color: getStatusColor(selectedAsset.status),
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {selectedAsset.status}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Site:</span>
                                        <span className="depreciation-management__details-value">{selectedAsset.site?.name || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Financial Information */}
                                <div className="depreciation-management__details-section">
                                    <h4 className="depreciation-management__details-section-title">
                                        <FaDollarSign /> Financial Information
                                    </h4>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Original Cost:</span>
                                        <span className="depreciation-management__details-value">{formatCurrency(selectedAsset.cost)}</span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Salvage Value:</span>
                                        <span className="depreciation-management__details-value">{formatCurrency(selectedAsset.salvageValue)}</span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Current Book Value:</span>
                                        <span className="depreciation-management__details-value" style={{ color: '#10b981', fontWeight: 'bold' }}>
                                            {formatCurrency(selectedAsset.currentBookValue)}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Depreciable Amount:</span>
                                        <span className="depreciation-management__details-value">
                                            {formatCurrency((selectedAsset.cost || 0) - (selectedAsset.salvageValue || 0))}
                                        </span>
                                    </div>
                                </div>

                                {/* Depreciation Calculations */}
                                <div className="depreciation-management__details-section">
                                    <h4 className="depreciation-management__details-section-title">
                                        <FaChartLine /> Depreciation Calculations
                                    </h4>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Monthly Depreciation:</span>
                                        <span className="depreciation-management__details-value" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                                            {formatCurrency(selectedAsset.monthlyDepreciation)}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Accumulated Depreciation:</span>
                                        <span className="depreciation-management__details-value" style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                            {formatCurrency(selectedAsset.accumulatedDepreciation)}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Depreciation Rate:</span>
                                        <span className="depreciation-management__details-value">
                                            {calculateDepreciationRate(selectedAsset)}% per year
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Depreciation Progress:</span>
                                        <span className="depreciation-management__details-value">
                                            {calculateDepreciationProgress(selectedAsset)}% completed
                                        </span>
                                    </div>
                                </div>

                                {/* Depreciation Method & Timeline */}
                                <div className="depreciation-management__details-section">
                                    <h4 className="depreciation-management__details-section-title">
                                        <FaClock /> Depreciation Method & Timeline
                                    </h4>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Depreciation Method:</span>
                                        <span className="depreciation-management__details-value">
                                            {selectedAsset.depreciationMethod?.replace('_', ' ') || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Useful Life:</span>
                                        <span className="depreciation-management__details-value">
                                            {selectedAsset.usefulLifeYears} years
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Depreciation Start Date:</span>
                                        <span className="depreciation-management__details-value">
                                            {formatDate(selectedAsset.depreciationStartDate)}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Remaining Life:</span>
                                        <span className="depreciation-management__details-value">
                                            {calculateRemainingLife(selectedAsset)}
                                        </span>
                                    </div>
                                </div>

                                {/* Date Information */}
                                <div className="depreciation-management__details-section">
                                    <h4 className="depreciation-management__details-section-title">
                                        <FaCalendarAlt /> Date Information
                                    </h4>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Purchase Date:</span>
                                        <span className="depreciation-management__details-value">
                                            {formatDate(selectedAsset.purchaseDate)}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Created Date:</span>
                                        <span className="depreciation-management__details-value">
                                            {formatDate(selectedAsset.createdDate)}
                                        </span>
                                    </div>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Last Updated:</span>
                                        <span className="depreciation-management__details-value">
                                            {formatDate(selectedAsset.updatedDate)}
                                        </span>
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="depreciation-management__details-section depreciation-management__details-section--full">
                                    <h4 className="depreciation-management__details-section-title">
                                        <FaInfoCircle /> Additional Information
                                    </h4>
                                    <div className="depreciation-management__details-row">
                                        <span className="depreciation-management__details-label">Description:</span>
                                        <span className="depreciation-management__details-value">
                                            {selectedAsset.description || 'No description provided'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="depreciation-management__modal-actions">
                            <button
                                className="depreciation-management__btn depreciation-management__btn--secondary"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                Close
                            </button>
                            <button
                                className="depreciation-management__btn depreciation-management__btn--primary"
                                onClick={() => handleRecalculateDepreciation(selectedAsset)}
                            >
                                Recalculate Depreciation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepreciationManagement;