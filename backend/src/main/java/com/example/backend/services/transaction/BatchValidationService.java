package com.example.backend.services.transaction;

import com.example.backend.dto.transaction.BatchValidationResponseDTO;
import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.repositories.transaction.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Service for validating batch numbers and determining transaction scenarios
 * for equipment-warehouse transactions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BatchValidationService {

    private final TransactionRepository transactionRepository;
    private final TransactionMapperService transactionMapperService;

    /**
     * Validate batch number for equipment transactions and return appropriate scenario
     * 
     * @param batchNumber The batch number to validate
     * @param equipmentId The equipment ID requesting validation
     * @return BatchValidationResponseDTO with scenario and transaction details
     */
    public BatchValidationResponseDTO validateBatchForEquipment(Integer batchNumber, UUID equipmentId) {
        log.info("Validating batch number {} for equipment {}", batchNumber, equipmentId);

        // Input validation
        if (batchNumber == null || batchNumber <= 0) {
            throw new IllegalArgumentException("Batch number must be a positive integer");
        }

        if (equipmentId == null) {
            throw new IllegalArgumentException("Equipment ID is required");
        }

        // Check if batch number exists
        Optional<Transaction> existingTransaction = transactionRepository.findByBatchNumber(batchNumber);

        if (existingTransaction.isEmpty()) {
            // Scenario 1: Batch number not found - can create new transaction
            log.info("Batch number {} not found - can create new transaction", batchNumber);
            return createNotFoundResponse(batchNumber);
        }

        Transaction transaction = existingTransaction.get();
        log.info("Found transaction with batch {} - Status: {}, Sender: {}, Receiver: {}", 
                batchNumber, transaction.getStatus(), transaction.getSenderId(), transaction.getReceiverId());

        // Determine scenario based on transaction status and equipment involvement
        return determineTransactionScenario(transaction, equipmentId);
    }

    /**
     * Validate batch number specifically for equipment maintenance transactions
     * 
     * @param batchNumber The batch number to validate  
     * @param equipmentId The equipment ID
     * @param maintenanceId The maintenance record ID (optional)
     * @return BatchValidationResponseDTO with enhanced maintenance context
     */
    public BatchValidationResponseDTO validateBatchForMaintenance(Integer batchNumber, UUID equipmentId, UUID maintenanceId) {
        log.info("Validating batch number {} for equipment {} maintenance {}", batchNumber, equipmentId, maintenanceId);

        BatchValidationResponseDTO baseResponse = validateBatchForEquipment(batchNumber, equipmentId);
        
        // Add maintenance-specific context
        baseResponse.setMaintenanceContext(true);
        baseResponse.setMaintenanceId(maintenanceId);

        return baseResponse;
    }

    /**
     * Check if batch number is available for new transaction creation
     * 
     * @param batchNumber The batch number to check
     * @return true if available, false if already in use
     */
    public boolean isBatchNumberAvailable(Integer batchNumber) {
        if (batchNumber == null || batchNumber <= 0) {
            return false;
        }

        return transactionRepository.findByBatchNumber(batchNumber).isEmpty();
    }

    /**
     * Validate batch number uniqueness before transaction creation
     * 
     * @param batchNumber The batch number to validate
     * @throws IllegalArgumentException if batch number is already in use
     */
    public void validateBatchNumberUniqueness(Integer batchNumber) {
        if (!isBatchNumberAvailable(batchNumber)) {
            Transaction existingTransaction = transactionRepository.findByBatchNumber(batchNumber)
                    .orElseThrow(() -> new IllegalStateException("Transaction should exist"));
            
            throw new IllegalArgumentException(
                String.format("Batch number %d is already used by transaction %s with status %s", 
                    batchNumber, existingTransaction.getId(), existingTransaction.getStatus())
            );
        }
    }

    /**
     * Determine the appropriate scenario based on transaction status and equipment involvement
     */
    private BatchValidationResponseDTO determineTransactionScenario(Transaction transaction, UUID equipmentId) {
        boolean isEquipmentSender = equipmentId.equals(transaction.getSenderId());
        boolean isEquipmentReceiver = equipmentId.equals(transaction.getReceiverId());
        boolean isEquipmentInvolved = isEquipmentSender || isEquipmentReceiver;

        TransactionStatus status = transaction.getStatus();

        // Scenario 2: Transaction already completed/validated
        if (isTransactionCompleted(status)) {
            if (isEquipmentInvolved) {
                return createAlreadyValidatedResponse(transaction, "This equipment");
            } else {
                return createUsedByOtherEntityResponse(transaction);
            }
        }

        // Scenario 3: Transaction pending validation
        if (isTransactionPending(status)) {
            if (isEquipmentReceiver) {
                // Equipment can validate incoming transaction
                return createIncomingValidationResponse(transaction);
            } else if (isEquipmentSender) {
                // Equipment sent this transaction, show pending status
                return createPendingSentResponse(transaction);
            } else {
                // Transaction belongs to other entities
                return createUsedByOtherEntityResponse(transaction);
            }
        }

        // Scenario 4: Other transaction statuses
        if (isEquipmentInvolved) {
            return createOtherStatusResponse(transaction, status);
        } else {
            return createUsedByOtherEntityResponse(transaction);
        }
    }

    /**
     * Check if transaction is in a completed state
     */
    private boolean isTransactionCompleted(TransactionStatus status) {
        return status == TransactionStatus.ACCEPTED || 
               status == TransactionStatus.REJECTED || 
               status == TransactionStatus.RESOLVED;
    }

    /**
     * Check if transaction is in a pending state that can be validated
     */
    private boolean isTransactionPending(TransactionStatus status) {
        return status == TransactionStatus.PENDING || 
               status == TransactionStatus.DELIVERING;
    }

    /**
     * Create response for batch number not found scenario
     */
    private BatchValidationResponseDTO createNotFoundResponse(Integer batchNumber) {
        return BatchValidationResponseDTO.builder()
                .scenario("not_found")
                .found(false)
                .canCreateNew(true)
                .canValidate(false)
                .batchNumber(batchNumber)
                .message(String.format("No transaction found with batch number %d. You can create a new transaction.", batchNumber))
                .build();
    }

    /**
     * Create response for already validated transaction scenario
     */
    private BatchValidationResponseDTO createAlreadyValidatedResponse(Transaction transaction, String entityDescription) {
        return BatchValidationResponseDTO.builder()
                .scenario("already_validated")
                .found(true)
                .canCreateNew(false)
                .canValidate(false)
                .batchNumber(transaction.getBatchNumber())
                .message(String.format("Batch number %d is already used by a %s transaction for %s. Check it out in the transactions tab.", 
                        transaction.getBatchNumber(), transaction.getStatus().toString().toLowerCase(), entityDescription))
                .transaction(transactionMapperService.toDTO(transaction))
                .build();
    }

    /**
     * Create response for incoming transaction validation scenario
     */
    private BatchValidationResponseDTO createIncomingValidationResponse(Transaction transaction) {
        return BatchValidationResponseDTO.builder()
                .scenario("incoming_validation")
                .found(true)
                .canCreateNew(false)
                .canValidate(true)
                .batchNumber(transaction.getBatchNumber())
                .message(String.format("Batch number %d belongs to an incoming transaction. You can validate the received items.", 
                        transaction.getBatchNumber()))
                .transaction(transactionMapperService.toDTO(transaction))
                .build();
    }

    /**
     * Create response for pending sent transaction scenario
     */
    private BatchValidationResponseDTO createPendingSentResponse(Transaction transaction) {
        return BatchValidationResponseDTO.builder()
                .scenario("pending_sent")
                .found(true)
                .canCreateNew(false)
                .canValidate(false)
                .batchNumber(transaction.getBatchNumber())
                .message(String.format("Batch number %d belongs to a pending transaction sent from this equipment. Check it out in the transactions tab.", 
                        transaction.getBatchNumber()))
                .transaction(transactionMapperService.toDTO(transaction))
                .build();
    }

    /**
     * Create response for transaction used by other entity scenario
     */
    private BatchValidationResponseDTO createUsedByOtherEntityResponse(Transaction transaction) {
        String entityDescription = getEntityDescription(transaction);
        
        return BatchValidationResponseDTO.builder()
                .scenario("used_by_other_entity")
                .found(true)
                .canCreateNew(false)
                .canValidate(false)
                .batchNumber(transaction.getBatchNumber())
                .message(String.format("Batch number %d is already used by %s. Please choose a different batch number.", 
                        transaction.getBatchNumber(), entityDescription))
                .transaction(transactionMapperService.toDTO(transaction))
                .build();
    }

    /**
     * Create response for other transaction status scenario
     */
    private BatchValidationResponseDTO createOtherStatusResponse(Transaction transaction, TransactionStatus status) {
        return BatchValidationResponseDTO.builder()
                .scenario("other_status")
                .found(true)
                .canCreateNew(false)
                .canValidate(false)
                .batchNumber(transaction.getBatchNumber())
                .message(String.format("Batch number %d is already used by a transaction with status: %s. Please choose a different batch number.", 
                        transaction.getBatchNumber(), status.toString().toLowerCase()))
                .transaction(transactionMapperService.toDTO(transaction))
                .build();
    }

    /**
     * Get human-readable description of entities involved in transaction
     */
    private String getEntityDescription(Transaction transaction) {
        String senderType = transaction.getSenderType().toString().toLowerCase();
        String receiverType = transaction.getReceiverType().toString().toLowerCase();
        return String.format("a transaction between %s and %s", senderType, receiverType);
    }
}