import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiCheckSquare, FiSquare, FiFileText, FiAlertCircle } from 'react-icons/fi';
import './RFQExportDialog.scss';
import Snackbar from '../../../../../components/common/Snackbar/Snackbar';
import { rfqService } from '../../../../../services/procurement/rfqService';

const RFQExportDialog = ({ isVisible, onClose, offer, requestItems }) => {
    const [selectedItems, setSelectedItems] = useState([]);
    const [language, setLanguage] = useState('en'); // 'en' or 'ar'
    const [filename, setFilename] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Snackbar
    const [snackbar, setSnackbar] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    const [selectedItemsWithQuantities, setSelectedItemsWithQuantities] = useState({});

    useEffect(() => {
        if (isVisible && offer) {
            // Start with empty filename
            setFilename('');

            // Select all items by default with their current quantities
            if (requestItems && requestItems.length > 0) {
                const itemsWithQty = {};
                requestItems.forEach(item => {
                    itemsWithQty[item.id] = item.quantity; // Use original quantity
                });
                setSelectedItemsWithQuantities(itemsWithQty);
                setSelectedItems(requestItems.map(item => item.id));
            }
        }
    }, [isVisible, offer, requestItems]);

    const handleSelectAll = () => {
        if (selectedItems.length === requestItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(requestItems.map(item => item.id));
            // Reset quantities to original when selecting all
            const itemsWithQty = {};
            requestItems.forEach(item => {
                itemsWithQty[item.id] = item.quantity;
            });
            setSelectedItemsWithQuantities(itemsWithQty);
        }
    };

    const handleItemToggle = (itemId) => {
        if (selectedItems.includes(itemId)) {
            setSelectedItems(selectedItems.filter(id => id !== itemId));
        } else {
            setSelectedItems([...selectedItems, itemId]);
        }
    };


    const handleExport = async () => {
        // Validation
        if (selectedItems.length === 0) {
            showSnackbar('error', 'Please select at least one item to export');
            return;
        }

        if (!filename.trim()) {
            showSnackbar('error', 'Please enter a filename');
            return;
        }

        try {
            setIsExporting(true);

            // Build the items with custom quantities
            const itemsToExport = requestItems
                .filter(item => selectedItems.includes(item.id))
                .map(item => ({
                    itemTypeId: item.itemTypeId,
                    itemTypeName: item.itemTypeName,
                    measuringUnit: item.itemTypeMeasuringUnit,
                    requestedQuantity: selectedItemsWithQuantities[item.id] !== '' && selectedItemsWithQuantities[item.id] !== undefined
                        ? selectedItemsWithQuantities[item.id]
                        : item.quantity
                }));

            // Create export request
            const exportRequest = {
                offerId: offer.id,
                items: itemsToExport,
                language: language,
                filename: filename
            };

            // Call the export service
            const blob = await rfqService.exportRFQ(exportRequest);

            // Download the file
            rfqService.downloadExcelFile(blob, `${filename}.xlsx`);

            showSnackbar('success', 'RFQ exported successfully');

            // Close dialog after short delay
            setTimeout(() => {
                handleClose();
            }, 1000);

        } catch (error) {
            console.error('Error exporting RFQ:', error);
            showSnackbar('error', 'Failed to export RFQ');
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        setSelectedItems([]);
        setSelectedItemsWithQuantities({});
        setLanguage('en');
        setFilename('');
        onClose();
    };

    const showSnackbar = (type, message) => {
        setSnackbar({ show: true, type, message });
    };

    const hideSnackbar = () => {
        setSnackbar({ ...snackbar, show: false });
    };

    if (!isVisible) return null;

    const handleQuantityChange = (itemId, value) => {
        // Allow empty string for clearing
        if (value === '') {
            setSelectedItemsWithQuantities(prev => ({
                ...prev,
                [itemId]: ''
            }));
            return;
        }

        // Parse the value
        const numValue = value === '' ? '' : parseFloat(value);

        // Only update if it's a valid number or empty
        if (value === '' || (!isNaN(numValue) && numValue > 0)) {
            setSelectedItemsWithQuantities(prev => ({
                ...prev,
                [itemId]: value === '' ? '' : numValue
            }));
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content modal-lg rfq-export-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FiFileText />
                        Export RFQ to Excel
                    </h2>
                    <button className="btn-close" onClick={handleClose}>
                        <FiX />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="export-section">
                        <div className="section-info">
                            <p className="info-text">
                                Export selected items to an Excel file that can be sent to merchants for quotation.
                                The Excel file will include formulas for automatic price calculation.
                            </p>
                        </div>

                        {/* Filename Input */}
                        <div className="form-group">
                            <label>
                                Filename <span className="required-asterisk">*</span>
                            </label>
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder=""
                                required
                            />
                            <small className="form-hint">.xlsx extension will be added automatically</small>
                        </div>

                        {/* Language Selection */}
                        <div className="form-group">
                            <label>
                                Language <span className="required-asterisk">*</span>
                            </label>
                            <div className="language-options">
                                <button
                                    type="button"
                                    className={`language-option ${language === 'en' ? 'active' : ''}`}
                                    onClick={() => setLanguage('en')}
                                >
                                    English
                                </button>
                                <button
                                    type="button"
                                    className={`language-option ${language === 'ar' ? 'active' : ''}`}
                                    onClick={() => setLanguage('ar')}
                                >
                                    العربية (Arabic)
                                </button>
                            </div>
                            <small className="form-hint">
                                Column headers will be in the selected language. Numbers will use Western numerals (0-9).
                            </small>
                        </div>

                        {/* Item Selection */}
                        <div className="items-selection">
                            <div className="selection-header">
                                <h3>Select Items to Export</h3>
                                <button
                                    type="button"
                                    className="btn-select-all"
                                    onClick={handleSelectAll}
                                >
                                    {selectedItems.length === requestItems.length ? (
                                        <>
                                            <FiCheckSquare /> Deselect All
                                        </>
                                    ) : (
                                        <>
                                            <FiSquare /> Select All
                                        </>
                                    )}
                                </button>
                            </div>

                            {requestItems && requestItems.length > 0 ? (
                                <div className="items-list">
                                    {requestItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={`item-row ${selectedItems.includes(item.id) ? 'selected' : ''}`}
                                        >
                                            <div
                                                className="item-checkbox-section"
                                                onClick={() => handleItemToggle(item.id)}
                                            >
                                                <div className="checkbox-icon">
                                                    {selectedItems.includes(item.id) ? (
                                                        <FiCheckSquare />
                                                    ) : (
                                                        <FiSquare />
                                                    )}
                                                </div>
                                                <div className="item-info">
                                                    <span className="item-name">{item.itemTypeName}</span>
                                                    <span className="item-unit">{item.itemTypeMeasuringUnit}</span>
                                                </div>
                                            </div>

                                            <div className="item-quantity-input">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={selectedItemsWithQuantities[item.id] !== undefined
                                                        ? selectedItemsWithQuantities[item.id]
                                                        : item.quantity}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    onFocus={(e) => e.target.select()} // Select all on focus for easy editing
                                                    disabled={!selectedItems.includes(item.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <FiAlertCircle size={48} />
                                    <p>No items available to export</p>
                                </div>
                            )}
                        </div>

                        {/* Selected Count */}
                        <div className="selection-summary">
                            <span className="count-badge">
                                {selectedItems.length} of {requestItems?.length || 0} items selected
                            </span>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="modal-btn-secondary" onClick={handleClose} disabled={isExporting}>
                        Cancel
                    </button>
                    <button
                        className="btn-success"
                        onClick={handleExport}
                        disabled={isExporting || selectedItems.length === 0}
                    >
                        {isExporting ? (
                            'Exporting...'
                        ) : (
                            <>
                                <FiDownload /> Export Excel
                            </>
                        )}
                    </button>
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

export default RFQExportDialog;