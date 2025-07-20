import React, { useState, useEffect } from 'react';
import { FaTrash, FaEye, FaPlus, FaFileDownload, FaTimes, FaInfoCircle, FaDollarSign, FaCalendarAlt, FaChartLine, FaUser, FaClipboardList, FaFile } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';
import './DisposalManagement.css';

const DisposalManagement = () => {
    const [disposalData, setDisposalData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDisposeModal, setShowDisposeModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDisposal, setSelectedDisposal] = useState(null);
    const [availableAssets, setAvailableAssets] = useState([]);
    const [formData, setFormData] = useState({
        assetId: '',
        disposalDate: '',
        disposalMethod: '',
        saleAmount: '',
        disposalReason: '',
        notes: ''
    });
    const [formLoading, setFormLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchDisposalData();
        fetchAvailableAssets();
    }, []);

    const fetchDisposalData = async () => {
        try {
            setLoading(true);
            const response = await financeService.fixedAssets.getAllDisposals();
            setDisposalData(response.data);
        } catch (error) {
            console.error('Error fetching disposal data:', error);
            showError('Failed to load disposal data');
        } finally {
            setLoading(false);
        }
    };

    const fetchDisposalDetails = async (disposalId) => {
        try {
            // For now, we'll use the existing disposal data since there's no specific endpoint for detailed disposal
            const disposal = disposalData.find(d => d.id === disposalId);
            if (disposal) {
                // Fetch additional asset details if needed
                const assetResponse = await financeService.fixedAssets.getById(disposal.assetId);
                return {
                    ...disposal,
                    assetDetails: assetResponse.data
                };
            }
            return disposal;
        } catch (error) {
            console.error('Error fetching disposal details:', error);
            return null;
        }
    };

    const fetchAvailableAssets = async () => {
        try {
            const response = await financeService.fixedAssets.getAll();
            const assets = response.data;
            // Filter only active assets that can be disposed
            const activeAssets = assets.filter(asset =>
                asset.status === 'ACTIVE' || asset.status === 'INACTIVE'
            );
            setAvailableAssets(activeAssets);
        } catch (error) {
            console.error('Error fetching available assets:', error);
            showError('Failed to load available assets');
        }
    };

    const resetForm = () => {
        setFormData({
            assetId: '',
            disposalDate: '',
            disposalMethod: '',
            saleAmount: '',
            disposalReason: '',
            notes: ''
        });
        setSelectedFile(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const validateForm = () => {
        const errors = [];

        if (!formData.assetId) errors.push('Asset is required');
        if (!formData.disposalDate) errors.push('Disposal date is required');
        if (!formData.disposalMethod) errors.push('Disposal method is required');
        if (!formData.disposalReason) errors.push('Disposal reason is required');

        return errors;
    };

    const handleDisposeAsset = async () => {
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            showError(validationErrors.join(', '));
            return;
        }

        try {
            setFormLoading(true);

            // Create the disposal data object - DON'T include assetId, controller sets it from URL
            const disposalRequestData = {
                disposalDate: formData.disposalDate,
                disposalMethod: formData.disposalMethod,
                saleAmount: formData.saleAmount ? parseFloat(formData.saleAmount) : null,
                disposalReason: formData.disposalReason,
                notes: formData.notes || null
            };

            console.log('=== DEBUGGING DISPOSAL REQUEST ===');
            console.log('Form Data:', formData);
            console.log('Disposal Request Data:', disposalRequestData);
            console.log('Selected File:', selectedFile);
            console.log('Asset ID from URL:', formData.assetId);

            // Create FormData for multipart request
            const formDataToSend = new FormData();

            // The controller expects "disposalData" as the JSON parameter name
            formDataToSend.append('disposalData', JSON.stringify(disposalRequestData));

            // Add document if provided (the controller expects "document" as parameter name)
            if (selectedFile) {
                formDataToSend.append('document', selectedFile);
            }

            console.log('Sending disposal request:', {
                assetId: formData.assetId,
                disposalData: disposalRequestData,
                hasDocument: !!selectedFile
            });

            // Use the service method for disposal
            const result = await financeService.fixedAssets.dispose(formData.assetId, formDataToSend);
            console.log('Disposal successful:', result);

            // Refresh disposal data
            await fetchDisposalData();
            await fetchAvailableAssets();

            showSuccess('Asset disposed successfully');
            setShowDisposeModal(false);
            resetForm();
        } catch (error) {
            console.error('Error disposing asset:', error);
            showError(`Failed to dispose asset: ${error.message}`);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDownloadDocument = async (disposal) => {
        if (!disposal.documentPath) {
            showError('No document available for this disposal');
            return;
        }

        try {
            // Create a link to download the document
            window.open(disposal.documentPath, '_blank');
            showSuccess(`Downloading disposal document for ${disposal.assetName}`);
        } catch (error) {
            console.error('Error downloading document:', error);
            showError('Failed to download document');
        }
    };

    const handleRowClick = async (row) => {
        const detailedDisposal = await fetchDisposalDetails(row.id);
        if (detailedDisposal) {
            setSelectedDisposal(detailedDisposal);
            setShowDetailsModal(true);
        } else {
            showError('Failed to load disposal details');
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
            id: 'disposalDate',
            header: 'Disposal Date',
            accessor: 'disposalDate',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            id: 'disposalMethod',
            header: 'Method',
            accessor: 'disposalMethod',
            minWidth: '100px',
            flexWeight: 1,
            render: (row, value) => (
                <span className={`disposal-management__method-badge disposal-management__method-${value ? value.toLowerCase() : 'unknown'}`}>
                    {value || 'UNKNOWN'}
                </span>
            )
        },
        {
            id: 'saleAmount',
            header: 'Sale Price',
            accessor: 'saleAmount',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => `$${(value || 0).toLocaleString()}`
        },
        {
            id: 'bookValueAtDisposal',
            header: 'Book Value',
            accessor: 'bookValueAtDisposal',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => `$${(value || 0).toLocaleString()}`
        },
        {
            id: 'gainLoss',
            header: 'Gain/Loss',
            accessor: 'gainLoss',
            minWidth: '120px',
            flexWeight: 1,
            render: (row, value) => {
                const amount = value || 0;
                return (
                    <span className={`disposal-management__gain-loss ${amount >= 0 ? 'disposal-management__gain-loss--gain' : 'disposal-management__gain-loss--loss'}`}>
                        {amount >= 0 ? '+' : ''}${amount.toLocaleString()}
                    </span>
                );
            }
        },
        {
            id: 'createdBy',
            header: 'Created By',
            accessor: 'createdBy',
            minWidth: '120px',
            flexWeight: 1
        }
    ];

    const filterableColumns = [
        { accessor: 'disposalMethod', header: 'Method', filterType: 'select' },
        { accessor: 'assetName', header: 'Asset Name', filterType: 'text' },
        { accessor: 'createdBy', header: 'Created By', filterType: 'text' }
    ];

    const actions = [
        // {
        //     label: 'View Details',
        //     icon: <FaEye />,
        //     className: 'view',
        //     onClick: handleRowClick
        // },
        {
            label: 'Download Document',
            icon: <FaFileDownload />,
            className: 'primary',
            onClick: handleDownloadDocument,
            isDisabled: (row) => !row.documentPath
        }
    ];

    const calculateTotalGainLoss = () => {
        return disposalData.reduce((total, disposal) => total + (disposal.gainLoss || 0), 0);
    };

    const calculateTotalSaleProceeds = () => {
        return disposalData.reduce((total, disposal) => total + (disposal.saleAmount || 0), 0);
    };

    const getProfitableDisposals = () => {
        return disposalData.filter(disposal => (disposal.gainLoss || 0) > 0).length;
    };

    const getLossDisposals = () => {
        return disposalData.filter(disposal => (disposal.gainLoss || 0) < 0).length;
    };

    const handleNewDisposal = () => {
        resetForm();
        setShowDisposeModal(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (value) => {
        if (!value && value !== 0) return '$0.00';
        return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getDisposalMethodLabel = (method) => {
        const methodLabels = {
            'SALE': 'Sale',
            'SCRAP': 'Scrap',
            'DONATION': 'Donation',
            'TRADE': 'Trade'
        };
        return methodLabels[method] || method;
    };

    const getDisposalReasonLabel = (reason) => {
        const reasonLabels = {
            'END_OF_LIFE': 'End of Life',
            'UPGRADE': 'Upgrade',
            'NO_LONGER_NEEDED': 'No Longer Needed',
            'DAMAGED': 'Damaged',
            'COST_REDUCTION': 'Cost Reduction',
            'REGULATORY': 'Regulatory',
            'OTHER': 'Other'
        };
        return reasonLabels[reason] || reason;
    };

    const getMethodColor = (method) => {
        switch (method?.toLowerCase()) {
            case 'sale': return '#10b981';
            case 'scrap': return '#ef4444';
            case 'donation': return '#3b82f6';
            case 'trade': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const calculateDisposalImpact = (disposal) => {
        if (!disposal.gainLoss) return 'Neutral';
        if (disposal.gainLoss > 0) return 'Profitable';
        return 'Loss';
    };

    return (
        <div className="disposal-management">
            {/* Summary Cards */}
            <div className="disposal-management__summary">
                <div className="disposal-management__summary-card disposal-management__summary-card--total-gain-loss">
                    <h3 className="disposal-management__summary-title">Total Gain/Loss</h3>
                    <p className="disposal-management__summary-amount">
                        {calculateTotalGainLoss() >= 0 ? '+' : ''}${calculateTotalGainLoss().toLocaleString()}
                    </p>
                </div>
                <div className="disposal-management__summary-card disposal-management__summary-card--sale-proceeds">
                    <h3 className="disposal-management__summary-title">Total Sale Proceeds</h3>
                    <p className="disposal-management__summary-amount">
                        ${calculateTotalSaleProceeds().toLocaleString()}
                    </p>
                </div>
                <div className="disposal-management__summary-card disposal-management__summary-card--profitable">
                    <h3 className="disposal-management__summary-title">Profitable Disposals</h3>
                    <p className="disposal-management__summary-amount">
                        {getProfitableDisposals()}
                    </p>
                </div>
                <div className="disposal-management__summary-card disposal-management__summary-card--loss">
                    <h3 className="disposal-management__summary-title">Loss Disposals</h3>
                    <p className="disposal-management__summary-amount">
                        {getLossDisposals()}
                    </p>
                </div>
            </div>

            {/* Disposal Table */}
            <DataTable
                data={disposalData}
                columns={columns}
                loading={loading}
                tableTitle="Asset Disposals"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                actions={actions}
                showAddButton={true}
                addButtonText="New Disposal"
                addButtonIcon={<FaTrash />}
                onAddClick={handleNewDisposal}
                emptyMessage="No asset disposals recorded."
                onRowClick={handleRowClick}
            />

            {/* Disposal Details Modal */}
            {showDetailsModal && selectedDisposal && (
                <div className="disposal-management__modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="disposal-management__modal-content disposal-management__modal-content--large" onClick={(e) => e.stopPropagation()}>
                        <div className="disposal-management__modal-header">
                            <h3 className="disposal-management__modal-title">
                                Disposal Details - {selectedDisposal.assetName}
                            </h3>
                            <button
                                className="disposal-management__modal-close"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="disposal-management__modal-body">
                            <div className="disposal-management__details-grid">
                                {/* Asset Information */}
                                <div className="disposal-management__details-section">
                                    <h4 className="disposal-management__details-section-title">
                                        <FaInfoCircle /> Asset Information
                                    </h4>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Asset Name:</span>
                                        <span className="disposal-management__details-value">{selectedDisposal.assetName}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Asset Category:</span>
                                        <span className="disposal-management__details-value">{selectedDisposal.assetDetails?.category || 'N/A'}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Serial Number:</span>
                                        <span className="disposal-management__details-value">{selectedDisposal.assetDetails?.serialNumber || 'N/A'}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Original Cost:</span>
                                        <span className="disposal-management__details-value">{formatCurrency(selectedDisposal.assetDetails?.cost)}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Purchase Date:</span>
                                        <span className="disposal-management__details-value">{formatDate(selectedDisposal.assetDetails?.purchaseDate)}</span>
                                    </div>
                                </div>

                                {/* Disposal Information */}
                                <div className="disposal-management__details-section">
                                    <h4 className="disposal-management__details-section-title">
                                        <FaClipboardList /> Disposal Information
                                    </h4>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Disposal Date:</span>
                                        <span className="disposal-management__details-value">{formatDate(selectedDisposal.disposalDate)}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Disposal Method:</span>
                                        <span
                                            className="disposal-management__details-value"
                                            style={{
                                                color: getMethodColor(selectedDisposal.disposalMethod),
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {getDisposalMethodLabel(selectedDisposal.disposalMethod)}
                                        </span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Disposal Reason:</span>
                                        <span className="disposal-management__details-value">{getDisposalReasonLabel(selectedDisposal.disposalReason)}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Disposal Impact:</span>
                                        <span
                                            className="disposal-management__details-value"
                                            style={{
                                                color: calculateDisposalImpact(selectedDisposal) === 'Profitable' ? '#10b981' :
                                                    calculateDisposalImpact(selectedDisposal) === 'Loss' ? '#ef4444' : '#6b7280',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {calculateDisposalImpact(selectedDisposal)}
                                        </span>
                                    </div>
                                </div>

                                {/* Financial Information */}
                                <div className="disposal-management__details-section">
                                    <h4 className="disposal-management__details-section-title">
                                        <FaDollarSign /> Financial Information
                                    </h4>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Sale Amount:</span>
                                        <span className="disposal-management__details-value">{formatCurrency(selectedDisposal.saleAmount)}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Book Value at Disposal:</span>
                                        <span className="disposal-management__details-value">{formatCurrency(selectedDisposal.bookValueAtDisposal)}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Gain/Loss:</span>
                                        <span
                                            className="disposal-management__details-value"
                                            style={{
                                                color: (selectedDisposal.gainLoss || 0) >= 0 ? '#10b981' : '#ef4444',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {(selectedDisposal.gainLoss || 0) >= 0 ? '+' : ''}{formatCurrency(selectedDisposal.gainLoss)}
                                        </span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Total Depreciation:</span>
                                        <span className="disposal-management__details-value">
                                            {formatCurrency((selectedDisposal.assetDetails?.cost || 0) - (selectedDisposal.bookValueAtDisposal || 0))}
                                        </span>
                                    </div>
                                </div>

                                {/* Administrative Information */}
                                <div className="disposal-management__details-section">
                                    <h4 className="disposal-management__details-section-title">
                                        <FaUser /> Administrative Information
                                    </h4>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Created By:</span>
                                        <span className="disposal-management__details-value">{selectedDisposal.createdBy || 'N/A'}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Created Date:</span>
                                        <span className="disposal-management__details-value">{formatDate(selectedDisposal.createdDate)}</span>
                                    </div>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Document Available:</span>
                                        <span className="disposal-management__details-value">
                                            {selectedDisposal.documentPath ? (
                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Yes</span>
                                            ) : (
                                                <span style={{ color: '#ef4444' }}>No</span>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Additional Notes */}
                                <div className="disposal-management__details-section disposal-management__details-section--full">
                                    <h4 className="disposal-management__details-section-title">
                                        <FaFile /> Additional Notes
                                    </h4>
                                    <div className="disposal-management__details-row">
                                        <span className="disposal-management__details-label">Notes:</span>
                                        <span className="disposal-management__details-value">
                                            {selectedDisposal.notes || 'No additional notes provided'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="disposal-management__modal-actions">
                            <button
                                className="disposal-management__btn disposal-management__btn--secondary"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                Close
                            </button>
                            {selectedDisposal.documentPath && (
                                <button
                                    className="disposal-management__btn disposal-management__btn--primary"
                                    onClick={() => handleDownloadDocument(selectedDisposal)}
                                >
                                    <FaFileDownload /> Download Document
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Disposal Modal */}
            {showDisposeModal && (
                <div className="disposal-management__modal-overlay" onClick={() => setShowDisposeModal(false)}>
                    <div className="disposal-management__modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="disposal-management__modal-header">
                            <h3 className="disposal-management__modal-title">Dispose Asset</h3>
                            <button
                                className="disposal-management__modal-close"
                                onClick={() => setShowDisposeModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="disposal-management__modal-body">
                            <form className="disposal-management__form">
                                <div className="disposal-management__form-grid">
                                    <div className="disposal-management__form-group">
                                        <label className="disposal-management__form-label">
                                            Asset *
                                        </label>
                                        <select
                                            name="assetId"
                                            value={formData.assetId}
                                            onChange={handleInputChange}
                                            className="disposal-management__form-select"
                                            required
                                        >
                                            <option value="">Select asset to dispose</option>
                                            {availableAssets.map(asset => (
                                                <option key={asset.id} value={asset.id}>
                                                    {asset.name} - {asset.category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="disposal-management__form-group">
                                        <label className="disposal-management__form-label">
                                            Disposal Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="disposalDate"
                                            value={formData.disposalDate}
                                            onChange={handleInputChange}
                                            className="disposal-management__form-input"
                                            required
                                        />
                                    </div>

                                    <div className="disposal-management__form-group">
                                        <label className="disposal-management__form-label">
                                            Disposal Method *
                                        </label>
                                        <select
                                            name="disposalMethod"
                                            value={formData.disposalMethod}
                                            onChange={handleInputChange}
                                            className="disposal-management__form-select"
                                            required
                                        >
                                            <option value="">Select disposal method</option>
                                            <option value="SALE">Sale</option>
                                            <option value="SCRAP">Scrap</option>
                                            <option value="DONATION">Donation</option>
                                            <option value="TRADE">Trade</option>
                                        </select>
                                    </div>

                                    <div className="disposal-management__form-group">
                                        <label className="disposal-management__form-label">
                                            Sale Price
                                        </label>
                                        <input
                                            type="number"
                                            name="saleAmount"
                                            value={formData.saleAmount}
                                            onChange={handleInputChange}
                                            className="disposal-management__form-input"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="disposal-management__form-group">
                                        <label className="disposal-management__form-label">
                                            Disposal Reason *
                                        </label>
                                        <select
                                            name="disposalReason"
                                            value={formData.disposalReason}
                                            onChange={handleInputChange}
                                            className="disposal-management__form-select"
                                            required
                                        >
                                            <option value="">Select disposal reason</option>
                                            <option value="END_OF_LIFE">End of Life</option>
                                            <option value="UPGRADE">Upgrade</option>
                                            <option value="NO_LONGER_NEEDED">No Longer Needed</option>
                                            <option value="DAMAGED">Damaged</option>
                                            <option value="COST_REDUCTION">Cost Reduction</option>
                                            <option value="REGULATORY">Regulatory</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>

                                    <div className="disposal-management__form-group disposal-management__form-group--full">
                                        <label className="disposal-management__form-label">
                                            Notes
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            className="disposal-management__form-textarea"
                                            placeholder="Additional notes"
                                            rows="3"
                                        />
                                    </div>

                                    <div className="disposal-management__form-group disposal-management__form-group--full">
                                        <label className="disposal-management__form-label">
                                            Supporting Document
                                        </label>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="disposal-management__form-file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        />
                                        <small className="disposal-management__form-help">
                                            Upload supporting documents (PDF, DOC, DOCX, JPG, PNG)
                                        </small>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="disposal-management__modal-actions">
                            <button
                                className="disposal-management__btn disposal-management__btn--secondary"
                                onClick={() => setShowDisposeModal(false)}
                                disabled={formLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="disposal-management__btn disposal-management__btn--primary"
                                onClick={handleDisposeAsset}
                                disabled={formLoading}
                            >
                                {formLoading ? 'Disposing...' : 'Dispose Asset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisposalManagement;