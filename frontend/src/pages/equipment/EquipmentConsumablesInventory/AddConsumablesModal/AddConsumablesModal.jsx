import React from 'react';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { equipmentService } from '../../../../services/equipmentService';
import BatchValidationWorkflow from '../../../../components/equipment/BatchValidationWorkflow/BatchValidationWorkflow.jsx';
import './AddConsumablesModal.scss';

const AddConsumablesModal = ({ 
    isOpen, 
    onClose, 
    equipmentId, 
    equipmentData, 
    onTransactionAdded 
}) => {
    const { showSuccess, showError } = useSnackbar();

    // Handle transaction creation for new batch numbers
    const handleTransactionCreate = async (transactionData) => {
        try {
            console.log('🚀 AddConsumablesModal: Creating transaction with data:', transactionData);
            
            const itemsArray = transactionData.items.map(item => ({
                itemTypeId: item.itemTypeId,
                quantity: item.quantity
            }));
            
            console.log('📦 AddConsumablesModal: Mapped items array:', itemsArray);
            console.log('🔧 AddConsumablesModal: Transaction parameters:', {
                equipmentId,
                senderId: transactionData.senderId,
                senderType: transactionData.senderType,
                batchNumber: transactionData.batchNumber,
                purpose: 'CONSUMABLE',
                transactionDate: transactionData.transactionDate,
                description: transactionData.description
            });

            await equipmentService.receiveTransaction(
                equipmentId,
                transactionData.senderId,
                transactionData.senderType,
                transactionData.batchNumber,
                'CONSUMABLE', // Ensure purpose is set correctly
                itemsArray,
                transactionData.transactionDate,
                transactionData.description
            );

            // Refresh parent component data
            if (onTransactionAdded) {
                onTransactionAdded();
            }

            showSuccess('Consumable transaction created successfully!');
        } catch (error) {
            console.error('Error creating consumable transaction:', error);
            if (error.response?.status === 403) {
                showError('You don\'t have permission to create this transaction.');
            } else if (error.response?.status === 400) {
                const message = error.response.data?.message || 'Invalid transaction data.';
                showError(message);
            } else if (error.response?.status === 409) {
                showError('Batch number conflict. This batch number may already exist.');
            } else {
                showError('Failed to create transaction. Please try again.');
            }
            throw error;
        }
    };

    // Handle transaction validation for incoming transactions
    const handleTransactionValidate = async (validationData) => {
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
        <BatchValidationWorkflow
            equipmentId={equipmentId}
            equipmentData={equipmentData}
            transactionPurpose="CONSUMABLE"
            onTransactionCreate={handleTransactionCreate}
            onTransactionValidate={handleTransactionValidate}
            isOpen={isOpen}
            onClose={onClose}
            title="Add Consumables Transaction"
        />
    );
};

export default AddConsumablesModal;