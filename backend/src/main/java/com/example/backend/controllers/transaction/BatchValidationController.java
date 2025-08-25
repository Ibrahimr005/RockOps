package com.example.backend.controllers.transaction;

import com.example.backend.dto.transaction.BatchValidationResponseDTO;
import com.example.backend.services.transaction.BatchValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Controller for batch number validation operations
 * Provides endpoints for validating batch numbers in equipment-warehouse transactions
 */
@RestController
@RequestMapping("/api/v1/batch-validation")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
public class BatchValidationController {

    private final BatchValidationService batchValidationService;

    /**
     * Validate batch number for equipment transactions
     * 
     * @param equipmentId The equipment ID requesting validation
     * @param batchNumber The batch number to validate
     * @return BatchValidationResponseDTO with scenario and next steps
     */
    @GetMapping("/equipment/{equipmentId}/batch/{batchNumber}")
    @PreAuthorize("hasRole('EQUIPMENT_MANAGER') or hasRole('MAINTENANCE_TECHNICIAN') or hasRole('SITE_MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<BatchValidationResponseDTO> validateBatchForEquipment(
            @PathVariable UUID equipmentId,
            @PathVariable Integer batchNumber) {
        
        log.info("Batch validation request - Equipment: {}, Batch: {}", equipmentId, batchNumber);

        try {
            // Input validation
            if (batchNumber <= 0) {
                BatchValidationResponseDTO errorResponse = BatchValidationResponseDTO.builder()
                        .scenario("validation_error")
                        .found(false)
                        .canCreateNew(false)
                        .canValidate(false)
                        .batchNumber(batchNumber)
                        .message("Batch number must be a positive integer")
                        .validatedAt(LocalDateTime.now().toString())
                        .equipmentId(equipmentId)
                        .build();
                
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Perform validation
            BatchValidationResponseDTO response = batchValidationService.validateBatchForEquipment(batchNumber, equipmentId);
            
            // Add metadata
            response.setValidatedAt(LocalDateTime.now().toString());
            response.setEquipmentId(equipmentId);

            log.info("Batch validation completed - Scenario: {}, Can create: {}, Can validate: {}", 
                    response.getScenario(), response.isCanCreateNew(), response.isCanValidate());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Batch validation failed - Invalid input: {}", e.getMessage());
            
            BatchValidationResponseDTO errorResponse = BatchValidationResponseDTO.builder()
                    .scenario("validation_error")
                    .found(false)
                    .canCreateNew(false)
                    .canValidate(false)
                    .batchNumber(batchNumber)
                    .message("Validation error: " + e.getMessage())
                    .validatedAt(LocalDateTime.now().toString())
                    .equipmentId(equipmentId)
                    .build();

            return ResponseEntity.badRequest().body(errorResponse);

        } catch (Exception e) {
            log.error("Unexpected error during batch validation", e);
            
            BatchValidationResponseDTO errorResponse = BatchValidationResponseDTO.builder()
                    .scenario("system_error")
                    .found(false)
                    .canCreateNew(false)
                    .canValidate(false)
                    .batchNumber(batchNumber)
                    .message("System error occurred during validation. Please try again later.")
                    .validatedAt(LocalDateTime.now().toString())
                    .equipmentId(equipmentId)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Validate batch number specifically for maintenance transactions
     * 
     * @param equipmentId The equipment ID
     * @param maintenanceId The maintenance record ID
     * @param batchNumber The batch number to validate
     * @return BatchValidationResponseDTO with maintenance context
     */
    @GetMapping("/equipment/{equipmentId}/maintenance/{maintenanceId}/batch/{batchNumber}")
    @PreAuthorize("hasRole('MAINTENANCE_TECHNICIAN') or hasRole('EQUIPMENT_MANAGER') or hasRole('SITE_MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<BatchValidationResponseDTO> validateBatchForMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @PathVariable Integer batchNumber) {
        
        log.info("Maintenance batch validation request - Equipment: {}, Maintenance: {}, Batch: {}", 
                equipmentId, maintenanceId, batchNumber);

        try {
            // Input validation
            if (batchNumber <= 0) {
                BatchValidationResponseDTO errorResponse = BatchValidationResponseDTO.builder()
                        .scenario("validation_error")
                        .found(false)
                        .canCreateNew(false)
                        .canValidate(false)
                        .batchNumber(batchNumber)
                        .message("Batch number must be a positive integer")
                        .maintenanceContext(true)
                        .maintenanceId(maintenanceId)
                        .validatedAt(LocalDateTime.now().toString())
                        .equipmentId(equipmentId)
                        .build();
                
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Perform maintenance-specific validation
            BatchValidationResponseDTO response = batchValidationService.validateBatchForMaintenance(
                    batchNumber, equipmentId, maintenanceId);
            
            // Add metadata
            response.setValidatedAt(LocalDateTime.now().toString());
            response.setEquipmentId(equipmentId);

            log.info("Maintenance batch validation completed - Scenario: {}, Can create: {}, Can validate: {}", 
                    response.getScenario(), response.isCanCreateNew(), response.isCanValidate());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Maintenance batch validation failed - Invalid input: {}", e.getMessage());
            
            BatchValidationResponseDTO errorResponse = BatchValidationResponseDTO.builder()
                    .scenario("validation_error")
                    .found(false)
                    .canCreateNew(false)
                    .canValidate(false)
                    .batchNumber(batchNumber)
                    .message("Validation error: " + e.getMessage())
                    .maintenanceContext(true)
                    .maintenanceId(maintenanceId)
                    .validatedAt(LocalDateTime.now().toString())
                    .equipmentId(equipmentId)
                    .build();

            return ResponseEntity.badRequest().body(errorResponse);

        } catch (Exception e) {
            log.error("Unexpected error during maintenance batch validation", e);
            
            BatchValidationResponseDTO errorResponse = BatchValidationResponseDTO.builder()
                    .scenario("system_error")
                    .found(false)
                    .canCreateNew(false)
                    .canValidate(false)
                    .batchNumber(batchNumber)
                    .message("System error occurred during validation. Please try again later.")
                    .maintenanceContext(true)
                    .maintenanceId(maintenanceId)
                    .validatedAt(LocalDateTime.now().toString())
                    .equipmentId(equipmentId)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Check if a batch number is available for new transaction creation
     * 
     * @param batchNumber The batch number to check
     * @return Simple boolean response indicating availability
     */
    @GetMapping("/batch/{batchNumber}/available")
    @PreAuthorize("hasRole('EQUIPMENT_MANAGER') or hasRole('MAINTENANCE_TECHNICIAN') or hasRole('SITE_MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<Boolean> isBatchNumberAvailable(@PathVariable Integer batchNumber) {
        
        log.info("Checking batch number availability: {}", batchNumber);

        try {
            if (batchNumber <= 0) {
                return ResponseEntity.badRequest().body(false);
            }

            boolean available = batchValidationService.isBatchNumberAvailable(batchNumber);
            
            log.info("Batch number {} availability: {}", batchNumber, available);
            
            return ResponseEntity.ok(available);

        } catch (Exception e) {
            log.error("Error checking batch number availability", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(false);
        }
    }

    /**
     * Validate batch number uniqueness for transaction creation
     * This endpoint throws an exception if the batch number is not unique
     * 
     * @param batchNumber The batch number to validate
     * @return Success message if batch number is unique
     */
    @PostMapping("/batch/{batchNumber}/validate-uniqueness")
    @PreAuthorize("hasRole('EQUIPMENT_MANAGER') or hasRole('MAINTENANCE_TECHNICIAN') or hasRole('SITE_MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<String> validateBatchNumberUniqueness(@PathVariable Integer batchNumber) {
        
        log.info("Validating batch number uniqueness: {}", batchNumber);

        try {
            if (batchNumber <= 0) {
                return ResponseEntity.badRequest().body("Batch number must be a positive integer");
            }

            batchValidationService.validateBatchNumberUniqueness(batchNumber);
            
            String message = String.format("Batch number %d is available for use", batchNumber);
            log.info("Batch number uniqueness validation passed: {}", batchNumber);
            
            return ResponseEntity.ok(message);

        } catch (IllegalArgumentException e) {
            log.warn("Batch number uniqueness validation failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());

        } catch (Exception e) {
            log.error("Error validating batch number uniqueness", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("System error occurred during validation");
        }
    }
}