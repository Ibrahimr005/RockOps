package com.example.backend.dto.transaction;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for batch validation responses
 * Contains all information needed by frontend to determine next steps
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchValidationResponseDTO {
    
    /**
     * The scenario determined for this batch number:
     * - "not_found": Batch number doesn't exist, can create new transaction
     * - "incoming_validation": Equipment can validate incoming transaction
     * - "already_validated": Transaction is completed, show warning
     * - "pending_sent": Equipment sent this transaction, show pending status
     * - "used_by_other_entity": Batch used by different entities
     * - "other_status": Transaction has other status (partially accepted, etc.)
     */
    private String scenario;
    
    /**
     * Whether a transaction with this batch number was found
     */
    private boolean found;
    
    /**
     * Whether user can create a new transaction with this batch number
     */
    private boolean canCreateNew;
    
    /**
     * Whether user can validate an existing transaction
     */
    private boolean canValidate;
    
    /**
     * The batch number that was validated
     */
    private Integer batchNumber;
    
    /**
     * Human-readable message explaining the scenario and next steps
     */
    private String message;
    
    /**
     * Transaction details if found (null for not_found scenario)
     */
    private TransactionDTO transaction;
    
    /**
     * Whether this validation is for maintenance context
     */
    private boolean maintenanceContext;
    
    /**
     * Associated maintenance ID if applicable
     */
    private UUID maintenanceId;
    
    /**
     * Additional validation details for complex scenarios
     */
    private String additionalInfo;
    
    /**
     * Validation timestamp
     */
    private String validatedAt;
    
    /**
     * Equipment ID that performed the validation
     */
    private UUID equipmentId;
}