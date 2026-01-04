import React, { useState } from 'react';
import { FiX, FiUpload, FiFile, FiCheck, FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import './RFQImportDialog.scss';
import Snackbar from '../../../../../components/common/Snackbar/Snackbar';
import { rfqService } from '../../../../../services/procurement/rfqService';
import { offerService } from '../../../../../services/procurement/offerService';

const RFQImportDialog = ({ isVisible, onClose, offer, merchants, onSuccess, onShowSnackbar }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [merchantId, setMerchantId] = useState('');
    const [previewData, setPreviewData] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    // Snackbar
    const [snackbar, setSnackbar] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                showSnackbar('error', 'Please select a valid Excel file (.xlsx or .xls)');
                return;
            }

            setSelectedFile(file);
            setPreviewData(null);
            setSelectedRows([]);
        }
    };

    const handleUploadAndPreview = async () => {
        if (!selectedFile) {
            showSnackbar('error', 'Please select a file to upload');
            return;
        }

        if (!merchantId) {
            showSnackbar('error', 'Please select a merchant');
            return;
        }

        try {
            setIsUploading(true);

            // Upload and get preview
            const preview = await rfqService.importAndPreview(offer.id, selectedFile);
            setPreviewData(preview);

            // Auto-select all valid rows
            const validRowIds = preview.rows
                .filter(row => row.valid)
                .map(row => row.itemTypeId);
            setSelectedRows(validRowIds);

            showSnackbar('success', `Preview loaded: ${validRowIds.length} valid items found`);

        } catch (error) {
            console.error('Error uploading file:', error);
            showSnackbar('error', 'Failed to upload and preview file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRowToggle = (itemTypeId) => {
        if (selectedRows.includes(itemTypeId)) {
            setSelectedRows(selectedRows.filter(id => id !== itemTypeId));
        } else {
            setSelectedRows([...selectedRows, itemTypeId]);
        }
    };

    const handleSelectAllValid = () => {
        const validRowIds = previewData.rows
            .filter(row => row.valid)
            .map(row => row.itemTypeId);

        if (selectedRows.length === validRowIds.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(validRowIds);
        }
    };

    const handleConfirmImport = async () => {
        if (selectedRows.length === 0) {
            if (onShowSnackbar) {
                onShowSnackbar('error', 'Please select at least one row to import');
            }
            return;
        }

        try {
            setIsImporting(true);

            // Use rfqService to confirm import
            await rfqService.confirmImport(offer.id, merchantId, selectedRows, previewData);

            if (onShowSnackbar) {
                onShowSnackbar('success', `Successfully imported ${selectedRows.length} offer items`);
            }

            // Close dialog after short delay
            setTimeout(() => {
                handleClose();
                if (onSuccess) {
                    onSuccess();
                }
            }, 1500);

        } catch (error) {
            console.error('Error importing RFQ:', error);
            if (onShowSnackbar) {
                onShowSnackbar('error', 'Failed to import RFQ data');
            }
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setMerchantId('');
        setPreviewData(null);
        setSelectedRows([]);
        onClose();
    };

    const showSnackbar = (type, message) => {
        setSnackbar({ show: true, type, message });
    };

    const hideSnackbar = () => {
        setSnackbar({ ...snackbar, show: false });
    };

    if (!isVisible) return null;

    const validCount = previewData?.rows?.filter(row => row.valid).length || 0;
    const invalidCount = previewData?.rows?.filter(row => !row.valid).length || 0;

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content modal-xl rfq-import-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FiUpload />
                        Import RFQ Response
                    </h2>
                    <button className="btn-close" onClick={handleClose}>
                        <FiX />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="import-section">
                        {!previewData ? (
                            <>
                                {/* Upload Section */}
                                <div className="upload-area">
                                    <div className="section-info">
                                        <p className="info-text">
                                            Upload the completed RFQ Excel file from the merchant. The file will be validated
                                            and you'll see a preview before confirming the import.
                                        </p>
                                    </div>

                                    {/* Merchant Selection */}
                                    <div className="form-group">
                                        <label>Select Merchant *</label>
                                        <select
                                            value={merchantId}
                                            onChange={(e) => setMerchantId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select merchant...</option>
                                            {merchants?.map(merchant => (
                                                <option key={merchant.id} value={merchant.id}>
                                                    {merchant.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* File Selection */}
                                    <div className="file-upload-area">
                                        <input
                                            type="file"
                                            id="rfq-file-input"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="rfq-file-input" className="file-upload-label">
                                            <FiFile size={48} />
                                            {selectedFile ? (
                                                <>
                                                    <span className="file-name">{selectedFile.name}</span>
                                                    <span className="file-size">
                                                        {(selectedFile.size / 1024).toFixed(2)} KB
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="upload-text">Click to select Excel file</span>
                                                    <span className="upload-hint">or drag and drop</span>
                                                </>
                                            )}
                                        </label>
                                        {selectedFile && (
                                            <button
                                                className="btn-change-file"
                                                onClick={() => {
                                                    setSelectedFile(null);
                                                    document.getElementById('rfq-file-input').value = '';
                                                }}
                                            >
                                                Change File
                                            </button>
                                        )}
                                    </div>

                                    {/* Upload Button */}
                                    <button
                                        className="btn-primary btn-upload"
                                        onClick={handleUploadAndPreview}
                                        disabled={!selectedFile || !merchantId || isUploading}
                                    >
                                        {isUploading ? (
                                            'Uploading and Validating...'
                                        ) : (
                                            <>
                                                <FiUpload /> Upload and Preview
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Preview Section */}
                                <div className="preview-area">
                                    <div className="preview-header">
                                        <h3>Import Preview</h3>
                                        <div className="preview-stats">
                                            <span className="stat valid">
                                                <FiCheckCircle /> {validCount} Valid
                                            </span>
                                            {invalidCount > 0 && (
                                                <span className="stat invalid">
                                                    <FiXCircle /> {invalidCount} Invalid
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {invalidCount > 0 && (
                                        <div className="modal-warning">
                                            <FiAlertCircle />
                                            <span>
                                                Some rows have validation errors and cannot be imported.
                                                Review the errors below.
                                            </span>
                                        </div>
                                    )}

                                    {/* Select All Valid */}
                                    {validCount > 0 && (
                                        <div className="selection-actions">
                                            <button
                                                className="btn-select-all"
                                                onClick={handleSelectAllValid}
                                            >
                                                {selectedRows.length === validCount ? (
                                                    <>
                                                        <FiCheck /> Deselect All Valid
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiCheck /> Select All Valid ({validCount})
                                                    </>
                                                )}
                                            </button>
                                            <span className="selection-count">
                                                {selectedRows.length} of {validCount} selected
                                            </span>
                                        </div>
                                    )}

                                    {/* Preview Table */}
                                    <div className="preview-table-container">
                                        <table className="preview-table">
                                            <thead>
                                            <tr>
                                                <th className="col-select"></th>
                                                <th className="col-item">Item Name</th>
                                                <th className="col-unit">Unit</th>
                                                <th className="col-qty">Requested</th>
                                                <th className="col-qty">Response Qty</th>
                                                <th className="col-price">Unit Price</th>
                                                <th className="col-price">Total Price</th>
                                                <th className="col-status">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {previewData.rows.map((row, index) => (
                                                <tr
                                                    key={index}
                                                    className={`${row.valid ? 'valid-row' : 'invalid-row'} ${
                                                        selectedRows.includes(row.itemTypeId) ? 'selected' : ''
                                                    }`}
                                                >
                                                    <td className="col-select">
                                                        {row.valid && (
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRows.includes(row.itemTypeId)}
                                                                onChange={() => handleRowToggle(row.itemTypeId)}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="col-item">{row.itemName}</td>
                                                    <td className="col-unit">{row.unit}</td>
                                                    <td className="col-qty">{row.requestedQuantity}</td>
                                                    <td className="col-qty">{row.responseQuantity || '-'}</td>
                                                    <td className="col-price">
                                                        {row.unitPrice ? `${row.unitPrice.toFixed(2)} EGP` : '-'}
                                                    </td>
                                                    <td className="col-price">
                                                        {row.totalPrice ? `${row.totalPrice.toFixed(2)} EGP` : '-'}
                                                    </td>
                                                    <td className="col-status">
                                                        {row.valid ? (
                                                            <span className="status-badge valid">
                                                                    <FiCheckCircle /> Valid
                                                                </span>
                                                        ) : (
                                                            <span className="status-badge invalid" title={row.validationErrors?.join(', ')}>
                                                                    <FiXCircle /> {row.validationErrors?.[0] || 'Invalid'}
                                                                </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Actions */}
                                    <div className="preview-actions">
                                        <button
                                            className="modal-btn-secondary"
                                            onClick={() => {
                                                setPreviewData(null);
                                                setSelectedRows([]);
                                            }}
                                        >
                                            Upload Different File
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="modal-btn-secondary" onClick={handleClose} disabled={isUploading || isImporting}>
                        Cancel
                    </button>
                    {previewData && (
                        <button
                            className="btn-success"
                            onClick={handleConfirmImport}
                            disabled={isImporting || selectedRows.length === 0}
                        >
                            {isImporting ? (
                                'Importing...'
                            ) : (
                                <>
                                    <FiCheck /> Confirm Import ({selectedRows.length} items)
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <Snackbar
                type={snackbar.type}
                text={snackbar.message}
                isVisible={snackbar.show}
                onClose={hideSnackbar}
            />
        </div>
    );
};

export default RFQImportDialog;