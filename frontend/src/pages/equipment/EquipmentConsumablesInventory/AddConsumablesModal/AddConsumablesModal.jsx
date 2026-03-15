import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { equipmentService } from '../../../../services/equipmentService';
import BatchValidationWorkflow from '../../../../components/equipment/BatchValidationWorkflow/BatchValidationWorkflow.jsx';
// Note: equipmentService still used by handleTransactionValidate via processUnifiedTransaction
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './AddConsumablesModal.scss';

const AddConsumablesModal = ({
    isOpen,
    onClose,
    equipmentId,
    equipmentData,
    onTransactionAdded
}) => {
    const { showSuccess, showError } = useSnackbar();

    // Dirty state tracking (handled by BatchValidationWorkflow)
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    // Handle transaction validation for incoming transactions
    const handleTransactionValidate = async (validationData) => {
        setIsFormDirty(true);
        try {
            console.log('🚀 AddConsumablesModal: Starting transaction validation with data:', validationData);
            
            const receivedQuantities = {};
            const itemsNotReceived = {};

            validationData.validationItems.forEach(item => {
                receivedQuantities[item.transactionItemId] = item.receivedQuantity;
                itemsNotReceived[item.transactionItemId] = item.itemNotReceived;
            });

            console.log('📦 AddConsumablesModal: Prepared validation data:', {
                equipmentId,
                transactionId: validationData.transactionId,
                receivedQuantities,
                itemsNotReceived,
                purpose: 'CONSUMABLE'
            });

            const response = await equipmentService.processUnifiedTransaction(
                equipmentId,
                validationData.transactionId,
                {
                    receivedQuantities,
                    itemsNotReceived,
                    comments: 'Validated via consumables interface',
                    purpose: 'CONSUMABLE'
                }
            );

            console.log('✅ AddConsumablesModal: Transaction validation response:', response.data);

            // Refresh parent component data with a slight delay to ensure backend processing is complete
            if (onTransactionAdded) {
                setTimeout(() => {
                    console.log('🔄 AddConsumablesModal: Refreshing parent component data...');
                    onTransactionAdded();
                }, 500); // 500ms delay
            }

            showSuccess('Transaction validated successfully!');
        } catch (error) {
            console.error('Error validating transaction:', error);
            if (error.response?.status === 403) {
                showError('You don\'t have permission to validate this transaction.');
            } else if (error.response?.status === 400) {
                const message = error.response.data?.message || 'Invalid validation data.';
                showError(message);
            } else {
                showError('Failed to validate transaction. Please try again.');
            }
            throw error;
        }
    };

    return (
        <>
            <BatchValidationWorkflow
                equipmentId={equipmentId}
                equipmentData={equipmentData}
                transactionPurpose="CONSUMABLE"
                onTransactionValidate={handleTransactionValidate}
                isOpen={isOpen}
                onClose={handleCloseAttempt}
                title="Validate Consumables Transaction"
            />

            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
                onCancel={() => setShowDiscardDialog(false)}
                size="medium"
            />
        </>
    );
};

export default AddConsumablesModal;