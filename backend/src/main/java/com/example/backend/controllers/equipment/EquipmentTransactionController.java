package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.EquipmentTransactionAcceptRequestDTO;
import com.example.backend.dto.equipment.EquipmentTransactionRequestDTO;
import com.example.backend.dto.equipment.EquipmentTransactionMaintenanceAcceptRequestDTO;
import com.example.backend.dto.equipment.MaintenanceDTO;
import com.example.backend.dto.equipment.MaintenanceSearchCriteria;
import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.models.*;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemType;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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

    /**
     * Get all transactions for a specific equipment
     */
    @GetMapping("/{equipmentId}/transactions")
    public ResponseEntity<List<TransactionDTO>> getEquipmentTransactions(@PathVariable UUID equipmentId) {
        try {
        List<Transaction> transactions = transactionService.getTransactionsForEquipment(equipmentId);
            List<TransactionDTO> responseDTOs = transactionMapperService.toDTOs(transactions);
            return ResponseEntity.ok(responseDTOs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get transactions initiated by equipment
     */
    @GetMapping("/{equipmentId}/transactions/initiated")
    public ResponseEntity<List<TransactionDTO>> getInitiatedTransactions(@PathVariable UUID equipmentId) {
        try {
        List<Transaction> transactions = transactionService.getPendingTransactionsInitiatedByEquipment(equipmentId);
            List<TransactionDTO> responseDTOs = transactionMapperService.toDTOs(transactions);
            return ResponseEntity.ok(responseDTOs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Create a new transaction with equipment as sender
     */
    @PostMapping("/{equipmentId}/send-transaction")
    public ResponseEntity<TransactionDTO> createSenderTransaction(
            @PathVariable UUID equipmentId,
            @RequestParam UUID receiverId,
            @RequestParam PartyType receiverType,
            @RequestParam int batchNumber,
            @RequestParam(required = false) LocalDateTime transactionDate,
            @RequestParam(required = false, defaultValue = "GENERAL") TransactionPurpose purpose,
            @RequestParam(required = false) String description,
            @RequestBody List<Map<String, Object>> items,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
        // Validate the equipment exists
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        // Convert the items list to TransactionItem objects
        List<TransactionItem> transactionItems = items.stream()
                .map(itemMap -> {
                    UUID itemTypeId = UUID.fromString(itemMap.get("itemTypeId").toString());
                    int quantity = Integer.parseInt(itemMap.get("quantity").toString());

                    ItemType itemType = itemTypeRepository.findById(itemTypeId)
                            .orElseThrow(() -> new IllegalArgumentException("Item type not found"));

                    return TransactionItem.builder()
                            .itemType(itemType)
                            .quantity(quantity)
                            .status(TransactionStatus.PENDING)
                            .build();
                })
                .collect(Collectors.toList());

        // Use the provided transaction date or default to current time
        LocalDateTime effectiveTransactionDate = transactionDate != null ? transactionDate : LocalDateTime.now();

        // Create the transaction
        Transaction transaction = transactionService.createEquipmentTransaction(
                PartyType.EQUIPMENT, equipmentId,
                receiverType, receiverId,
                transactionItems,
                effectiveTransactionDate,
                userDetails.getUsername(),
                batchNumber,
                equipmentId, // Equipment is the sender initiating the transaction
                purpose
        );

            TransactionDTO responseDTO = transactionMapperService.toDTO(transaction);
            return ResponseEntity.ok(responseDTO);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Create a new transaction with equipment as receiver
     */
    @PostMapping("/{equipmentId}/receive-transaction")
    public ResponseEntity<TransactionDTO> createReceiverTransaction(
            @PathVariable UUID equipmentId,
            @RequestParam UUID senderId,
            @RequestParam PartyType senderType,
            @RequestParam int batchNumber,
            @RequestParam(required = false) LocalDateTime transactionDate,
            @RequestParam(required = false, defaultValue = "GENERAL") TransactionPurpose purpose,
            @RequestParam(required = false) String description,
            @RequestBody List<Map<String, Object>> items,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            System.out.println("Received Transaction" + equipmentId);

        // Validate the equipment exists
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        // Convert the items list to TransactionItem objects
        List<TransactionItem> transactionItems = items.stream()
                .map(itemMap -> {
                    UUID itemTypeId = UUID.fromString(itemMap.get("itemTypeId").toString());
                    int quantity = Integer.parseInt(itemMap.get("quantity").toString());

                    ItemType itemType = itemTypeRepository.findById(itemTypeId)
                            .orElseThrow(() -> new IllegalArgumentException("Item type not found"));

                    return TransactionItem.builder()
                            .itemType(itemType)
                            .quantity(quantity)
                            .status(TransactionStatus.PENDING)
                            .build();
                })
                .collect(Collectors.toList());

        // Use the provided transaction date or default to current time
        LocalDateTime effectiveTransactionDate = transactionDate != null ? transactionDate : LocalDateTime.now();

        // Create the transaction
        Transaction transaction = transactionService.createEquipmentTransaction(
                senderType, senderId,
                PartyType.EQUIPMENT, equipmentId,
                transactionItems,
                effectiveTransactionDate,
                userDetails.getUsername(),
                batchNumber,
                equipmentId, // Equipment is the receiver initiating the transaction
                purpose
        );

            TransactionDTO responseDTO = transactionMapperService.toDTO(transaction);
            return ResponseEntity.ok(responseDTO);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Update a pending transaction
     */
    @PutMapping("/{equipmentId}/transactions/{transactionId}")
    public ResponseEntity<TransactionDTO> updateTransaction(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestParam UUID senderId,
            @RequestParam PartyType senderType,
            @RequestParam UUID receiverId,
            @RequestParam PartyType receiverType,
            @RequestParam int batchNumber,
            @RequestParam(required = false) LocalDateTime transactionDate,
            @RequestParam(required = false) TransactionPurpose purpose,
            @RequestParam(required = false) String description,
            @RequestBody List<Map<String, Object>> items,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
        // Verify the transaction involves this equipment
        Transaction transaction = transactionService.getTransactionById(transactionId);
        boolean isInvolved = (transaction.getSenderType() == PartyType.EQUIPMENT &&
                transaction.getSenderId().equals(equipmentId)) ||
                (transaction.getReceiverType() == PartyType.EQUIPMENT &&
                        transaction.getReceiverId().equals(equipmentId));

        if (!isInvolved) {
            return ResponseEntity.badRequest().build();
        }

        // Convert the items list to TransactionItem objects
        List<TransactionItem> transactionItems = items.stream()
                .map(itemMap -> {
                    UUID itemTypeId = UUID.fromString(itemMap.get("itemTypeId").toString());
                    int quantity = Integer.parseInt(itemMap.get("quantity").toString());

                    ItemType itemType = itemTypeRepository.findById(itemTypeId)
                            .orElseThrow(() -> new IllegalArgumentException("Item type not found"));

                    return TransactionItem.builder()
                            .itemType(itemType)
                            .quantity(quantity)
                            .status(TransactionStatus.PENDING)
                            .build();
                })
                .collect(Collectors.toList());

        // Use the provided transaction date or default to current time
        LocalDateTime effectiveTransactionDate = transactionDate != null ? transactionDate : LocalDateTime.now();

        // Update the transaction
        Transaction updatedTransaction = transactionService.updateEquipmentTransaction(
                transactionId,
                senderType, senderId,
                receiverType, receiverId,
                transactionItems,
                effectiveTransactionDate,
                userDetails.getUsername(),
                batchNumber,
                purpose
        );

            TransactionDTO responseDTO = transactionMapperService.toDTO(updatedTransaction);
            return ResponseEntity.ok(responseDTO);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Accept a transaction
     */
    @PostMapping("/{equipmentId}/transactions/{transactionId}/accept")
    public ResponseEntity<TransactionDTO> acceptTransaction(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestBody EquipmentTransactionAcceptRequestDTO requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            // Verify the transaction involves this equipment
            Transaction transaction = transactionService.getTransactionById(transactionId);
            boolean isInvolved = (transaction.getSenderType() == PartyType.EQUIPMENT &&
                    transaction.getSenderId().equals(equipmentId)) ||
                    (transaction.getReceiverType() == PartyType.EQUIPMENT &&
                            transaction.getReceiverId().equals(equipmentId));

            if (!isInvolved) {
                return ResponseEntity.badRequest().build();
            }

            // Convert String keys to UUID
            Map<UUID, Integer> receivedQuantities = new HashMap<>();
            requestBody.getReceivedQuantities().forEach((key, value) -> {
                receivedQuantities.put(UUID.fromString(key), value);
            });

            // Convert itemsNotReceived from String keys to UUID keys
            Map<UUID, Boolean> itemsNotReceived = new HashMap<>();
            if (requestBody.getItemsNotReceived() != null) {
                requestBody.getItemsNotReceived().forEach((key, value) -> {
                    itemsNotReceived.put(UUID.fromString(key), value);
                });
            }

            // Accept the transaction
            Transaction updatedTransaction = transactionService.acceptEquipmentTransaction(
                    transactionId,
                    receivedQuantities,
                    itemsNotReceived, // Use extracted data instead of empty HashMap
                    userDetails.getUsername(),
                    requestBody.getComment(),
                    requestBody.getPurpose()
            );

            TransactionDTO responseDTO = transactionMapperService.toDTO(updatedTransaction);
            return ResponseEntity.ok(responseDTO);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Reject a transaction
     */
    @PostMapping("/{equipmentId}/transactions/{transactionId}/reject")
    public ResponseEntity<TransactionDTO> rejectTransaction(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestBody Map<String, String> requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            // Verify the transaction involves this equipment
            Transaction transaction = transactionService.getTransactionById(transactionId);
            boolean isInvolved = (transaction.getSenderType() == PartyType.EQUIPMENT &&
                    transaction.getSenderId().equals(equipmentId)) ||
                    (transaction.getReceiverType() == PartyType.EQUIPMENT &&
                            transaction.getReceiverId().equals(equipmentId));

            if (!isInvolved) {
                return ResponseEntity.badRequest().build();
            }

            String rejectionReason = requestBody.get("rejectionReason");

            Transaction rejectedTransaction = transactionService.rejectEquipmentTransaction(
                    transactionId,
                    rejectionReason,
                    userDetails.getUsername()
            );

            TransactionDTO responseDTO = transactionMapperService.toDTO(rejectedTransaction);
            return ResponseEntity.ok(responseDTO);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // ========================================
    // LEGACY SUPPORT METHODS
    // Keep existing Map-based endpoints for backward compatibility
    // ========================================

    @PostMapping("/{equipmentId}/send-transaction-legacy")
    public ResponseEntity<Transaction> createSenderTransactionLegacy(
            @PathVariable UUID equipmentId,
            @RequestParam UUID receiverId,
            @RequestParam PartyType receiverType,
            @RequestParam int batchNumber,
            @RequestParam(required = false) LocalDateTime transactionDate,
            @RequestParam(required = false, defaultValue = "GENERAL") TransactionPurpose purpose,
            @RequestBody List<Map<String, Object>> items,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Validate the equipment exists
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        // Convert the items list to TransactionItem objects
        List<TransactionItem> transactionItems = items.stream()
                .map(itemMap -> {
                    UUID itemTypeId = UUID.fromString(itemMap.get("itemTypeId").toString());
                    int quantity = Integer.parseInt(itemMap.get("quantity").toString());

                    ItemType itemType = itemTypeRepository.findById(itemTypeId)
                            .orElseThrow(() -> new IllegalArgumentException("Item type not found"));

                    return TransactionItem.builder()
                            .itemType(itemType)
                            .quantity(quantity)
                            .status(TransactionStatus.PENDING)
                            .build();
                })
                .collect(Collectors.toList());

        // Use the provided transaction date or default to current time
        LocalDateTime effectiveTransactionDate = transactionDate != null ? transactionDate : LocalDateTime.now();

        // Create the transaction
        Transaction transaction = transactionService.createEquipmentTransaction(
                PartyType.EQUIPMENT, equipmentId,
                receiverType, receiverId,
                transactionItems,
                effectiveTransactionDate,
                userDetails.getUsername(),
                batchNumber,
                equipmentId, // Equipment is the sender initiating the transaction
                purpose
        );

        return ResponseEntity.ok(transaction);
    }

    @PostMapping("/{equipmentId}/transactions/{transactionId}/accept-legacy")
    public ResponseEntity<Transaction> acceptTransactionLegacy(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Verify the transaction involves this equipment
        Transaction transaction = transactionService.getTransactionById(transactionId);
        boolean isInvolved = (transaction.getSenderType() == PartyType.EQUIPMENT &&
                transaction.getSenderId().equals(equipmentId)) ||
                (transaction.getReceiverType() == PartyType.EQUIPMENT &&
                        transaction.getReceiverId().equals(equipmentId));

        if (!isInvolved) {
            return ResponseEntity.badRequest().build();
        }

        // Extract received quantities and other data
        @SuppressWarnings("unchecked")
        Map<String, Integer> receivedQuantitiesMap = (Map<String, Integer>) requestBody.get("receivedQuantities");
        String comment = (String) requestBody.get("comment");

        // Get transaction purpose if provided (defaults to current purpose if not specified)
        TransactionPurpose purpose = null;
        if (requestBody.containsKey("purpose")) {
            purpose = TransactionPurpose.valueOf(requestBody.get("purpose").toString());
        }

        // Convert String keys to UUID
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantitiesMap.forEach((key, value) -> {
            receivedQuantities.put(UUID.fromString(key), value);
        });

        // Extract itemsNotReceived if present
        Map<UUID, Boolean> itemsNotReceived = new HashMap<>();
        if (requestBody.containsKey("itemsNotReceived")) {
            @SuppressWarnings("unchecked")
            Map<String, Boolean> itemsNotReceivedMap = (Map<String, Boolean>) requestBody.get("itemsNotReceived");
            if (itemsNotReceivedMap != null) {
                itemsNotReceivedMap.forEach((key, value) -> {
                    itemsNotReceived.put(UUID.fromString(key), value);
                });
            }
        }

        // Accept the transaction
        Transaction updatedTransaction = transactionService.acceptEquipmentTransaction(
                transactionId,
                receivedQuantities,
                itemsNotReceived, // Use extracted data instead of empty HashMap
                userDetails.getUsername(),
                comment,
                purpose
        );

        return ResponseEntity.ok(updatedTransaction);
    }

    // ========================================
    // MAINTENANCE INTEGRATION ENDPOINTS
    // ========================================

    @Autowired
    private MaintenanceIntegrationService maintenanceIntegrationService;

    /**
     * Search maintenance records for linking to transactions
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

            List<MaintenanceDTO> maintenanceRecords = maintenanceIntegrationService.searchMaintenanceRecords(equipmentId, criteria);
            return ResponseEntity.ok(maintenanceRecords);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get maintenance records suitable for linking (recent and relevant)
     */
    @GetMapping("/{equipmentId}/maintenance/for-linking")
    public ResponseEntity<List<MaintenanceDTO>> getMaintenanceRecordsForLinking(@PathVariable UUID equipmentId) {
        try {
            List<MaintenanceDTO> maintenanceRecords = maintenanceIntegrationService.getMaintenanceRecordsForLinking(equipmentId);
            return ResponseEntity.ok(maintenanceRecords);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Accept transaction with maintenance integration
     */
    @PostMapping("/{equipmentId}/transactions/{transactionId}/accept-with-maintenance")
    public ResponseEntity<Map<String, Object>> acceptTransactionWithMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID transactionId,
            @RequestBody EquipmentTransactionMaintenanceAcceptRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            // Verify the transaction involves this equipment
            Transaction transaction = transactionService.getTransactionById(transactionId);
            boolean isInvolved = (transaction.getSenderType() == PartyType.EQUIPMENT &&
                    transaction.getSenderId().equals(equipmentId)) ||
                    (transaction.getReceiverType() == PartyType.EQUIPMENT &&
                            transaction.getReceiverId().equals(equipmentId));

            if (!isInvolved) {
                return ResponseEntity.badRequest().build();
            }

            // Accept the transaction with maintenance handling
            Transaction acceptedTransaction = transactionService.acceptTransactionWithMaintenanceHandling(
                    transactionId,
                    request.getReceivedQuantities(),
                    request.getItemsNotReceived(),
                    userDetails.getUsername(),
                    request.getAcceptanceComment(),
                    request.getPurpose(),
                    request.getMaintenanceLinkingRequest()
            );

            // Handle maintenance linking if requested
            Object linkedMaintenance = null;
            if (request.getMaintenanceLinkingRequest() != null) {
                switch (request.getMaintenanceLinkingRequest().getAction()) {
                    case LINK_EXISTING:
                        maintenanceIntegrationService.linkTransactionToMaintenance(
                                transactionId, 
                                request.getMaintenanceLinkingRequest().getExistingMaintenanceId()
                        );
                        break;
                    case CREATE_NEW:
                        linkedMaintenance = maintenanceIntegrationService.createMaintenanceAndLinkTransaction(
                                equipmentId,
                                request.getMaintenanceLinkingRequest().getNewMaintenanceRequest(),
                                transactionId
                        );
                        break;
                    case SKIP_MAINTENANCE:
                        // No maintenance linking needed
                        break;
                }
            }

            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("transaction", transactionMapperService.toDTO(acceptedTransaction));
            if (linkedMaintenance != null) {
                response.put("maintenance", linkedMaintenance);
                response.put("maintenanceLinked", true);
            } else {
                response.put("maintenanceLinked", false);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}