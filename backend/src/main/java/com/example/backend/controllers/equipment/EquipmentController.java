package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.*;
import com.example.backend.dto.hr.EmployeeSummaryDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.services.equipment.ConsumablesService;
import com.example.backend.services.equipment.EquipmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import com.example.backend.models.equipment.EquipmentStatus;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    @Autowired
    private EquipmentService equipmentService;

    @Autowired
    private ConsumablesService consumablesService;



    // GET endpoints

    @GetMapping
    public ResponseEntity<List<EquipmentDTO>> getAllEquipment() {
        return ResponseEntity.ok(equipmentService.getAllEquipment());
    }

    @GetMapping("/status-options")
    public ResponseEntity<List<Map<String, String>>> getEquipmentStatusOptions() {
        List<Map<String, String>> statusOptions = new ArrayList<>();
        
        for (EquipmentStatus status : EquipmentStatus.values()) {
            Map<String, String> option = new HashMap<>();
            option.put("value", status.name());
            option.put("label", status.name().replace("_", " "));
            statusOptions.add(option);
        }
        
        return ResponseEntity.ok(statusOptions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipmentDTO> getEquipmentById(@PathVariable UUID id) {
        return ResponseEntity.ok(equipmentService.getEquipmentById(id));
    }

    @GetMapping("/type/{typeId}")
    public ResponseEntity<List<EquipmentDTO>> getEquipmentByType(@PathVariable UUID typeId) {
        return ResponseEntity.ok(equipmentService.getEquipmentByType(typeId));
    }

    @GetMapping("/{equipmentId}/consumables")
    public ResponseEntity<List<ConsumableDetailDTO>> getEquipmentConsumables(@PathVariable UUID equipmentId) {
        List<Consumable> consumables = consumablesService.getConsumablesByEquipmentId(equipmentId);
        List<ConsumableDetailDTO> consumableDetails = consumables.stream()
                .map(ConsumableDetailDTO::fromConsumable)
                .collect(Collectors.toList());
        return ResponseEntity.ok(consumableDetails);
    }

    // POST endpoints - Using both DTO and Map approaches for backward compatibility

    @PostMapping
    public ResponseEntity<?> addEquipment(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam Map<String, Object> requestBody) {
        try {
            System.out.println("=== CONTROLLER: Received equipment creation request ===");
            System.out.println("Request Body Keys: " + requestBody.keySet());
            if (file != null) {
                System.out.println("File received: " + file.getOriginalFilename() + " (" + file.getSize() + " bytes)");
            }
            
            EquipmentDTO savedEquipment = equipmentService.createEquipment(requestBody, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedEquipment);
        } catch (IllegalArgumentException e) {
            System.err.println("CONTROLLER ERROR (Bad Request): " + e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Bad Request");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("status", 400);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            System.err.println("CONTROLLER ERROR (Internal Server Error): " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Internal Server Error");
            errorResponse.put("message", "Failed to create equipment: " + e.getMessage());
            errorResponse.put("status", 500);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/dto")
    public ResponseEntity<EquipmentDTO> addEquipmentWithDTO(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestBody EquipmentCreateDTO createDTO) throws Exception {
        EquipmentDTO savedEquipment = equipmentService.createEquipment(createDTO, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedEquipment);
    }

    // PUT endpoints - Using both DTO and Map approaches for backward compatibility

    @PutMapping("/{id}")
    public ResponseEntity<EquipmentDTO> updateEquipment(
            @PathVariable UUID id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam Map<String, Object> requestBody) throws Exception {

        System.out.println("Received Request Body: " + requestBody);
        if (file != null) {
            System.out.println("Received File: " + file.getOriginalFilename());
        }

        EquipmentDTO updatedEquipment = equipmentService.updateEquipment(id, requestBody, file);
        return ResponseEntity.ok(updatedEquipment);
    }

    @PutMapping("/dto/{id}")
    public ResponseEntity<EquipmentDTO> updateEquipmentWithDTO(
            @PathVariable UUID id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestBody EquipmentUpdateDTO updateDTO) throws Exception {

        EquipmentDTO updatedEquipment = equipmentService.updateEquipment(id, updateDTO, file);
        return ResponseEntity.ok(updatedEquipment);
    }

    // PATCH endpoints for status update - Using both DTO and Map approaches

    @PatchMapping("/status/{id}")
    public ResponseEntity<EquipmentDTO> updateEquipmentStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> requestBody) {

        EquipmentDTO updatedEquipment = equipmentService.updateEquipmentStatus(id, requestBody);
        return ResponseEntity.ok(updatedEquipment);
    }

    @PatchMapping("/status/dto/{id}")
    public ResponseEntity<EquipmentDTO> updateEquipmentStatusWithDTO(
            @PathVariable UUID id,
            @RequestBody EquipmentStatusUpdateDTO statusDTO) {

        EquipmentDTO updatedEquipment = equipmentService.updateEquipmentStatus(id, statusDTO);
        return ResponseEntity.ok(updatedEquipment);
    }

    // DELETE endpoint

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEquipment(@PathVariable UUID id) {
        equipmentService.deleteEquipment(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all eligible drivers for a specific equipment type
     */
    @GetMapping("/type/{typeId}/eligible-drivers")
    public ResponseEntity<List<EmployeeSummaryDTO>> getEligibleDriversForEquipmentType(@PathVariable UUID typeId) {
        return ResponseEntity.ok(equipmentService.getEligibleDriversForEquipmentType(typeId));
    }

    /**
     * Get all drivers who can operate a specific equipment type for sarky logs (includes already assigned drivers)
     */
    @GetMapping("/type/{typeId}/sarky-drivers")
    public ResponseEntity<List<EmployeeSummaryDTO>> getDriversForSarkyByEquipmentType(@PathVariable UUID typeId) {
        return ResponseEntity.ok(equipmentService.getDriversForSarkyByEquipmentType(typeId));
    }

    /**
     * Check if an employee can be assigned as a driver for a specific equipment
     */
    @GetMapping("/{equipmentId}/check-driver-compatibility/{employeeId}")
    public ResponseEntity<EquipmentService.DriverCompatibilityResponse> checkDriverCompatibility(
            @PathVariable UUID equipmentId,
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(equipmentService.checkDriverCompatibility(equipmentId, employeeId));
    }

    /**
     * Get supported work types for a specific equipment type
     */
    @GetMapping("/type/{typeId}/supported-work-types")
    public ResponseEntity<List<WorkTypeDTO>> getSupportedWorkTypesForEquipmentType(@PathVariable UUID typeId) {
        return ResponseEntity.ok(equipmentService.getSupportedWorkTypesForEquipmentType(typeId));
    }

    /**
     * Get sarky analytics data for a specific equipment
     */
    @GetMapping("/{equipmentId}/sarky-analytics")
    public ResponseEntity<EquipmentSarkyAnalyticsDTO> getSarkyAnalyticsForEquipment(@PathVariable UUID equipmentId) {
        return ResponseEntity.ok(equipmentService.getSarkyAnalyticsForEquipment(equipmentId));
    }

    // Update in EquipmentController.java
    @GetMapping("/{equipmentId}/consumables/by-category/{category}")
    public ResponseEntity<List<ConsumableDetailDTO>> getEquipmentConsumablesByCategory(
            @PathVariable UUID equipmentId,
            @PathVariable String category) {

        List<Consumable> consumables;

        switch(category.toLowerCase()) {
            case "current":
                // Regular inventory items (anything that's not STOLEN or OVERRECEIVED and not resolved)
                consumables = consumablesService.getRegularConsumables(equipmentId);
                break;
            case "shortage":
                // Items marked as STOLEN (underage) and not resolved
                consumables = consumablesService.getConsumablesByEquipmentIdAndStatus(equipmentId, ItemStatus.MISSING)
                        .stream().filter(c -> !c.isResolved()).collect(Collectors.toList());
                break;
            case "surplus":
                // Items marked as OVERRECEIVED (overage) and not resolved
                consumables = consumablesService.getConsumablesByEquipmentIdAndStatus(equipmentId, ItemStatus.OVERRECEIVED)
                        .stream().filter(c -> !c.isResolved()).collect(Collectors.toList());
                break;
            case "resolved":
                // Resolved items for history tab
                consumables = consumablesService.getResolvedConsumables(equipmentId);
                break;
            default:
                // All consumables regardless of status
                consumables = consumablesService.getConsumablesByEquipmentId(equipmentId);
        }

        List<ConsumableDetailDTO> consumableDetails = consumables.stream()
                .map(ConsumableDetailDTO::fromConsumable)
                .collect(Collectors.toList());

        return ResponseEntity.ok(consumableDetails);
    }

    @GetMapping("/{equipmentId}/consumables/analytics")
    public ResponseEntity<Map<String, Object>> getConsumableAnalytics(@PathVariable UUID equipmentId) {
        try {
            List<Consumable> consumables = consumablesService.getConsumablesByEquipmentId(equipmentId);
            
            Map<String, Object> analytics = new HashMap<>();
            
            // Calculate basic metrics
            int totalItems = consumables.size();
            double totalValue = consumables.stream()
                .mapToDouble(c -> c.getQuantity())
                .sum();
            
            // Calculate category breakdown
            Map<String, Object> categoryBreakdown = consumables.stream()
                .filter(c -> c.getItemType() != null && c.getItemType().getItemCategory() != null)
                .collect(Collectors.groupingBy(
                    c -> c.getItemType().getItemCategory().getName(),
                    Collectors.collectingAndThen(
                        Collectors.toList(),
                        list -> {
                            Map<String, Object> categoryStats = new HashMap<>();
                            categoryStats.put("totalItems", list.size());
                            categoryStats.put("totalQuantity", list.stream().mapToInt(Consumable::getQuantity).sum());
                            categoryStats.put("avgQuantity", list.stream().mapToInt(Consumable::getQuantity).average().orElse(0));
                            return categoryStats;
                        }
                    )
                ));
            
            // Calculate most used items
            Map<String, Long> topConsumables = consumables.stream()
                .filter(c -> c.getItemType() != null)
                .collect(Collectors.groupingBy(
                    c -> c.getItemType().getName(),
                    Collectors.summingLong(Consumable::getQuantity)
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    Map.Entry::getValue,
                    (e1, e2) -> e1,
                    LinkedHashMap::new
                ));
            
            // Calculate monthly consumption trends
            Map<String, Object> monthlyTrends = consumables.stream()
                .filter(c -> c.getTransaction() != null && c.getTransaction().getTransactionDate() != null)
                .collect(Collectors.groupingBy(
                    c -> {
                        LocalDateTime date = c.getTransaction().getTransactionDate();
                        return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
                    },
                    Collectors.collectingAndThen(
                        Collectors.toList(),
                        list -> {
                            Map<String, Object> monthStats = new HashMap<>();
                            monthStats.put("totalItems", list.size());
                            monthStats.put("totalQuantity", list.stream().mapToInt(Consumable::getQuantity).sum());
                            monthStats.put("uniqueTypes", list.stream()
                                .filter(c -> c.getItemType() != null)
                                .map(c -> c.getItemType().getName())
                                .collect(Collectors.toSet()).size());
                            return monthStats;
                        }
                    )
                ));
            
            // Calculate low stock alerts (items with quantity <= 5)
            List<Map<String, Object>> lowStockItems = consumables.stream()
                .filter(c -> c.getQuantity() <= 5 && c.getItemType() != null)
                .map(c -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("itemName", c.getItemType().getName());
                    item.put("currentQuantity", c.getQuantity());
                    item.put("category", c.getItemType().getItemCategory() != null ? 
                        c.getItemType().getItemCategory().getName() : "Uncategorized");
                    return item;
                })
                .collect(Collectors.toList());
            
            // Calculate reorder frequency (transactions per month for each item)
            Map<String, Object> reorderFrequency = consumables.stream()
                .filter(c -> c.getItemType() != null && c.getTransaction() != null)
                .collect(Collectors.groupingBy(
                    c -> c.getItemType().getName(),
                    Collectors.collectingAndThen(
                        Collectors.toList(),
                        list -> {
                            Map<String, Object> stats = new HashMap<>();
                            stats.put("totalTransactions", list.size());
                            stats.put("totalQuantity", list.stream().mapToInt(Consumable::getQuantity).sum());
                            stats.put("avgQuantityPerTransaction", 
                                list.stream().mapToInt(Consumable::getQuantity).average().orElse(0));
                            
                            // Calculate months with transactions
                            Set<String> monthsWithTransactions = list.stream()
                                .filter(c -> c.getTransaction().getTransactionDate() != null)
                                .map(c -> {
                                    LocalDateTime date = c.getTransaction().getTransactionDate();
                                    return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
                                })
                                .collect(Collectors.toSet());
                            
                            stats.put("monthsActive", monthsWithTransactions.size());
                            stats.put("avgTransactionsPerMonth", 
                                monthsWithTransactions.size() > 0 ? (double) list.size() / monthsWithTransactions.size() : 0);
                            
                            return stats;
                        }
                    )
                ));
            
            analytics.put("totalItems", totalItems);
            analytics.put("totalQuantity", totalValue);
            analytics.put("categoryBreakdown", categoryBreakdown);
            analytics.put("topConsumables", topConsumables);
            analytics.put("monthlyTrends", monthlyTrends);
            analytics.put("lowStockItems", lowStockItems);
            analytics.put("reorderFrequency", reorderFrequency);
            analytics.put("lowStockCount", lowStockItems.size());
            analytics.put("categoriesCount", categoryBreakdown.size());
            analytics.put("topConsumablesCount", topConsumables.size());
            
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to generate consumable analytics: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

}