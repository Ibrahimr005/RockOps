package com.example.backend.controllers.equipment;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.InSiteMaintenance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

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

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    // ========================================
    // QUERY
    // ========================================

    @GetMapping
    public ResponseEntity<List<InSiteMaintenance>> getAllMaintenanceRecords(@PathVariable UUID equipmentId) {
        try {
            return ResponseEntity.ok(maintenanceService.getMaintenanceByEquipmentId(equipmentId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/technicians")
    public ResponseEntity<List<Employee>> getAllTechnicians(@PathVariable UUID equipmentId) {
        try {
            Optional<Equipment> equipmentOpt = equipmentRepository.findById(equipmentId);
            if (equipmentOpt.isEmpty()) return ResponseEntity.ok(new ArrayList<>());

            Site site = equipmentOpt.get().getSite();
            if (site == null) return ResponseEntity.ok(new ArrayList<>());

            List<Employee> employees = employeeRepository.findBySiteIdWithJobPosition(site.getId());
            return ResponseEntity.ok(employees != null ? employees : new ArrayList<>());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    // ========================================
    // CREATE MAINTENANCE
    // Transactions are created by the warehouse, not equipment.
    // This endpoint only creates the maintenance record and optionally accepts/rejects
    // an already-pending transaction that was sent by a warehouse.
    // ========================================

    @PostMapping
    public ResponseEntity<?> createMaintenance(
            @PathVariable UUID equipmentId,
            @RequestBody Map<String, Object> maintenanceData,
            @AuthenticationPrincipal UserDetails userDetails) {

        Map<String, Object> response = new HashMap<>();

        try {
            // Maintenance data received

            UUID technicianId = UUID.fromString((String) maintenanceData.get("technicianId"));
            LocalDateTime maintenanceDate = LocalDateTime.parse((String) maintenanceData.get("maintenanceDate"));
            String description = (String) maintenanceData.get("description");
            String status = (String) maintenanceData.get("status");

            Object batchNumberObj = maintenanceData.get("batchNumber");
            Integer batchNumber = (batchNumberObj != null && !batchNumberObj.toString().isBlank())
                    ? Integer.parseInt(batchNumberObj.toString()) : null;

            // Create the maintenance record
            InSiteMaintenance maintenance;
            Object maintenanceTypeIdObj = maintenanceData.get("maintenanceTypeId");
            Object maintenanceTypeObj = maintenanceData.get("maintenanceType");

            if (maintenanceTypeIdObj != null) {
                UUID maintenanceTypeId = UUID.fromString(maintenanceTypeIdObj.toString());
                maintenance = maintenanceService.createMaintenance(
                        equipmentId, technicianId, maintenanceDate, maintenanceTypeId, description, status);
            } else if (maintenanceTypeObj != null) {
                maintenance = maintenanceService.createMaintenance(
                        equipmentId, technicianId, maintenanceDate, maintenanceTypeObj.toString(), description, status);
            } else {
                throw new IllegalArgumentException("Either maintenanceTypeId or maintenanceType must be provided");
            }

            // Optional: validate an existing pending transaction inline
            @SuppressWarnings("unchecked")
            Map<String, Object> transactionValidation =
                    (Map<String, Object>) maintenanceData.get("transactionValidation");

            if (transactionValidation != null) {
                UUID transactionId = UUID.fromString(transactionValidation.get("transactionId").toString());
                String action = (String) transactionValidation.get("action");
                String comments = (String) transactionValidation.get("comments");
                String rejectionReason = (String) transactionValidation.get("rejectionReason");

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> receivedItems =
                        (List<Map<String, Object>>) transactionValidation.get("receivedItems");

                try {
                    Transaction validatedTransaction;

                    if ("reject".equals(action)) {
                        // Equipment rejects the incoming warehouse transaction
                        validatedTransaction = transactionService.rejectTransaction(
                                transactionId, rejectionReason, userDetails.getUsername());

                    } else if ("accept".equals(action)) {
                        Map<UUID, Integer> receivedQuantities = new HashMap<>();
                        Map<UUID, Boolean> itemsNotReceived = new HashMap<>();

                        for (Map<String, Object> item : receivedItems) {
                            UUID itemId = UUID.fromString(item.get("transactionItemId").toString());
                            Integer receivedQty = item.get("receivedQuantity") != null
                                    ? Integer.parseInt(item.get("receivedQuantity").toString()) : 0;
                            Boolean notReceived = Boolean.parseBoolean(item.get("itemNotReceived").toString());

                            receivedQuantities.put(itemId, receivedQty);
                            itemsNotReceived.put(itemId, notReceived);
                        }

                        // Accept with MAINTENANCE purpose
                        validatedTransaction = transactionService.acceptTransactionWithPurpose(
                                transactionId, receivedQuantities, itemsNotReceived,
                                userDetails.getUsername(), comments, TransactionPurpose.MAINTENANCE);

                    } else {
                        throw new IllegalArgumentException("Invalid action. Must be 'accept' or 'reject'");
                    }

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
                // Link an already-completed transaction by batch number
                Optional<Transaction> existingTransaction = maintenanceService.findTransactionByBatchNumber(batchNumber);

                if (existingTransaction.isPresent()) {
                    Transaction transaction = existingTransaction.get();
                    maintenance = maintenanceService.linkTransactionToMaintenance(
                            maintenance.getId(), transaction.getId());

                    response.put("maintenance", maintenance);
                    response.put("transaction", transaction);
                    response.put("status", "linked");
                } else {
                    response.put("maintenance", maintenance);
                    response.put("status", "transaction_not_found");
                    response.put("message", "Maintenance record created, but no transaction found with batch number " + batchNumber);
                }

                return ResponseEntity.ok(response);

            } else {
                // No transaction involved
                response.put("maintenance", maintenance);
                response.put("status", "created");
                return ResponseEntity.ok(response);
            }

        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // ========================================
    // UPDATE / DELETE
    // ========================================

    @PutMapping("/{maintenanceId}")
    public ResponseEntity<InSiteMaintenance> updateMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @RequestBody Map<String, Object> maintenanceData) {

        UUID technicianId = UUID.fromString((String) maintenanceData.get("technicianId"));
        LocalDateTime maintenanceDate = LocalDateTime.parse((String) maintenanceData.get("maintenanceDate"));
        String description = (String) maintenanceData.get("description");
        String status = (String) maintenanceData.get("status");

        Object maintenanceTypeIdObj = maintenanceData.get("maintenanceTypeId");
        Object maintenanceTypeObj = maintenanceData.get("maintenanceType");

        InSiteMaintenance maintenance;
        if (maintenanceTypeIdObj != null) {
            UUID maintenanceTypeId = UUID.fromString(maintenanceTypeIdObj.toString());
            maintenance = maintenanceService.updateMaintenance(
                    maintenanceId, technicianId, maintenanceDate, maintenanceTypeId, description, status);
        } else if (maintenanceTypeObj != null) {
            maintenance = maintenanceService.updateMaintenance(
                    maintenanceId, technicianId, maintenanceDate, maintenanceTypeObj.toString(), description, status);
        } else {
            throw new IllegalArgumentException("Either maintenanceTypeId or maintenanceType must be provided");
        }

        return ResponseEntity.ok(maintenance);
    }

    @DeleteMapping("/{maintenanceId}")
    public ResponseEntity<Void> deleteMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId) {
        maintenanceService.deleteMaintenance(maintenanceId);
        return ResponseEntity.noContent().build();
    }

    // ========================================
    // TRANSACTION LINKING
    // Transactions are always created by the warehouse.
    // Equipment can only link an existing pending transaction to a maintenance record.
    // ========================================

    @PostMapping("/{maintenanceId}/link-transaction/{transactionId}")
    public ResponseEntity<InSiteMaintenance> linkTransactionToMaintenance(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @PathVariable UUID transactionId) {
        InSiteMaintenance maintenance = maintenanceService.linkTransactionToMaintenance(maintenanceId, transactionId);
        return ResponseEntity.ok(maintenance);
    }

    /**
     * Check if a transaction exists by batch number.
     * Used by the frontend to decide whether to link a pending transaction
     * or inform the user that the warehouse needs to create one.
     */
    @GetMapping("/check-transaction/{batchNumber}")
    public ResponseEntity<?> checkTransactionExists(
            @PathVariable UUID equipmentId,
            @PathVariable int batchNumber) {

        Map<String, Object> response = new HashMap<>();

        try {
            Optional<Transaction> transactionOpt = maintenanceService.findTransactionByBatchNumber(batchNumber);

            if (transactionOpt.isPresent()) {
                Transaction transaction = transactionOpt.get();

                if (transaction.getStatus() == TransactionStatus.ACCEPTED
                        || transaction.getStatus() == TransactionStatus.REJECTED) {
                    response.put("scenario", "already_handled");
                    response.put("found", true);
                    response.put("message", String.format(
                            "Transaction with batch number %d has already been %s.",
                            batchNumber, transaction.getStatus().toString().toLowerCase()));
                    response.put("transaction", createTransactionSummary(transaction));

                } else if (transaction.getStatus() == TransactionStatus.PENDING) {
                    response.put("scenario", "pending_validation");
                    response.put("found", true);
                    response.put("message", "Pending transaction found. You can link it to this maintenance record and validate it.");
                    response.put("transaction", createDetailedTransactionInfo(transaction));

                } else {
                    response.put("scenario", "other_status");
                    response.put("found", true);
                    response.put("message", String.format(
                            "Transaction found but it is currently %s. Only pending transactions can be linked.",
                            transaction.getStatus().toString().toLowerCase()));
                    response.put("transaction", createTransactionSummary(transaction));
                }
            } else {
                response.put("scenario", "not_found");
                response.put("found", false);
                response.put("message", "No transaction found with batch number " + batchNumber
                        + ". Please ask the warehouse to create one.");
                response.put("allowCreateNew", false); // Equipment cannot create transactions
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // ========================================
    // ANALYTICS
    // ========================================

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getMaintenanceAnalytics(@PathVariable UUID equipmentId) {
        try {
            List<InSiteMaintenance> records = maintenanceService.getMaintenanceByEquipmentId(equipmentId);
            Map<String, Object> analytics = new HashMap<>();

            long completed  = records.stream().filter(m -> "COMPLETED".equals(m.getStatus())).count();
            long inProgress = records.stream().filter(m -> "IN_PROGRESS".equals(m.getStatus())).count();
            long scheduled  = records.stream().filter(m -> "SCHEDULED".equals(m.getStatus())).count();
            long cancelled  = records.stream().filter(m -> "CANCELLED".equals(m.getStatus())).count();
            long overdue    = records.stream()
                    .filter(m -> "SCHEDULED".equals(m.getStatus())
                            && m.getMaintenanceDate() != null
                            && m.getMaintenanceDate().isBefore(LocalDateTime.now()))
                    .count();

            double completionRate = records.size() > 0
                    ? (double) completed / records.size() * 100 : 0;

            // Mean time between events
            double meanTimeBetween = 0;
            List<LocalDateTime> sortedDates = records.stream()
                    .filter(m -> m.getMaintenanceDate() != null)
                    .map(InSiteMaintenance::getMaintenanceDate)
                    .sorted()
                    .collect(Collectors.toList());
            if (sortedDates.size() > 1) {
                long total = 0;
                for (int i = 1; i < sortedDates.size(); i++) {
                    total += ChronoUnit.DAYS.between(sortedDates.get(i - 1), sortedDates.get(i));
                }
                meanTimeBetween = (double) total / (sortedDates.size() - 1);
            }

            // Maintenance type breakdown
            Map<String, Long> typeBreakdown = records.stream()
                    .filter(m -> m.getMaintenanceType() != null)
                    .collect(Collectors.groupingBy(
                            m -> m.getMaintenanceType().getName(), Collectors.counting()));

            // Technician performance
            Map<String, Map<String, Object>> techPerformance = records.stream()
                    .filter(m -> m.getTechnician() != null)
                    .collect(Collectors.groupingBy(
                            m -> m.getTechnician().getFirstName() + " " + m.getTechnician().getLastName(),
                            Collectors.collectingAndThen(Collectors.toList(), list -> {
                                Map<String, Object> stats = new HashMap<>();
                                long done = list.stream().filter(m -> "COMPLETED".equals(m.getStatus())).count();
                                stats.put("totalJobs", list.size());
                                stats.put("completedJobs", done);
                                stats.put("completionRate", list.size() > 0 ? (double) done / list.size() * 100 : 0);
                                return stats;
                            })));

            // Monthly breakdown (last 12 months)
            LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);
            List<Map<String, Object>> monthlyBreakdown = records.stream()
                    .filter(m -> m.getMaintenanceDate() != null && m.getMaintenanceDate().isAfter(twelveMonthsAgo))
                    .collect(Collectors.groupingBy(
                            m -> m.getMaintenanceDate().getYear() + "-"
                                    + String.format("%02d", m.getMaintenanceDate().getMonthValue()),
                            Collectors.collectingAndThen(Collectors.toList(), list -> {
                                Map<String, Object> month = new HashMap<>();
                                month.put("month", list.get(0).getMaintenanceDate().getYear() + "-"
                                        + String.format("%02d", list.get(0).getMaintenanceDate().getMonthValue()));
                                month.put("totalEvents",     list.size());
                                month.put("completedEvents", list.stream().filter(m -> "COMPLETED".equals(m.getStatus())).count());
                                month.put("inProgressEvents",list.stream().filter(m -> "IN_PROGRESS".equals(m.getStatus())).count());
                                month.put("scheduledEvents", list.stream().filter(m -> "SCHEDULED".equals(m.getStatus())).count());
                                month.put("cancelledEvents", list.stream().filter(m -> "CANCELLED".equals(m.getStatus())).count());
                                return month;
                            })))
                    .values().stream()
                    .sorted(Comparator.comparing(m -> (String) m.get("month")))
                    .collect(Collectors.toList());

            long totalTransactions = records.stream()
                    .mapToLong(m -> m.getRelatedTransactions() != null ? m.getRelatedTransactions().size() : 0)
                    .sum();

            analytics.put("totalMaintenanceEvents", records.size());
            analytics.put("completedEvents",   completed);
            analytics.put("inProgressEvents",  inProgress);
            analytics.put("scheduledEvents",   scheduled);
            analytics.put("cancelledEvents",   cancelled);
            analytics.put("overdueEvents",     overdue);
            analytics.put("completionRate",    Math.round(completionRate * 100.0) / 100.0);
            analytics.put("meanTimeBetweenEvents", Math.round(meanTimeBetween * 100.0) / 100.0);
            analytics.put("totalTransactions", totalTransactions);
            analytics.put("maintenanceTypeBreakdown", typeBreakdown);
            analytics.put("technicianPerformance",    techPerformance);
            analytics.put("monthlyBreakdown",         monthlyBreakdown);

            return ResponseEntity.ok(analytics);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to generate analytics: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // ========================================
    // PRIVATE HELPERS
    // ========================================

    private Map<String, Object> createTransactionSummary(Transaction transaction) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("id",              transaction.getId());
        summary.put("batchNumber",     transaction.getBatchNumber());
        summary.put("status",          transaction.getStatus());
        summary.put("purpose",         transaction.getPurpose());
        summary.put("itemCount",       transaction.getItems() != null ? transaction.getItems().size() : 0);
        summary.put("transactionDate", transaction.getTransactionDate());
        summary.put("completedAt",     transaction.getCompletedAt());

        if (transaction.getStatus() == TransactionStatus.REJECTED && transaction.getRejectionReason() != null) {
            summary.put("rejectionReason", transaction.getRejectionReason());
        }
        if (transaction.getStatus() == TransactionStatus.ACCEPTED && transaction.getAcceptanceComment() != null) {
            summary.put("acceptanceComment", transaction.getAcceptanceComment());
        }
        return summary;
    }

    private Map<String, Object> createDetailedTransactionInfo(Transaction transaction) {
        Map<String, Object> detailed = createTransactionSummary(transaction);

        if (transaction.getItems() != null) {
            List<Map<String, Object>> items = transaction.getItems().stream()
                    .map(item -> {
                        Map<String, Object> itemMap = new HashMap<>();
                        itemMap.put("id",           item.getId());
                        itemMap.put("itemTypeId",   item.getItemType().getId());
                        itemMap.put("itemTypeName", item.getItemType().getName());
                        itemMap.put("quantity",     item.getQuantity());
                        itemMap.put("measuringUnit",item.getItemType().getMeasuringUnit());
                        itemMap.put("category",     item.getItemType().getItemCategory() != null
                                ? item.getItemType().getItemCategory().getName() : "Uncategorized");
                        itemMap.put("status",       item.getStatus());
                        return itemMap;
                    })
                    .collect(Collectors.toList());
            detailed.put("items", items);
        }

        detailed.put("senderType",   transaction.getSenderType());
        detailed.put("senderId",     transaction.getSenderId());
        detailed.put("receiverType", transaction.getReceiverType());
        detailed.put("receiverId",   transaction.getReceiverId());
        detailed.put("addedBy",      transaction.getAddedBy());
        return detailed;
    }
}