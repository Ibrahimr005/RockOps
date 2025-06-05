package com.example.backend.controllers.warehouse;


import com.example.backend.dto.item.ItemResolutionDTO;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemResolution;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.services.warehouse.ItemCategoryService;
import com.example.backend.services.warehouse.ItemService;
import com.example.backend.services.warehouse.WarehouseService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/items")
public class ItemController {

    @Autowired
    private ItemService itemService;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private ItemCategoryService itemCategoryService;

    @Autowired
    private ItemRepository itemRepository;

    // Existing endpoints
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<Item>> getItemsByWarehouse(@PathVariable UUID warehouseId) {
        System.out.println("🔍 === DEBUGGING WAREHOUSE ITEMS REQUEST ===");
        System.out.println("Received request for warehouse ID: " + warehouseId);

        try {
            // Check if warehouse ID is valid
            if (warehouseId == null) {
                System.err.println("❌ Warehouse ID is null");
                return ResponseEntity.badRequest().build();
            }

            System.out.println("📞 Calling itemService.getItemsByWarehouse...");
            List<Item> items = itemService.getItemsByWarehouse(warehouseId);

            System.out.println("✅ Successfully fetched items from service");
            System.out.println("📊 Number of items: " + (items != null ? items.size() : "null"));

            if (items != null && items.size() > 0) {
                System.out.println("📋 Sample item: " + items.get(0).getId());
                System.out.println("📋 Sample item status: " + items.get(0).getItemStatus());
            }

            return ResponseEntity.ok(items);

        } catch (IllegalArgumentException e) {
            System.err.println("❌ IllegalArgumentException: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().build();

        } catch (Exception e) {
            System.err.println("💥 Unexpected error occurred");
            System.err.println("Error class: " + e.getClass().getSimpleName());
            System.err.println("Error message: " + e.getMessage());
            System.err.println("Stack trace:");
            e.printStackTrace();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping()
    public ResponseEntity<Item> createItem(@RequestBody Map<String, Object> request) {
        try {
            UUID itemTypeId = UUID.fromString((String) request.get("itemTypeId"));
            UUID warehouseId = UUID.fromString((String) request.get("warehouseId"));
            int initialQuantity = (int) request.get("initialQuantity");
            String username = request.get("username").toString();

            Item newItem = itemService.createItem(itemTypeId, warehouseId, initialQuantity,username);
            return ResponseEntity.ok(newItem);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
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
            System.out.println("🔥 Resolution endpoint called for item: " + request.getItemId());
            ItemResolution resolution = itemService.resolveDiscrepancy(request);
            System.out.println("✅ Resolution successful: " + resolution.getId());
            return ResponseEntity.ok(resolution);
        } catch (IllegalArgumentException e) {
            System.out.println("❌ Bad request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.out.println("💥 Server error: " + e.getMessage());
            e.printStackTrace();
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
            Item item = itemRepository.findById(itemId)
                    .orElseThrow(() -> new IllegalArgumentException("Item not found"));

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
            System.out.println("🔍 Fetching resolution history for warehouse: " + warehouseId);

            List<ItemResolution> resolutionHistory = itemService.getResolutionHistoryByWarehouse(warehouseId);

            System.out.println("✅ Found " + resolutionHistory.size() + " resolution records");

            return ResponseEntity.ok(resolutionHistory);

        } catch (IllegalArgumentException e) {
            System.out.println("❌ Warehouse not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        } catch (Exception e) {
            System.out.println("💥 Error fetching resolution history: " + e.getMessage());
            e.printStackTrace();
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
}