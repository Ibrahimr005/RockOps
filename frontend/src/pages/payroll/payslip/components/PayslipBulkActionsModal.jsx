
// ==================== PAYSLIP BULK ACTIONS MODAL ====================
// frontend/src/pages/payroll/PayslipManagement/components/PayslipBulkActionsModal.jsx
import React, { useState } from 'react';
import { FaTimes, FaCheck, FaEnvelope, FaDownload, FaUsers } from 'react-icons/fa';
import { payslipService } from '../../../../services/payroll/payslipService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './PayslipBulkActionsModal.scss'


const PayslipBulkActionsModal = ({ payslipIds, onClose, onSuccess }) => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [selectedAction, setSelectedAction] = useState('');

    const bulkActions = [
        {
            value: 'finalize',
            label: 'Finalize Selected Payslips',
            icon: FaCheck,
            description: 'Mark payslips as finalized and ready for distribution',
            confirmRequired: true
        },
        {
            value: 'send',
            label: 'Send Email to Employees',
            icon: FaEnvelope,
            description: 'Send payslip emails to all selected employees',
            confirmRequired: false
        },
        {
            value: 'download',
            label: 'Download All PDFs',
            icon: FaDownload,
            description: 'Download a ZIP file containing all selected payslips',
            confirmRequired: false
        }
    ];

    const handleActionSubmit = async () => {
        if (!selectedAction) {
            showError('Please select an action');
            return;
        }

        try {
            setLoading(true);

            switch (selectedAction) {
                case 'finalize':
                    await payslipService.bulkFinalizePayslips(payslipIds);
                    showSuccess(`${payslipIds.length} payslips finalized successfully`);
                    break;

                case 'send':
                    await payslipService.bulkSendPayslips(payslipIds);
                    showSuccess(`Emails sent for ${payslipIds.length} payslips`);
                    break;

                case 'download':
                    // This would require a bulk download endpoint
                    showError('Bulk download functionality coming soon');
                    break;

                default:
                    showError('Invalid action selected');
                    return;
            }

            onSuccess();
        } catch (error) {
            console.error('Error performing bulk action:', error);
            showError('Failed to perform bulk action');
        } finally {
            setLoading(false);
        }
    };

    const selectedActionConfig = bulkActions.find(action => action.value === selectedAction);

    return (
        <div className="modal-overlay">
            <div className="modal-container bulk-actions-modal">
                <div className="modal-header">
                    <h3>
                        <FaUsers className="modal-icon" />
                        Bulk Actions ({payslipIds.length} selected)
                    </h3>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="action-selection">
                        <h4>Select Action</h4>
                        <div className="action-options">
                            {bulkActions.map(action => {
                                const IconComponent = action.icon;
                                return (
                                    <label key={action.value} className="action-option">
                                        <input
                                            type="radio"
                                            name="bulkAction"
                                            value={action.value}
                                            checked={selectedAction === action.value}
                                            onChange={(e) => setSelectedAction(e.target.value)}
                                        />
                                        <div className="action-content">
                                            <div className="action-header">
                                                <IconComponent className="action-icon" />
                                                <span className="action-label">{action.label}</span>
                                            </div>
                                            <p className="action-description">{action.description}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {selectedActionConfig?.confirmRequired && (
                        <div className="confirmation-section">
                            <div className="warning-box">
                                <FaCheck className="warning-icon" />
                                <div className="warning-content">
                                    <strong>Confirmation Required:</strong> This action will affect {payslipIds.length} payslips
                                    and cannot be undone. Please review before proceeding.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleActionSubmit}
                        disabled={loading || !selectedAction}
                    >
                        {loading ? 'Processing...' : 'Execute Action'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayslipBulkActionsModal;
