package com.example.backend.services.warehouse;


import com.example.backend.dto.item.ItemResolutionDTO;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.ItemResolutionRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ItemService {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private ItemResolutionRepository itemResolutionRepository;

    // Your existing methods...

    // Add this logging to your ItemService.getItemsByWarehouse method:

    public List<Item> getItemsByWarehouse(UUID warehouseId) {
        System.out.println("🔍 ItemService: Getting items for warehouse: " + warehouseId);

        try {
            // Check if warehouse exists first
            System.out.println("📋 Checking if warehouse exists...");
            Warehouse warehouse = warehouseRepository.findById(warehouseId)
                    .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

            System.out.println("✅ Warehouse found: " + warehouse.getName());

            // Try to fetch items
            System.out.println("📦 Fetching items from repository...");
            List<Item> items = itemRepository.findByWarehouseWithTransactionItems(warehouse);

            System.out.println("✅ Items fetched successfully. Count: " + items.size());

            return items;

        } catch (Exception e) {
            System.err.println("💥 Error in ItemService.getItemsByWarehouse:");
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            throw e; // Re-throw to see the full stack trace
        }
    }
    public Item createItem(UUID itemTypeId, UUID warehouseId, int initialQuantity, String username) {
        ItemType itemType = itemTypeRepository.findById(itemTypeId)
                .orElseThrow(() -> new IllegalArgumentException("ItemType not found"));

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        // Always create a new item instead of merging
        Item newItem = new Item();
        newItem.setItemType(itemType);
        newItem.setWarehouse(warehouse);
        newItem.setQuantity(initialQuantity);
        newItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        newItem.setCreatedAt(LocalDateTime.now()); // set createdAt here
        newItem.setCreatedBy(username);
        System.out.println("createdddatttt:" + newItem.getCreatedAt());

        return itemRepository.save(newItem);
    }


    // CLEAN RESOLUTION METHOD - No deletions, just mark as resolved
    @Transactional
    public ItemResolution resolveDiscrepancy(ItemResolutionDTO request) {
        // Find the item
        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        // Validate that the item actually has a discrepancy status
        if (item.getItemStatus() != ItemStatus.MISSING &&
                item.getItemStatus() != ItemStatus.OVERRECEIVED) {
            throw new IllegalArgumentException("Item does not have a discrepancy status");
        }

        // Store original values for audit
        ItemStatus originalStatus = item.getItemStatus();
        int originalQuantity = item.getQuantity();

        // Process the resolution based on type
        switch (request.getResolutionType()) {
            case ACKNOWLEDGE_LOSS:
            case REPORT_THEFT:
                // Just mark as resolved, keep the MISSING status for history
                item.setResolved(true);
                System.out.println("✅ Item marked as resolved - " + request.getResolutionType());
                break;

            case COUNTING_ERROR:
            case FOUND_ITEMS:
            case ACCEPT_SURPLUS:
                // Merge with regular inventory OR convert status
                handleItemToRegularInventory(item);
                item.setResolved(true);
                System.out.println("✅ Item resolved and added to inventory - " + request.getResolutionType());
                break;

            case RETURN_TO_SENDER:
                // Mark for return
                item.setItemStatus(ItemStatus.PENDING);
                item.setResolved(true);
                System.out.println("✅ Item marked for return to sender");
                break;

            default:
                throw new IllegalArgumentException("Unsupported resolution type: " + request.getResolutionType());
        }

        // Save the updated item
        itemRepository.save(item);

        // Create resolution record (always has valid item reference - no cascade issues!)
        ItemResolution itemResolution = ItemResolution.builder()
                .item(item)
                .resolutionType(request.getResolutionType())
                .notes(request.getNotes())
                .resolvedBy(request.getResolvedBy())
                .transactionId(request.getTransactionId())
                .originalStatus(originalStatus)
                .originalQuantity(originalQuantity)
                .resolvedAt(LocalDateTime.now())
                .build();

        return itemResolutionRepository.save(itemResolution);
    }

    // SINGLE helper method to handle converting items to regular inventory
    private void handleItemToRegularInventory(Item discrepancyItem) {
        // Look for existing regular inventory item
        List<Item> existingItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                discrepancyItem.getItemType().getId(),
                discrepancyItem.getWarehouse().getId(),
                ItemStatus.IN_WAREHOUSE
        );

        if (!existingItems.isEmpty()) {
            // Merge with existing item
            Item existingItem = existingItems.get(0);
            existingItem.setQuantity(existingItem.getQuantity() + discrepancyItem.getQuantity());
            itemRepository.save(existingItem);

            // The discrepancy item will be marked as resolved but kept for history
            // We don't delete it anymore - just mark as resolved
            System.out.println("✅ Merged " + discrepancyItem.getQuantity() + " items into existing inventory");
        } else {
            // Just convert the status
            discrepancyItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
            System.out.println("✅ Converted discrepancy item to regular inventory");
        }
    }

    public List<ItemResolution> getItemResolutionHistory(UUID itemId) {
        return itemResolutionRepository.findByItemId(itemId);
    }

    public List<ItemResolution> getItemResolutionsByUser(String username) {
        return itemResolutionRepository.findByResolvedBy(username);
    }

    // Method to get ACTIVE (unresolved) items with discrepancies
    public List<Item> getDiscrepancyItems(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        return itemRepository.findByWarehouseAndItemStatusInAndResolvedFalse(
                warehouse,
                List.of(ItemStatus.MISSING, ItemStatus.OVERRECEIVED)
        );
    }

    // Method to get resolved items for history tab
    public List<Item> getResolvedItems(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        return itemRepository.findByWarehouseAndResolvedTrue(warehouse);
    }

    // Method to delete item
    public void deleteItem(UUID itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));
        itemRepository.delete(item);
    }

    // Additional helper methods for better inventory management

    /**
     * Get all items of a specific type and status in a warehouse
     */
    public List<Item> getItemsByTypeAndStatus(UUID warehouseId, UUID itemTypeId, ItemStatus status) {
        return itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(itemTypeId, warehouseId, status);
    }

    /**
     * Check if there are existing items of the same type with IN_WAREHOUSE status
     */
    public boolean hasExistingWarehouseItems(UUID warehouseId, UUID itemTypeId) {
        List<Item> existingItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE);
        return !existingItems.isEmpty();
    }

    /**
     * Get the total quantity of a specific item type in warehouse (all statuses)
     */
    public int getTotalQuantityByType(UUID warehouseId, UUID itemTypeId) {
        List<Item> allItems = itemRepository.findAllByItemTypeIdAndWarehouseId(itemTypeId, warehouseId);
        return allItems.stream().mapToInt(Item::getQuantity).sum();
    }

    /**
     * Get the available quantity of a specific item type in warehouse (IN_WAREHOUSE status only)
     */
    public int getAvailableQuantityByType(UUID warehouseId, UUID itemTypeId) {
        List<Item> availableItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE);
        return availableItems.stream().mapToInt(Item::getQuantity).sum();
    }

    /**
     * Method to manually merge duplicate items of the same type and status
     * Useful for cleaning up inventory
     */
    @Transactional
    public void mergeDuplicateItems(UUID warehouseId, UUID itemTypeId, ItemStatus status) {
        List<Item> duplicateItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                itemTypeId, warehouseId, status);

        if (duplicateItems.size() <= 1) {
            return; // No duplicates to merge
        }

        // Keep the first item and merge others into it
        Item mainItem = duplicateItems.get(0);
        int totalQuantity = mainItem.getQuantity();

        for (int i = 1; i < duplicateItems.size(); i++) {
            Item duplicateItem = duplicateItems.get(i);
            totalQuantity += duplicateItem.getQuantity();
            itemRepository.delete(duplicateItem);
        }

        mainItem.setQuantity(totalQuantity);
        itemRepository.save(mainItem);

        System.out.println("✅ Merged " + duplicateItems.size() + " duplicate items. Total quantity: " + totalQuantity);
    }

    public List<ItemResolution> getResolutionHistoryByWarehouse(UUID warehouseId) {
        try {
            // First approach - using the warehouse object
            Warehouse warehouse = warehouseRepository.findById(warehouseId)
                    .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

            return itemResolutionRepository.findByItemWarehouseOrderByResolvedAtDesc(warehouse);

        } catch (Exception e) {
            // Fallback approach - using warehouse ID directly
            System.out.println("Using fallback query for warehouse: " + warehouseId);
            return itemResolutionRepository.findByItemWarehouseIdOrderByResolvedAtDesc(warehouseId);
        }
    }

    public List<Item> getItemTransactionDetails(UUID warehouseId, UUID itemTypeId) {
        // Get all items of this type in the warehouse with their transaction details
        List<Item> items = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatusWithTransactionDetails(
                itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE);

        System.out.println("Found " + items.size() + " item entries for type " + itemTypeId + " in warehouse " + warehouseId);

        return items;
    }
}