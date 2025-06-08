package com.example.backend.services.warehouse;

import com.example.backend.dto.item.ItemResolutionDTO;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionStatus;
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
import java.util.Comparator;
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

    public Item createItem(UUID itemTypeId, UUID warehouseId, int initialQuantity, String username , LocalDateTime createdAt) {
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
        newItem.setCreatedAt(createdAt); // set createdAt here
        newItem.setCreatedBy(username);
        System.out.println("createdddatttt:" + newItem.getCreatedAt());

        return itemRepository.save(newItem);
    }

    // CLEAN RESOLUTION METHOD - Updated with transaction status logic
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
                // ✅ UPDATED: For counting error, deduct quantity from specific transaction item
                handleCountingErrorResolution(item);
                item.setResolved(true);
                System.out.println("✅ Counting error resolved - quantity deducted from specific transaction item");
                break;

            case FOUND_ITEMS:
                // Merge with regular inventory OR convert status
                handleItemToRegularInventory(item);
                item.setResolved(true);
                System.out.println("✅ Item resolved and added to inventory - " + request.getResolutionType());
                break;

            case ACCEPT_SURPLUS:
                // ✅ UPDATED: Accept surplus but DON'T add to inventory - just mark as resolved
                item.setResolved(true);
                System.out.println("✅ Surplus accepted and marked as resolved - quantity NOT added to inventory");
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

        // 🆕 NEW: First update TransactionItem status to RESOLVED
        updateTransactionItemToResolved(item);

        // 🆕 NEW: Then check and update overall transaction status
        updateTransactionStatusBasedOnItems(item);

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

    // 🆕 NEW METHOD: Update transaction status based on item resolution
    private void updateTransactionStatusAfterResolution(Item resolvedItem) {
        System.out.println("🔍 Checking transaction status after item resolution");

        // Get the transaction from the resolved item
        if (resolvedItem.getTransactionItem() == null ||
                resolvedItem.getTransactionItem().getTransaction() == null) {
            System.out.println("⚠️ No transaction linked to this item - skipping transaction status update");
            return;
        }

        Transaction transaction = resolvedItem.getTransactionItem().getTransaction();
        System.out.println("📋 Checking transaction: " + transaction.getId() + " (Batch #" + transaction.getBatchNumber() + ")");

        // Only update status for transactions that are currently ACCEPTED or REJECTED
        if (transaction.getStatus() != TransactionStatus.ACCEPTED &&
                transaction.getStatus() != TransactionStatus.REJECTED) {
            System.out.println("⚠️ Transaction status is " + transaction.getStatus() + " - not updating resolution status");
            return;
        }

        // Check if this transaction has any rejected items
        boolean hasRejectedItems = transaction.getItems().stream()
                .anyMatch(item -> item.getStatus() == TransactionStatus.REJECTED);

        if (!hasRejectedItems) {
            System.out.println("✅ Transaction has no rejected items - no resolution status needed");
            return;
        }

        // Find all discrepancy items (MISSING/OVERRECEIVED) for this transaction
        List<Item> discrepancyItems = itemRepository.findDiscrepancyItemsByTransaction(transaction.getId());

        System.out.println("🔢 Found " + discrepancyItems.size() + " discrepancy items for this transaction");

        if (discrepancyItems.isEmpty()) {
            System.out.println("✅ No discrepancy items found - no resolution status update needed");
            return;
        }

        // Check if all discrepancy items are resolved
        boolean allDiscrepanciesResolved = discrepancyItems.stream()
                .allMatch(Item::isResolved);

        // Update transaction status based on resolution progress
        TransactionStatus newStatus;
        if (allDiscrepanciesResolved) {
            newStatus = TransactionStatus.RESOLVED;
            System.out.println("🎉 All discrepancies resolved - setting transaction status to RESOLVED");
        } else {
            newStatus = TransactionStatus.RESOLVING;
            System.out.println("🔄 Some discrepancies still pending - setting transaction status to RESOLVING");
        }

        // Update transaction status if it needs to change
        if (transaction.getStatus() != newStatus) {
            transaction.setStatus(newStatus);
            transactionRepository.save(transaction);
            System.out.println("✅ Transaction status updated from " +
                    (allDiscrepanciesResolved ? "ACCEPTED/REJECTED" : transaction.getStatus()) +
                    " to " + newStatus);
        } else {
            System.out.println("📋 Transaction status already correct: " + newStatus);
        }

        // Log resolution progress
        long resolvedCount = discrepancyItems.stream().mapToLong(item -> item.isResolved() ? 1 : 0).sum();
        System.out.println("📊 Resolution progress: " + resolvedCount + "/" + discrepancyItems.size() + " items resolved");
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
            // Find the item with the earliest createdAt date
            Item earliestItem = existingItems.stream()
                    .min(Comparator.comparing(Item::getCreatedAt))
                    .get();

            // Merge with the earliest item
            earliestItem.setQuantity(earliestItem.getQuantity() + discrepancyItem.getQuantity());
            itemRepository.save(earliestItem);

            // The discrepancy item will be marked as resolved but kept for history
            System.out.println("✅ Merged " + discrepancyItem.getQuantity() + " items into earliest inventory item (created: " + earliestItem.getCreatedAt() + ")");
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

    // NEW helper method to handle counting error - deduct from the specific transaction item
    private void handleCountingErrorResolution(Item discrepancyItem) {
        // Get the transaction item ID from the discrepancy item
        if (discrepancyItem.getTransactionItem() == null) {
            System.out.println("⚠️ No transaction item linked to discrepancy item. Cannot perform specific deduction.");
            return;
        }

        UUID transactionItemId = discrepancyItem.getTransactionItem().getId();

        // Find the specific IN_WAREHOUSE item that was created from the same transaction
        List<Item> sameTransactionItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatusAndTransactionItemId(
                discrepancyItem.getItemType().getId(),
                discrepancyItem.getWarehouse().getId(),
                ItemStatus.IN_WAREHOUSE,
                transactionItemId
        );

        if (!sameTransactionItems.isEmpty()) {
            // Deduct from the specific item created in that transaction
            Item specificItem = sameTransactionItems.get(0);
            int currentQuantity = specificItem.getQuantity();
            int discrepancyQuantity = discrepancyItem.getQuantity();

            // Calculate new quantity (ensure it doesn't go below 0)
            int newQuantity = Math.max(0, currentQuantity - discrepancyQuantity);
            specificItem.setQuantity(newQuantity);
            itemRepository.save(specificItem);

            System.out.println("✅ Deducted " + discrepancyQuantity + " items from specific transaction item. " +
                    "Previous: " + currentQuantity + ", New: " + newQuantity +
                    " (Transaction Item ID: " + transactionItemId + ")");

            // If quantity becomes 0, you might want to delete the item or keep it
            if (newQuantity == 0) {
                System.out.println("⚠️ Specific transaction item quantity is now 0. Consider removing this item.");
                // Optionally: itemRepository.delete(specificItem);
            }
        } else {
            System.out.println("⚠️ No specific IN_WAREHOUSE item found for transaction item ID: " + transactionItemId);
            System.out.println("The original transaction item may have been already consumed or modified.");
        }

        // The discrepancy item will be marked as resolved but kept for history
    }

    // 🆕 NEW METHOD: Step 1 - Mark the TransactionItem as RESOLVED
    private void updateTransactionItemToResolved(Item resolvedItem) {
        System.out.println("🔄 Step 1: Updating TransactionItem to RESOLVED");

        // Get the transaction item from the resolved item
        if (resolvedItem.getTransactionItem() == null) {
            System.out.println("⚠️ No transaction item linked to this item - skipping TransactionItem update");
            return;
        }

        TransactionItem transactionItem = resolvedItem.getTransactionItem();
        System.out.println("📋 Found TransactionItem: " + transactionItem.getId() +
                " (Current status: " + transactionItem.getStatus() + ")");

        // Set TransactionItem status to RESOLVED
        transactionItem.setStatus(TransactionStatus.RESOLVED);
        transactionItem.setRejectionReason(null); // Clear rejection reason

        System.out.println("✅ TransactionItem status set to RESOLVED");
    }

    // 🆕 NEW METHOD: Step 2 - Check all TransactionItems and update Transaction status
    private void updateTransactionStatusBasedOnItems(Item resolvedItem) {
        System.out.println("🔍 Step 2: Checking Transaction status based on all TransactionItems");

        // Get the transaction
        if (resolvedItem.getTransactionItem() == null ||
                resolvedItem.getTransactionItem().getTransaction() == null) {
            System.out.println("⚠️ No transaction linked - skipping transaction status update");
            return;
        }

        Transaction transaction = resolvedItem.getTransactionItem().getTransaction();
        System.out.println("📋 Checking transaction: " + transaction.getId() + " (Batch #" + transaction.getBatchNumber() + ")");

        // Get all TransactionItems for this transaction
        List<TransactionItem> allTransactionItems = transaction.getItems();
        System.out.println("📦 Found " + allTransactionItems.size() + " transaction items");

        // Count RESOLVED vs total TransactionItems
        long resolvedItemsCount = allTransactionItems.stream()
                .filter(item -> item.getStatus() == TransactionStatus.RESOLVED)
                .count();

        System.out.println("📊 TransactionItem status count:");
        System.out.println("   - RESOLVED: " + resolvedItemsCount);
        System.out.println("   - Total: " + allTransactionItems.size());

        // Determine new transaction status
        TransactionStatus newStatus;
        if (resolvedItemsCount == allTransactionItems.size()) {
            // ALL TransactionItems are RESOLVED
            newStatus = TransactionStatus.RESOLVED;
            System.out.println("🎉 ALL TransactionItems resolved - setting Transaction to RESOLVED");
        } else if (resolvedItemsCount > 0) {
            // SOME TransactionItems are RESOLVED
            newStatus = TransactionStatus.RESOLVING;
            System.out.println("🔄 SOME TransactionItems resolved - setting Transaction to RESOLVING");
        } else {
            // NO TransactionItems are RESOLVED yet (shouldn't happen, but just in case)
            System.out.println("⚠️ No TransactionItems resolved yet - keeping current status");
            return;
        }

        // Update transaction status if it needs to change
        if (transaction.getStatus() != newStatus) {
            TransactionStatus oldStatus = transaction.getStatus();
            transaction.setStatus(newStatus);
            transactionRepository.save(transaction);
            System.out.println("✅ Transaction status updated from " + oldStatus + " to " + newStatus);
        } else {
            System.out.println("📋 Transaction status already correct: " + newStatus);
        }
    }
}