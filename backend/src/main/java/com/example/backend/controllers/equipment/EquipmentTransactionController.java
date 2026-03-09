package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.EquipmentTransactionAcceptRequestDTO;
import com.example.backend.dto.equipment.EquipmentTransactionMaintenanceAcceptRequestDTO;
import com.example.backend.dto.equipment.MaintenanceDTO;
import com.example.backend.dto.equipment.MaintenanceSearchCriteria;
import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.equipment.MaintenanceIntegrationService;
import com.example.backend.services.transaction.TransactionMapperService;
import com.example.backend.services.transaction.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/equipment")
public class EquipmentTransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private TransactionMapperService transactionMapperService;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private MaintenanceIntegrationService maintenanceIntegrationService;

    // ========================================
    // QUERY
    // ========================================

    /**
     * Get all transactions where this equipment is the receiver.
     */
    @GetMapping("/{equipmentId}/transactions")
    public ResponseEntity<List<TransactionDTO>> getEquipmentTransactions(@PathVariable UUID equipmentId) {
        try {
            List<Transaction> transactions = transactionService.getTransactionsForEquipment(equipmentId);
            return ResponseEntity.ok(transactionMapperService.toDTOs(transactions));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // ========================================
    // ACCEPT
    // Equipment validates what it actually received.
    // ========================================

    /**
     * Accept an incoming transaction sent by a warehouse to this equipment.
     */
    @PostMapping("/{equipmentId}/transactions/{transactionId}/accept")
    public ResponseEntity<TransactionDTO> acceptTransaction(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestBody EquipmentTransactionAcceptRequestDTO requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            verifyEquipmentIsReceiver(transactionId, equipmentId);

            Map<UUID, Integer> receivedQuantities = new HashMap<>();
            requestBody.getReceivedQuantities().forEach((key, value) ->
                    receivedQuantities.put(UUID.fromString(key), value));

            Map<UUID, Boolean> itemsNotReceived = new HashMap<>();
            if (requestBody.getItemsNotReceived() != null) {
                requestBody.getItemsNotReceived().forEach((key, value) ->
                        itemsNotReceived.put(UUID.fromString(key), value));
            }

            Transaction updated = transactionService.acceptTransactionWithPurpose(
                    transactionId,
                    receivedQuantities,
                    itemsNotReceived,
                    userDetails.getUsername(),
                    requestBody.getComment(),
                    requestBody.getPurpose()
            );

            return ResponseEntity.ok(transactionMapperService.toDTO(updated));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // ========================================
    // REJECT
    // ========================================

    /**
     * Reject an incoming transaction. Reverts sender warehouse inventory.
     */
    @PostMapping("/{equipmentId}/transactions/{transactionId}/reject")
    public ResponseEntity<TransactionDTO> rejectTransaction(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestBody Map<String, String> requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            verifyEquipmentIsReceiver(transactionId, equipmentId);

            Transaction rejected = transactionService.rejectTransaction(
                    transactionId,
                    requestBody.get("rejectionReason"),
                    userDetails.getUsername()
            );

            return ResponseEntity.ok(transactionMapperService.toDTO(rejected));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // ========================================
    // MAINTENANCE INTEGRATION
    // ========================================

    /**
     * Search maintenance records for linking to transactions.
     */
    @GetMapping("/{equipmentId}/maintenance/search")
    public ResponseEntity<List<MaintenanceDTO>> searchMaintenanceRecords(
            @PathVariable UUID equipmentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) UUID technicianId,
            @RequestParam(required = false) UUID maintenanceTypeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Boolean hasLinkedTransactions) {

        try {
            MaintenanceSearchCriteria criteria = MaintenanceSearchCriteria.builder()
                    .startDate(startDate)
                    .endDate(endDate)
                    .technicianId(technicianId)
                    .maintenanceTypeId(maintenanceTypeId)
                    .status(status)
                    .description(description)
                    .hasLinkedTransactions(hasLinkedTransactions)
                    .build();

            return ResponseEntity.ok(
                    maintenanceIntegrationService.searchMaintenanceRecords(equipmentId, criteria));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get maintenance records suitable for linking (recent and relevant).
     */
    @GetMapping("/{equipmentId}/maintenance/for-linking")
    public ResponseEntity<List<MaintenanceDTO>> getMaintenanceRecordsForLinking(@PathVariable UUID equipmentId) {
        try {
            return ResponseEntity.ok(
                    maintenanceIntegrationService.getMaintenanceRecordsForLinking(equipmentId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Accept a transaction and optionally link or create a maintenance record.
     */
    @PostMapping("/{equipmentId}/transactions/{transactionId}/accept-with-maintenance")
    public ResponseEntity<Map<String, Object>> acceptTransactionWithMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestBody EquipmentTransactionMaintenanceAcceptRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            verifyEquipmentIsReceiver(transactionId, equipmentId);

            Transaction accepted = transactionService.acceptTransactionWithMaintenanceHandling(
                    transactionId,
                    request.getReceivedQuantities(),
                    request.getItemsNotReceived(),
                    userDetails.getUsername(),
                    request.getAcceptanceComment(),
                    request.getPurpose(),
                    request.getMaintenanceLinkingRequest()
            );

            Object linkedMaintenance = null;
            if (request.getMaintenanceLinkingRequest() != null) {
                switch (request.getMaintenanceLinkingRequest().getAction()) {
                    case LINK_EXISTING:
                        maintenanceIntegrationService.linkTransactionToMaintenance(
                                transactionId,
                                request.getMaintenanceLinkingRequest().getExistingMaintenanceId());
                        break;
                    case CREATE_NEW:
                        linkedMaintenance = maintenanceIntegrationService.createMaintenanceAndLinkTransaction(
                                equipmentId,
                                request.getMaintenanceLinkingRequest().getNewMaintenanceRequest(),
                                transactionId);
                        break;
                    case SKIP_MAINTENANCE:
                        break;
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("transaction", transactionMapperService.toDTO(accepted));
            response.put("maintenanceLinked", linkedMaintenance != null);
            if (linkedMaintenance != null) response.put("maintenance", linkedMaintenance);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // ========================================
    // PRIVATE HELPERS
    // ========================================

    /**
     * Ensures the given equipment is the receiver of the transaction.
     * Equipment can never be the sender.
     */
    private void verifyEquipmentIsReceiver(UUID transactionId, UUID equipmentId) {
        Transaction transaction = transactionService.getTransactionById(transactionId);
        boolean isReceiver = transaction.getReceiverType() == PartyType.EQUIPMENT
                && transaction.getReceiverId().equals(equipmentId);
        if (!isReceiver) {
            throw new IllegalArgumentException(
                    "Equipment " + equipmentId + " is not the receiver of transaction " + transactionId);
        }
    }
}