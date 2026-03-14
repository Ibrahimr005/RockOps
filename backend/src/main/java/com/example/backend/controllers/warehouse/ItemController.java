package com.example.backend.controllers.warehouse;


import com.example.backend.dto.item.ItemResolutionDTO;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemResolution;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.services.warehouse.ItemCategoryService;
import com.example.backend.services.warehouse.ItemService;
import com.example.backend.services.warehouse.WarehouseService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/items")
public class ItemController {

    private static final Logger log = LoggerFactory.getLogger(ItemController.class);

    @Autowired
    private ItemService itemService;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private ItemCategoryService itemCategoryService;

    // Existing endpoints
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<Item>> getItemsByWarehouse(@PathVariable UUID warehouseId) {
        try {
            if (warehouseId == null) {
                return ResponseEntity.badRequest().build();
            }

            List<Item> items = itemService.getItemsByWarehouse(warehouseId);
            log.debug("Fetched {} items for warehouse {}", items != null ? items.size() : 0, warehouseId);

            return ResponseEntity.ok(items);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid argument fetching items for warehouse {}: {}", warehouseId, e.getMessage());
            return ResponseEntity.badRequest().build();

        } catch (Exception e) {
            log.error("Error fetching items for warehouse {}", warehouseId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping()
    public ResponseEntity<?> createItem(@RequestBody Map<String, Object> request) {
        try {
            log.debug("Received create item request: {}", request);

            // Validate required fields
            if (!request.containsKey("itemTypeId") || request.get("itemTypeId") == null) {
                throw new IllegalArgumentException("itemTypeId is required");
            }
            if (!request.containsKey("warehouseId") || request.get("warehouseId") == null) {
                throw new IllegalArgumentException("warehouseId is required");
            }
            if (!request.containsKey("initialQuantity") || request.get("initialQuantity") == null) {
                throw new IllegalArgumentException("initialQuantity is required");
            }
            if (!request.containsKey("username") || request.get("username") == null) {
                throw new IllegalArgumentException("username is required");
            }

            UUID itemTypeId = UUID.fromString(request.get("itemTypeId").toString());
            UUID warehouseId = UUID.fromString(request.get("warehouseId").toString());

            // Handle initialQuantity - it might come as Integer or Double from JSON
            int initialQuantity;
            Object quantityObj = request.get("initialQuantity");
            if (quantityObj instanceof Integer) {
                initialQuantity = (Integer) quantityObj;
            } else if (quantityObj instanceof Double) {
                initialQuantity = ((Double) quantityObj).intValue();
            } else {
                initialQuantity = Integer.parseInt(quantityObj.toString());
            }

            String username = request.get("username").toString();

            // Convert date string to LocalDateTime
            String dateString = (String) request.get("createdAt");
            LocalDateTime createdAt;
            if (dateString != null && !dateString.isEmpty()) {
                LocalDate date = LocalDate.parse(dateString);
                createdAt = date.atStartOfDay();
            } else {
                createdAt = LocalDateTime.now();
            }

            log.debug("Parsed values - ItemTypeId: {}, WarehouseId: {}, Quantity: {}, Username: {}, CreatedAt: {}",
                    itemTypeId, warehouseId, initialQuantity, username, createdAt);

            Item newItem = itemService.createItem(itemTypeId, warehouseId, initialQuantity, username, createdAt);
            log.debug("Item created successfully");
            return ResponseEntity.ok(newItem);

        } catch (IllegalArgumentException e) {
            log.warn("Validation error creating item: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Validation Error", "message", e.getMessage()));

        } catch (RuntimeException e) {
            log.error("Runtime error creating item: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server Error", "message", e.getMessage()));

        } catch (Exception e) {
            log.error("Unexpected error creating item: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server Error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID itemId) {
        try {
            itemService.deleteItem(itemId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // RESOLUTION ENDPOINTS

    @PostMapping("/resolve-discrepancy")
    public ResponseEntity<?> resolveDiscrepancy(@RequestBody ItemResolutionDTO request) {
        try {
            log.debug("Resolution endpoint called for item: {}", request.getItemId());
            ItemResolution resolution = itemService.resolveDiscrepancy(request);
            log.debug("Resolution successful: {}", resolution.getId());
            return ResponseEntity.ok(resolution);
        } catch (IllegalArgumentException e) {
            log.warn("Bad request for resolution: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Server error during resolution", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/{itemId}/resolutions")
    public ResponseEntity<List<ItemResolution>> getItemResolutionHistory(@PathVariable UUID itemId) {
        try {
            List<ItemResolution> resolutions = itemService.getItemResolutionHistory(itemId);
            return ResponseEntity.ok(resolutions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/warehouse/{warehouseId}/discrepancies")
    public ResponseEntity<List<Item>> getDiscrepancyItems(@PathVariable UUID warehouseId) {
        try {
            List<Item> discrepancyItems = itemService.getDiscrepancyItems(warehouseId);
            return ResponseEntity.ok(discrepancyItems);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // NEW ENDPOINT - Get resolved items for history tab
    @GetMapping("/warehouse/{warehouseId}/resolved")
    public ResponseEntity<List<Item>> getResolvedItems(@PathVariable UUID warehouseId) {
        try {
            List<Item> resolvedItems = itemService.getResolvedItems(warehouseId);
            return ResponseEntity.ok(resolvedItems);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/resolutions/user/{username}")
    public ResponseEntity<List<ItemResolution>> getResolutionsByUser(@PathVariable String username) {
        try {
            List<ItemResolution> resolutions = itemService.getItemResolutionsByUser(username);
            return ResponseEntity.ok(resolutions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // UPDATED ENDPOINTS - Now filter by resolved status

    @GetMapping("/warehouse/{warehouseId}/stolen")
    public ResponseEntity<List<Item>> getStolenItems(@PathVariable UUID warehouseId) {
        try {
            List<Item> items = itemService.getItemsByWarehouse(warehouseId);
            List<Item> stolenItems = items.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.MISSING && !item.isResolved())
                    .toList();
            return ResponseEntity.ok(stolenItems);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/warehouse/{warehouseId}/overreceived")
    public ResponseEntity<List<Item>> getOverReceivedItems(@PathVariable UUID warehouseId) {
        try {
            List<Item> items = itemService.getItemsByWarehouse(warehouseId);
            List<Item> overReceivedItems = items.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.OVERRECEIVED && !item.isResolved())
                    .toList();
            return ResponseEntity.ok(overReceivedItems);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/warehouse/{warehouseId}/counts")
    public ResponseEntity<Map<String, Long>> getItemStatusCounts(@PathVariable UUID warehouseId) {
        try {
            List<Item> items = itemService.getItemsByWarehouse(warehouseId);

            long inWarehouseCount = items.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.IN_WAREHOUSE && !item.isResolved())
                    .count();

            // Only count UNRESOLVED discrepancies
            long stolenCount = items.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.MISSING && !item.isResolved())
                    .count();

            long overReceivedCount = items.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.OVERRECEIVED && !item.isResolved())
                    .count();

            long deliveringCount = items.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.DELIVERING && !item.isResolved())
                    .count();

            long pendingCount = items.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.PENDING && !item.isResolved())
                    .count();

            // Count resolved items for history tab
            long resolvedCount = items.stream()
                    .filter(Item::isResolved)
                    .count();

            Map<String, Long> counts = Map.of(
                    "inWarehouse", inWarehouseCount,
                    "stolen", stolenCount,
                    "overReceived", overReceivedCount,
                    "delivering", deliveringCount,
                    "pending", pendingCount,
                    "resolved", resolvedCount,
                    "total", (long) items.size()
            );

            return ResponseEntity.ok(counts);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Updated endpoint to check if an item can be resolved
    @GetMapping("/{itemId}/can-resolve")
    public ResponseEntity<Map<String, Object>> canResolveItem(@PathVariable UUID itemId) {
        try {
            Item item = itemService.getItemById(itemId);

            boolean canResolve = !item.isResolved() &&
                    (item.getItemStatus() == ItemStatus.MISSING ||
                            item.getItemStatus() == ItemStatus.OVERRECEIVED);

            Map<String, Object> response = Map.of(
                    "canResolve", canResolve,
                    "status", item.getItemStatus().toString(),
                    "resolved", item.isResolved()
            );

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> errorResponse = Map.of(
                    "canResolve", false,
                    "error", e.getMessage()
            );
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // NEW USEFUL ENDPOINTS

    @GetMapping("/warehouse/{warehouseId}/active")
    public ResponseEntity<List<Item>> getActiveItems(@PathVariable UUID warehouseId) {
        try {
            List<Item> items = itemService.getItemsByWarehouse(warehouseId);
            List<Item> activeItems = items.stream()
                    .filter(item -> !item.isResolved()) // Only unresolved items
                    .toList();
            return ResponseEntity.ok(activeItems);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/warehouse/{warehouseId}/summary")
    public ResponseEntity<Map<String, Object>> getWarehouseSummary(@PathVariable UUID warehouseId) {
        try {
            List<Item> allItems = itemService.getItemsByWarehouse(warehouseId);

            long totalItems = allItems.size();
            long activeDiscrepancies = allItems.stream()
                    .filter(item -> !item.isResolved() &&
                            (item.getItemStatus() == ItemStatus.MISSING ||
                                    item.getItemStatus() == ItemStatus.OVERRECEIVED))
                    .count();

            long resolvedDiscrepancies = allItems.stream()
                    .filter(Item::isResolved)
                    .count();

            long regularInventory = allItems.stream()
                    .filter(item -> item.getItemStatus() == ItemStatus.IN_WAREHOUSE && !item.isResolved())
                    .count();

            Map<String, Object> summary = Map.of(
                    "totalItems", totalItems,
                    "regularInventory", regularInventory,
                    "activeDiscrepancies", activeDiscrepancies,
                    "resolvedDiscrepancies", resolvedDiscrepancies,
                    "needsAttention", activeDiscrepancies > 0
            );

            return ResponseEntity.ok(summary);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/resolution-history/warehouse/{warehouseId}")
    public ResponseEntity<List<ItemResolution>> getResolutionHistoryByWarehouse(@PathVariable UUID warehouseId) {
        try {
            List<ItemResolution> resolutionHistory = itemService.getResolutionHistoryByWarehouse(warehouseId);
            log.debug("Found {} resolution records for warehouse {}", resolutionHistory.size(), warehouseId);
            return ResponseEntity.ok(resolutionHistory);

        } catch (IllegalArgumentException e) {
            log.warn("Warehouse not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        } catch (Exception e) {
            log.error("Error fetching resolution history for warehouse {}", warehouseId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/transaction-details/{warehouseId}/{itemTypeId}")
    public ResponseEntity<List<Item>> getItemTransactionDetails(
            @PathVariable UUID warehouseId,
            @PathVariable UUID itemTypeId) {
        try {
            List<Item> transactionDetails = itemService.getItemTransactionDetails(warehouseId, itemTypeId);
            return ResponseEntity.ok(transactionDetails);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET all item history for a warehouse (all sources)
     * Endpoint: GET /api/finance/inventory-valuation/warehouse/{warehouseId}/item-history
     */
}
