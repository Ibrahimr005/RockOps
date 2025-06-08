package com.example.backend.controllers.equipment;

import com.example.backend.models.*;
import com.example.backend.models.equipment.InSiteMaintenance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;

import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.hr.EmployeeService;
import com.example.backend.services.equipment.InSiteMaintenanceService;
import com.example.backend.services.transaction.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.time.temporal.ChronoUnit;

@RestController
@RequestMapping("/api/equipment/{equipmentId}/maintenance")
public class InSiteMaintenanceController {

    @Autowired
    private InSiteMaintenanceService maintenanceService;

    @Autowired
    private EmployeeService employeeService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    // Get all maintenance records for equipment
    @GetMapping
    public ResponseEntity<List<InSiteMaintenance>> getAllMaintenanceRecords(@PathVariable UUID equipmentId) {
        return ResponseEntity.ok(maintenanceService.getMaintenanceByEquipmentId(equipmentId));
    }

    // Get all employees that can be technicians
    @GetMapping("/technicians")
    public ResponseEntity<List<Employee>> getAllTechnicians() {
        return ResponseEntity.ok(employeeService.getTechnicians());
    }

    // Create a new maintenance record with transaction validation
    @PostMapping
    public ResponseEntity<?> createMaintenance(
            @PathVariable UUID equipmentId,
            @RequestBody Map<String, Object> maintenanceData,
            @AuthenticationPrincipal UserDetails userDetails) {

        Map<String, Object> response = new HashMap<>();

        try {
            // Parse and validate input data
            System.out.println("Received maintenance data: " + maintenanceData);
            
            UUID technicianId = UUID.fromString((String) maintenanceData.get("technicianId"));
            LocalDateTime maintenanceDate = LocalDateTime.parse((String) maintenanceData.get("maintenanceDate"));
            String description = (String) maintenanceData.get("description");
            String status = (String) maintenanceData.get("status");

            Object batchNumberObj = maintenanceData.get("batchNumber");
            Integer batchNumber = (batchNumberObj != null && !batchNumberObj.toString().isBlank()) ?
                    Integer.parseInt(batchNumberObj.toString()) : null;
            InSiteMaintenance maintenance;
            
            // Check if maintenanceTypeId is provided (new format) or maintenanceType (legacy format)
            Object maintenanceTypeIdObj = maintenanceData.get("maintenanceTypeId");
            Object maintenanceTypeObj = maintenanceData.get("maintenanceType");
            
            if (maintenanceTypeIdObj != null) {
                // New format: using maintenance type ID
                UUID maintenanceTypeId = UUID.fromString(maintenanceTypeIdObj.toString());
                maintenance = maintenanceService.createMaintenance(
                        equipmentId, technicianId, maintenanceDate, maintenanceTypeId, description, status);
            } else if (maintenanceTypeObj != null) {
                // Legacy format: using maintenance type string
                String maintenanceTypeName = maintenanceTypeObj.toString();
                maintenance = maintenanceService.createMaintenance(
                        equipmentId, technicianId, maintenanceDate, maintenanceTypeName, description, status);
            } else {
                throw new IllegalArgumentException("Either maintenanceTypeId or maintenanceType must be provided");
            }

            // Check if transaction validation data is provided
            @SuppressWarnings("unchecked")
            Map<String, Object> transactionValidation = (Map<String, Object>) maintenanceData.get("transactionValidation");
            
            if (transactionValidation != null) {
                // Handle inline transaction validation
                UUID transactionId = UUID.fromString(transactionValidation.get("transactionId").toString());
                String action = (String) transactionValidation.get("action");
                String comments = (String) transactionValidation.get("comments");
                String rejectionReason = (String) transactionValidation.get("rejectionReason");
                
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> receivedItems = (List<Map<String, Object>>) transactionValidation.get("receivedItems");
                
                try {
                    Transaction validatedTransaction;
                    
                    if ("reject".equals(action)) {
                        // Reject the transaction
                        validatedTransaction = transactionService.rejectEquipmentTransaction(
                            transactionId, rejectionReason, userDetails.getUsername());
                        
                    } else if ("accept".equals(action)) {
                        // Prepare received quantities for acceptance
                        Map<UUID, Integer> receivedQuantities = new HashMap<>();
                        Map<UUID, Boolean> itemsNotReceived = new HashMap<>();
                        
                        for (Map<String, Object> item : receivedItems) {
                            UUID itemId = UUID.fromString(item.get("transactionItemId").toString());
                            Integer receivedQty = item.get("receivedQuantity") != null ? 
                                Integer.parseInt(item.get("receivedQuantity").toString()) : 0;
                            Boolean notReceived = Boolean.parseBoolean(item.get("itemNotReceived").toString());
                            
                            receivedQuantities.put(itemId, receivedQty);
                            itemsNotReceived.put(itemId, notReceived);
                        }
                        
                        // Accept the transaction with MAINTENANCE purpose
                        validatedTransaction = transactionService.acceptEquipmentTransaction(
                            transactionId, receivedQuantities, itemsNotReceived, 
                            userDetails.getUsername(), comments, TransactionPurpose.MAINTENANCE);
                    } else {
                        throw new IllegalArgumentException("Invalid action. Must be 'accept' or 'reject'");
                    }
                    
                    // Link the validated transaction to the maintenance record
                    maintenance = maintenanceService.linkTransactionToMaintenance(
                            maintenance.getId(), transactionId);
                    
                    response.put("maintenance", maintenance);
                    response.put("transaction", validatedTransaction);
                    response.put("status", action + "ed_and_linked");
                    response.put("message", "Maintenance record created and transaction " + action + "ed successfully");
                    
                    return ResponseEntity.ok(response);
                    
                } catch (Exception e) {
                    response.put("error", "Failed to validate transaction: " + e.getMessage());
                    return ResponseEntity.badRequest().body(response);
                }
                
            } else if (batchNumber != null) {
                // Legacy handling for batch number without validation
                Optional<Transaction> existingTransaction = maintenanceService.findTransactionByBatchNumber(batchNumber);

                if (existingTransaction.isPresent()) {
                    // Transaction exists, link it to maintenance
                    Transaction transaction = existingTransaction.get();

                    // Update purpose to MAINTENANCE if needed
                    if (transaction.getPurpose() != TransactionPurpose.MAINTENANCE) {
                        transaction.setPurpose(TransactionPurpose.MAINTENANCE);
                        transactionService.updateEquipmentTransaction(
                                transaction.getId(),
                                transaction.getSenderType(),
                                transaction.getSenderId(),
                                transaction.getReceiverType(),
                                transaction.getReceiverId(),
                                transaction.getItems(),
                                transaction.getTransactionDate(),
                                userDetails.getUsername(),
                                transaction.getBatchNumber(),
                                TransactionPurpose.MAINTENANCE
                        );
                    }

                    maintenance = maintenanceService.linkTransactionToMaintenance(
                            maintenance.getId(), transaction.getId());

                    response.put("maintenance", maintenance);
                    response.put("transaction", transaction);
                    response.put("status", "linked");

                    return ResponseEntity.ok(response);
                } else {
                    // Transaction doesn't exist, return maintenance with status
                    response.put("maintenance", maintenance);
                    response.put("status", "transaction_not_found");
                    response.put("message", "Maintenance record created, but no transaction found with batch number " + batchNumber);

                    return ResponseEntity.ok(response);
                }
            } else {
                // No batch number or validation provided, just return the maintenance record
                response.put("maintenance", maintenance);
                response.put("status", "created");

                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Update a maintenance record
    @PutMapping("/{maintenanceId}")
    public ResponseEntity<InSiteMaintenance> updateMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @RequestBody Map<String, Object> maintenanceData) {

        UUID technicianId = UUID.fromString((String) maintenanceData.get("technicianId"));
        LocalDateTime maintenanceDate = LocalDateTime.parse((String) maintenanceData.get("maintenanceDate"));
        String description = (String) maintenanceData.get("description");
        String status = (String) maintenanceData.get("status");

        InSiteMaintenance maintenance;
        
        // Check if maintenanceTypeId is provided (new format) or maintenanceType (legacy format)
        Object maintenanceTypeIdObj = maintenanceData.get("maintenanceTypeId");
        Object maintenanceTypeObj = maintenanceData.get("maintenanceType");
        
        if (maintenanceTypeIdObj != null) {
            // New format: using maintenance type ID
            UUID maintenanceTypeId = UUID.fromString(maintenanceTypeIdObj.toString());
            maintenance = maintenanceService.updateMaintenance(
                    maintenanceId, technicianId, maintenanceDate, maintenanceTypeId, description, status);
        } else if (maintenanceTypeObj != null) {
            // Legacy format: using maintenance type string
            String maintenanceTypeName = maintenanceTypeObj.toString();
            maintenance = maintenanceService.updateMaintenance(
                    maintenanceId, technicianId, maintenanceDate, maintenanceTypeName, description, status);
        } else {
            throw new IllegalArgumentException("Either maintenanceTypeId or maintenanceType must be provided");
        }

        return ResponseEntity.ok(maintenance);
    }

    // Link transaction to maintenance
    @PostMapping("/{maintenanceId}/link-transaction/{transactionId}")
    public ResponseEntity<InSiteMaintenance> linkTransactionToMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @PathVariable UUID transactionId) {

        InSiteMaintenance maintenance = maintenanceService.linkTransactionToMaintenance(maintenanceId, transactionId);
        return ResponseEntity.ok(maintenance);
    }

    // Delete a maintenance record
    @DeleteMapping("/{maintenanceId}")
    public ResponseEntity<Void> deleteMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId) {

        maintenanceService.deleteMaintenance(maintenanceId);
        return ResponseEntity.noContent().build();
    }

    // Create a new maintenance transaction
    @PostMapping("/{maintenanceId}/transactions")
    public ResponseEntity<?> createMaintenanceTransaction(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @RequestParam UUID senderId,
            @RequestParam PartyType senderType,
            @RequestParam int batchNumber,
            @RequestBody List<Map<String, Object>> items,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            // Validate maintenance record exists
            InSiteMaintenance maintenance = maintenanceService.getMaintenanceByEquipmentId(equipmentId)
                    .stream()
                    .filter(m -> m.getId().equals(maintenanceId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Maintenance record not found"));

            // Convert items to TransactionItem objects
            List<TransactionItem> transactionItems = items.stream()
                    .map(itemMap -> {
                        UUID itemTypeId = UUID.fromString(itemMap.get("itemTypeId").toString());
                        int quantity = Integer.parseInt(itemMap.get("quantity").toString());

                        ItemType itemType = itemTypeRepository.findById(itemTypeId)
                                .orElseThrow(() -> new IllegalArgumentException("Item type not found: " + itemTypeId));

                        return TransactionItem.builder()
                                .itemType(itemType) // Assuming you have a constructor that takes ID
                                .quantity(quantity)
                                .status(TransactionStatus.PENDING)
                                .build();
                    })
                    .toList();

            // Create transaction with MAINTENANCE purpose
            Transaction transaction = transactionService.createEquipmentTransaction(
                    senderType, senderId,
                    PartyType.EQUIPMENT, equipmentId,
                    transactionItems,
                    LocalDateTime.now(),
                    userDetails.getUsername(),
                    batchNumber,
                    equipmentId, // Equipment is the receiver
                    TransactionPurpose.MAINTENANCE // Specify maintenance purpose
            );

            // Link transaction to maintenance
            maintenance = maintenanceService.linkTransactionToMaintenance(maintenanceId, transaction.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("maintenance", maintenance);
            response.put("transaction", transaction);
            response.put("status", "created");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // Enhanced endpoint to check transaction status and return detailed information for maintenance linking
    @GetMapping("/check-transaction/{batchNumber}")
    public ResponseEntity<?> checkTransactionExists(@PathVariable UUID equipmentId, @PathVariable int batchNumber) {
        Map<String, Object> response = new HashMap<>();

        try {
            System.out.println("Checking transaction for batch number: " + batchNumber + " on equipment: " + equipmentId);
            Optional<Transaction> transactionOpt = maintenanceService.findTransactionByBatchNumber(batchNumber);

            if (transactionOpt.isPresent()) {
                Transaction transaction = transactionOpt.get();
                
                // Determine scenario based on transaction status
                if (transaction.getStatus() == TransactionStatus.ACCEPTED || 
                    transaction.getStatus() == TransactionStatus.REJECTED) {
                    // Scenario 1: Already accepted or rejected
                    response.put("scenario", "already_handled");
                    response.put("found", true);
                    response.put("message", String.format(
                        "Transaction with batch number %d has already been %s. You can view it for details but cannot link it to this maintenance record.",
                        batchNumber, transaction.getStatus().toString().toLowerCase()
                    ));
                    response.put("transaction", createTransactionSummary(transaction));
                    
                } else if (transaction.getStatus() == TransactionStatus.PENDING) {
                    // Scenario 2: Pending transaction (can be linked and validated)
                    response.put("scenario", "pending_validation");
                    response.put("found", true);
                    response.put("message", "Pending transaction found! You can link it to this maintenance record and validate it inline.");
                    response.put("transaction", createDetailedTransactionInfo(transaction));
                    
                } else {
                    // Other statuses (e.g., DELIVERING, PARTIALLY_ACCEPTED)
                    response.put("scenario", "other_status");
                    response.put("found", true);
                    response.put("message", String.format(
                        "Transaction found but it's currently %s. Only pending transactions can be linked to maintenance records.",
                        transaction.getStatus().toString().toLowerCase()
                    ));
                    response.put("transaction", createTransactionSummary(transaction));
                }
            } else {
                // Scenario 3: No transaction exists
                response.put("scenario", "not_found");
                response.put("found", false);
                response.put("message", "No transaction found with batch number " + batchNumber + ". You can create a new transaction.");
                response.put("allowCreateNew", true);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Helper method to create transaction summary for non-linkable transactions
    private Map<String, Object> createTransactionSummary(Transaction transaction) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("id", transaction.getId());
        summary.put("batchNumber", transaction.getBatchNumber());
        summary.put("status", transaction.getStatus());
        summary.put("purpose", transaction.getPurpose());
        summary.put("itemCount", transaction.getItems() != null ? transaction.getItems().size() : 0);
        summary.put("transactionDate", transaction.getTransactionDate());
        summary.put("completedAt", transaction.getCompletedAt());
        
        if (transaction.getStatus() == TransactionStatus.REJECTED && transaction.getRejectionReason() != null) {
            summary.put("rejectionReason", transaction.getRejectionReason());
        }
        if (transaction.getStatus() == TransactionStatus.ACCEPTED && transaction.getAcceptanceComment() != null) {
            summary.put("acceptanceComment", transaction.getAcceptanceComment());
        }
        
        return summary;
    }

    // Helper method to create detailed transaction info for pending transactions
    private Map<String, Object> createDetailedTransactionInfo(Transaction transaction) {
        Map<String, Object> detailed = createTransactionSummary(transaction);
        
        // Add items detail for validation
        if (transaction.getItems() != null) {
            List<Map<String, Object>> items = transaction.getItems().stream()
                .map(item -> {
                    Map<String, Object> itemMap = new HashMap<>();
                    itemMap.put("id", item.getId());
                    itemMap.put("itemTypeId", item.getItemType().getId());
                    itemMap.put("itemTypeName", item.getItemType().getName());
                    itemMap.put("quantity", item.getQuantity());
                    itemMap.put("measuringUnit", item.getItemType().getMeasuringUnit());
                    // Fix the category issue - get the name instead of the object
                    if (item.getItemType().getItemCategory() != null) {
                        itemMap.put("category", item.getItemType().getItemCategory().getName());
                    } else {
                        itemMap.put("category", "Uncategorized");
                    }
                    itemMap.put("status", item.getStatus());
                    return itemMap;
                })
                .collect(Collectors.toList());
            detailed.put("items", items);
        }
        
        // Add sender/receiver information
        detailed.put("senderType", transaction.getSenderType());
        detailed.put("senderId", transaction.getSenderId());
        detailed.put("receiverType", transaction.getReceiverType());
        detailed.put("receiverId", transaction.getReceiverId());
        detailed.put("addedBy", transaction.getAddedBy());
        
        return detailed;
    }

    // Get maintenance analytics for equipment dashboard
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getMaintenanceAnalytics(@PathVariable UUID equipmentId) {
        try {
            List<InSiteMaintenance> maintenanceRecords = maintenanceService.getMaintenanceByEquipmentId(equipmentId);
            
            Map<String, Object> analytics = new HashMap<>();
            
            // Calculate basic metrics
            int totalMaintenanceEvents = maintenanceRecords.size();
            long completedEvents = maintenanceRecords.stream()
                    .filter(m -> "COMPLETED".equals(m.getStatus()))
                    .count();
            long inProgressEvents = maintenanceRecords.stream()
                    .filter(m -> "IN_PROGRESS".equals(m.getStatus()))
                    .count();
            long scheduledEvents = maintenanceRecords.stream()
                    .filter(m -> "SCHEDULED".equals(m.getStatus()))
                    .count();
            long cancelledEvents = maintenanceRecords.stream()
                    .filter(m -> "CANCELLED".equals(m.getStatus()))
                    .count();
            
            // Calculate maintenance type breakdown
            Map<String, Long> maintenanceTypeBreakdown = maintenanceRecords.stream()
                    .filter(m -> m.getMaintenanceType() != null)
                    .collect(Collectors.groupingBy(
                        m -> m.getMaintenanceType().getName(),
                        Collectors.counting()
                    ));
            
            // Calculate technician performance
            Map<String, Map<String, Object>> technicianPerformance = maintenanceRecords.stream()
                    .filter(m -> m.getTechnician() != null)
                    .collect(Collectors.groupingBy(
                        m -> m.getTechnician().getFirstName() + " " + m.getTechnician().getLastName(),
                        Collectors.collectingAndThen(
                            Collectors.toList(),
                            list -> {
                                Map<String, Object> stats = new HashMap<>();
                                stats.put("totalJobs", list.size());
                                stats.put("completedJobs", list.stream().filter(m -> "COMPLETED".equals(m.getStatus())).count());
                                stats.put("completionRate", list.size() > 0 ? 
                                    (double) list.stream().filter(m -> "COMPLETED".equals(m.getStatus())).count() / list.size() * 100 : 0);
                                return stats;
                            }
                        )
                    ));
            
            // Calculate monthly maintenance breakdown (last 12 months)
            LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);
            Map<String, Map<String, Object>> monthlyBreakdown = maintenanceRecords.stream()
                    .filter(m -> m.getMaintenanceDate() != null && m.getMaintenanceDate().isAfter(twelveMonthsAgo))
                    .collect(Collectors.groupingBy(
                        m -> m.getMaintenanceDate().getYear() + "-" + 
                             String.format("%02d", m.getMaintenanceDate().getMonthValue()),
                        Collectors.collectingAndThen(
                            Collectors.toList(),
                            list -> {
                                Map<String, Object> monthStats = new HashMap<>();
                                monthStats.put("month", list.get(0).getMaintenanceDate().getYear() + "-" + 
                                              String.format("%02d", list.get(0).getMaintenanceDate().getMonthValue()));
                                monthStats.put("totalEvents", list.size());
                                monthStats.put("completedEvents", list.stream().filter(m -> "COMPLETED".equals(m.getStatus())).count());
                                monthStats.put("inProgressEvents", list.stream().filter(m -> "IN_PROGRESS".equals(m.getStatus())).count());
                                monthStats.put("scheduledEvents", list.stream().filter(m -> "SCHEDULED".equals(m.getStatus())).count());
                                monthStats.put("cancelledEvents", list.stream().filter(m -> "CANCELLED".equals(m.getStatus())).count());
                                return monthStats;
                            }
                        )
                    ));
            
            // Calculate mean time between maintenance events
            double meanTimeBetweenEvents = 0;
            if (maintenanceRecords.size() > 1) {
                List<LocalDateTime> sortedDates = maintenanceRecords.stream()
                        .filter(m -> m.getMaintenanceDate() != null)
                        .map(InSiteMaintenance::getMaintenanceDate)
                        .sorted()
                        .collect(Collectors.toList());
                
                if (sortedDates.size() > 1) {
                    long totalDaysBetween = 0;
                    for (int i = 1; i < sortedDates.size(); i++) {
                        totalDaysBetween += ChronoUnit.DAYS.between(sortedDates.get(i-1), sortedDates.get(i));
                    }
                    meanTimeBetweenEvents = (double) totalDaysBetween / (sortedDates.size() - 1);
                }
            }
            
            // Calculate maintenance efficiency metrics
            double completionRate = totalMaintenanceEvents > 0 ? (double) completedEvents / totalMaintenanceEvents * 100 : 0;
            
            // Calculate overdue maintenance (scheduled events past their date)
            long overdueEvents = maintenanceRecords.stream()
                    .filter(m -> "SCHEDULED".equals(m.getStatus()) && 
                                m.getMaintenanceDate() != null && 
                                m.getMaintenanceDate().isBefore(LocalDateTime.now()))
                    .count();
            
            // Count related transactions and consumables used
            long totalTransactions = maintenanceRecords.stream()
                    .mapToLong(m -> m.getRelatedTransactions() != null ? m.getRelatedTransactions().size() : 0)
                    .sum();
            
            // Prepare response
            analytics.put("totalMaintenanceEvents", totalMaintenanceEvents);
            analytics.put("completedEvents", completedEvents);
            analytics.put("inProgressEvents", inProgressEvents);
            analytics.put("scheduledEvents", scheduledEvents);
            analytics.put("cancelledEvents", cancelledEvents);
            analytics.put("overdueEvents", overdueEvents);
            analytics.put("completionRate", Math.round(completionRate * 100.0) / 100.0);
            analytics.put("meanTimeBetweenEvents", Math.round(meanTimeBetweenEvents * 100.0) / 100.0);
            analytics.put("totalTransactions", totalTransactions);
            analytics.put("maintenanceTypeBreakdown", maintenanceTypeBreakdown);
            analytics.put("technicianPerformance", technicianPerformance);
            analytics.put("monthlyBreakdown", monthlyBreakdown.values().stream()
                    .sorted((a, b) -> ((String) a.get("month")).compareTo((String) b.get("month")))
                    .collect(Collectors.toList()));
            
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to generate maintenance analytics: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}