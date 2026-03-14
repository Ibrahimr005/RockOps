package com.example.backend.services.transaction;

import com.example.backend.models.*;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.repositories.transaction.TransactionItemRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private TransactionItemRepository transactionItemRepository;
    @Autowired
    private WarehouseRepository warehouseRepository;
    @Autowired
    private ItemTypeRepository itemTypeRepository;
    @Autowired
    private ItemRepository itemRepository;
    @Autowired
    private EquipmentRepository equipmentRepository;
    @Autowired
    private ConsumableRepository consumableRepository;

    @Autowired
    private NotificationService notificationService;

    // ========================================
    // CORE TRANSACTION CREATION
    // Sender is ALWAYS a Warehouse.
    // Inventory is deducted from sender immediately on creation.
    // Receiver adds inventory only on acceptance.
    // Valid flows: Warehouse → Warehouse, Warehouse → Equipment, Warehouse → Loss
    // ========================================

    @Transactional
    public Transaction createTransaction(
            UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> items,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            String description) {

        return createTransactionWithPurpose(
                senderId, receiverType, receiverId,
                items, transactionDate, username, batchNumber, null, description);
    }

    @Transactional
    public Transaction createTransactionWithPurpose(
            UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> items,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            TransactionPurpose purpose, String description) {

        System.out.println("🚀 Starting createTransaction()");
        System.out.println("Sender (Warehouse) ID: " + senderId);
        System.out.println("Receiver Type: " + receiverType + ", Receiver ID: " + receiverId);

        // Sender is always a warehouse
        validateEntityExists(PartyType.WAREHOUSE, senderId);

        // Skip receiver validation for LOSS
        if (receiverType != PartyType.LOSS) {
            validateEntityExists(receiverType, receiverId);
        }

        // Validate and immediately deduct from sender warehouse (FIFO)
        validateSenderHasAvailableInventory(senderId, items);
        for (TransactionItem item : items) {
            List<Map<String, Object>> deductedItems = deductFromWarehouseInventory(
                    senderId, item.getItemType(), item.getQuantity());
            item.setDeductedItems(deductedItems);
            System.out.println("💾 Deducted " + item.getItemType().getName() +
                    ": " + deductedItems.size() + " batch(es)");
        }

        Transaction transaction = buildTransaction(
                PartyType.WAREHOUSE, senderId, receiverType, receiverId,
                transactionDate, username, batchNumber, purpose, description);

        // LOSS transactions are auto-completed immediately
        if (receiverType == PartyType.LOSS) {
            System.out.println("🗑️ LOSS transaction - auto-completing");
            transaction.setStatus(TransactionStatus.ACCEPTED);
            transaction.setCompletedAt(LocalDateTime.now());
            transaction.setApprovedBy("SYSTEM_AUTO_LOSS");
            transaction.setAcceptanceComment("Automatic loss/disposal transaction");
        }

        transaction.setItems(new ArrayList<>());
        for (TransactionItem item : items) {
            item.setTransaction(transaction);
            item.setStatus(receiverType == PartyType.LOSS
                    ? TransactionStatus.ACCEPTED
                    : TransactionStatus.PENDING);
            transaction.addItem(item);
        }

        Transaction saved = transactionRepository.save(transaction);
        System.out.println("✅ Transaction saved. ID: " + saved.getId());

        // Send notifications
        sendCreationNotifications(saved);

        return saved;
    }

    // ========================================
    // TRANSACTION ACCEPTANCE
    // Receiver confirms quantities. Inventory is added to receiver here.
    // Sender is always a Warehouse. Receiver is Warehouse, Equipment, or Loss.
    // ========================================

    @Transactional
    public Transaction acceptTransaction(UUID transactionId,
                                         Map<UUID, Integer> receivedQuantities,
                                         Map<UUID, Boolean> itemsNotReceived,
                                         String username,
                                         String acceptanceComment) {
        return acceptTransactionWithPurpose(transactionId, receivedQuantities,
                itemsNotReceived, username, acceptanceComment, null);
    }

    @Transactional
    public Transaction acceptTransactionWithPurpose(UUID transactionId,
                                                    Map<UUID, Integer> receivedQuantities,
                                                    Map<UUID, Boolean> itemsNotReceived,
                                                    String username,
                                                    String acceptanceComment,
                                                    TransactionPurpose purpose) {
        System.out.println("=== ACCEPT TRANSACTION ===");
        System.out.println("Transaction ID: " + transactionId);

        if (transactionId == null) throw new IllegalArgumentException("Transaction ID is null");
        if (receivedQuantities == null) throw new IllegalArgumentException("Received quantities is null");
        if (username == null) throw new IllegalArgumentException("Username is null");

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));

        if (transaction.getReceiverType() == PartyType.LOSS) {
            throw new IllegalArgumentException("LOSS transactions are auto-completed and cannot be manually accepted");
        }

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Transaction is not in PENDING status");
        }

        transaction.setApprovedBy(username);
        transaction.setAcceptanceComment(acceptanceComment);
        transaction.setCompletedAt(LocalDateTime.now());

        if (purpose != null && purpose != transaction.getPurpose()) {
            transaction.setPurpose(purpose);
        }

        boolean allItemsMatch = true;

        for (TransactionItem item : transaction.getItems()) {
            Integer receivedQuantity = receivedQuantities.get(item.getId());
            if (receivedQuantity == null) {
                throw new IllegalArgumentException("Received quantity not provided for item: " + item.getId());
            }

            // Check if item was marked as not received
            Boolean itemNotReceived = itemsNotReceived != null ? itemsNotReceived.get(item.getId()) : null;
            if (Boolean.TRUE.equals(itemNotReceived)) {
                allItemsMatch = false;
                item.setStatus(TransactionStatus.REJECTED);
                item.setRejectionReason("Item was not received");
                System.out.println("📭 Item not received: " + item.getItemType().getName());

                // Sender claimed they sent it but receiver says they didn't get it → STOLEN/LOST
                // Add back nothing to sender — items are gone, create MISSING entry
                createStolenItemEntry(transaction, item, item.getQuantity());

                // Add back to sender warehouse since they didn't actually send it
                addBackToWarehouseInventory(transaction.getSenderId(), item.getItemType(), item.getQuantity());
                continue;
            }

            item.setReceivedQuantity(receivedQuantity);

            // Sender always claimed item.getQuantity() (they were deducted that amount on creation)
            int senderClaimedQuantity = item.getQuantity();
            int receiverClaimedQuantity = receivedQuantity;

            System.out.printf("📦 %s: Sender sent %d, Receiver got %d%n",
                    item.getItemType().getName(), senderClaimedQuantity, receiverClaimedQuantity);

            if (transaction.getReceiverType() == PartyType.EQUIPMENT) {
                item.setEquipmentReceivedQuantity(receiverClaimedQuantity);
            }

            if (senderClaimedQuantity != receiverClaimedQuantity) {
                allItemsMatch = false;
                item.setStatus(TransactionStatus.REJECTED);
                item.setRejectionReason("Quantity mismatch between quantity sent and quantity received");
                System.out.println("⚠️ Quantity mismatch for: " + item.getItemType().getName());
            } else {
                item.setStatus(TransactionStatus.ACCEPTED);
                item.setRejectionReason(null);
            }

            // Add to receiver inventory based on what receiver claims they got
            addToReceiverInventory(transaction, item, receiverClaimedQuantity);

            // Handle discrepancies between sender and receiver claims
            handleQuantityDiscrepancies(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
        }

        transaction.setStatus(allItemsMatch ? TransactionStatus.ACCEPTED : TransactionStatus.REJECTED);
        if (!allItemsMatch) {
            transaction.setRejectionReason("Some items had quantity mismatches - check individual item statuses");
        } else {
            transaction.setRejectionReason(null);
        }

        Transaction saved = transactionRepository.save(transaction);
        System.out.println("✅ Transaction " + saved.getStatus() + ". ID: " + saved.getId());

        sendAcceptanceNotifications(saved);
        return saved;
    }

    // ========================================
    // TRANSACTION REJECTION
    // Reverts sender warehouse inventory since items were deducted on creation.
    // ========================================

    @Transactional
    public Transaction rejectTransaction(UUID transactionId, String rejectionReason, String username) {
        System.out.println("❌ Rejecting transaction: " + transactionId);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Transaction is not in PENDING status");
        }

        // Add back to sender warehouse — items were deducted on creation
        for (TransactionItem item : transaction.getItems()) {
            addBackToWarehouseInventory(transaction.getSenderId(), item.getItemType(), item.getQuantity());
            System.out.println("↩️ Returned: " + item.getQuantity() + " x " + item.getItemType().getName());
        }

        transaction.setRejectionReason(rejectionReason);
        transaction.setStatus(TransactionStatus.REJECTED);
        transaction.setCompletedAt(LocalDateTime.now());
        transaction.setApprovedBy(username);

        for (TransactionItem item : transaction.getItems()) {
            item.setStatus(TransactionStatus.REJECTED);
        }

        Transaction saved = transactionRepository.save(transaction);
        sendRejectionNotifications(saved, rejectionReason);

        System.out.println("✅ Transaction rejected and sender inventory restored");
        return saved;
    }

    // ========================================
    // TRANSACTION DELETION
    // Only PENDING transactions can be deleted.
    // Reverts sender warehouse deductions.
    // ========================================

    @Transactional
    public void deleteTransaction(UUID transactionId) {
        System.out.println("🗑️ Deleting transaction: " + transactionId);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Cannot delete transaction with status: " + transaction.getStatus() +
                    ". Only PENDING transactions can be deleted.");
        }

        // Revert sender warehouse deductions
        for (TransactionItem item : transaction.getItems()) {
            addBackToWarehouseInventory(transaction.getSenderId(), item.getItemType(), item.getQuantity());
            System.out.println("↩️ Returned: " + item.getQuantity() + " x " + item.getItemType().getName());
        }

        sendDeletionNotifications(transaction);
        transactionRepository.delete(transaction);

        System.out.println("✅ Transaction deleted and sender inventory restored");
    }

    // ========================================
    // TRANSACTION UPDATE
    // Only PENDING transactions can be updated.
    // Adjusts sender warehouse inventory for quantity differences.
    // ========================================

    @Transactional
    public Transaction updateTransaction(
            UUID transactionId,
            UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> updatedItems,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            String description) {
        return updateTransactionWithPurpose(transactionId, senderId, receiverType, receiverId,
                updatedItems, transactionDate, username, batchNumber, null, description);
    }

    @Transactional
    public Transaction updateTransactionWithPurpose(
            UUID transactionId,
            UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> updatedItems,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            TransactionPurpose purpose, String description) {

        System.out.println("🔄 Updating transaction: " + transactionId);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Only PENDING transactions can be updated");
        }

        validateEntityExists(PartyType.WAREHOUSE, senderId);
        if (receiverType != PartyType.LOSS) {
            validateEntityExists(receiverType, receiverId);
        }

        if (transaction.getItems().size() != updatedItems.size()) {
            throw new IllegalArgumentException(
                    "Cannot change number of items in a transaction update — create a new transaction instead");
        }

        // Adjust sender warehouse inventory for changed quantities
        adjustSenderInventoryForUpdate(transaction, updatedItems);

        // Update transaction fields
        transaction.setSenderId(senderId);
        transaction.setReceiverType(receiverType);
        transaction.setReceiverId(receiverId);
        transaction.setTransactionDate(transactionDate);
        transaction.setBatchNumber(batchNumber);
        transaction.setAddedBy(username);

        if (purpose != null) transaction.setPurpose(purpose);
        if (description != null) transaction.setDescription(description);

        // Update existing items in-place
        List<TransactionItem> existingItems = transaction.getItems();
        for (int i = 0; i < existingItems.size(); i++) {
            TransactionItem existing = existingItems.get(i);
            TransactionItem updated = updatedItems.get(i);
            existing.setItemType(updated.getItemType());
            existing.setQuantity(updated.getQuantity());
            existing.setStatus(TransactionStatus.PENDING);
            System.out.println("✅ Updated item: " + updated.getItemType().getName() + " → " + updated.getQuantity());
        }

        Transaction saved = transactionRepository.save(transaction);
        sendUpdateNotifications(saved);

        System.out.println("✅ Transaction updated successfully");
        return saved;
    }

    /**
     * Adjusts sender warehouse inventory when item quantities change during an update.
     * If new quantity > old quantity: deduct additional from warehouse.
     * If new quantity < old quantity: add back difference to warehouse.
     */
    private void adjustSenderInventoryForUpdate(Transaction transaction, List<TransactionItem> updatedItems) {
        Map<UUID, Integer> oldQuantities = transaction.getItems().stream()
                .collect(Collectors.toMap(
                        item -> item.getItemType().getId(),
                        TransactionItem::getQuantity
                ));

        for (TransactionItem updatedItem : updatedItems) {
            UUID itemTypeId = updatedItem.getItemType().getId();
            int newQty = updatedItem.getQuantity();
            int oldQty = oldQuantities.getOrDefault(itemTypeId, 0);
            int diff = newQty - oldQty;

            if (diff > 0) {
                System.out.println("➖ Deducting additional " + diff + " for: " + updatedItem.getItemType().getName());
                List<Map<String, Object>> additional = deductFromWarehouseInventory(
                        transaction.getSenderId(), updatedItem.getItemType(), diff);
                // Merge deduction info into updated item
                List<Map<String, Object>> existing = updatedItem.getDeductedItems();
                if (existing == null) existing = new ArrayList<>();
                existing.addAll(additional);
                updatedItem.setDeductedItems(existing);
            } else if (diff < 0) {
                int addBack = Math.abs(diff);
                System.out.println("↩️ Adding back " + addBack + " for: " + updatedItem.getItemType().getName());
                addBackToWarehouseInventory(transaction.getSenderId(), updatedItem.getItemType(), addBack);
            }
        }

        // Handle items that were removed entirely
        Map<UUID, Integer> newQuantities = updatedItems.stream()
                .collect(Collectors.toMap(i -> i.getItemType().getId(), TransactionItem::getQuantity));

        for (TransactionItem oldItem : transaction.getItems()) {
            if (!newQuantities.containsKey(oldItem.getItemType().getId())) {
                System.out.println("↩️ Item removed from transaction, returning: " + oldItem.getQuantity()
                        + " x " + oldItem.getItemType().getName());
                addBackToWarehouseInventory(transaction.getSenderId(), oldItem.getItemType(), oldItem.getQuantity());
            }
        }
    }

    // ========================================
    // RECEIVER INVENTORY ADDITION (on acceptance)
    // ========================================

    /**
     * Adds items to the receiver (Warehouse or Equipment) based on what they claim to have received.
     */
    private void addToReceiverInventory(Transaction transaction, TransactionItem item, int receivedQuantity) {
        if (receivedQuantity <= 0) return;

        if (transaction.getReceiverType() == PartyType.WAREHOUSE) {
            addToWarehouseInventory(transaction, item, receivedQuantity);
        } else if (transaction.getReceiverType() == PartyType.EQUIPMENT) {
            addToEquipmentConsumables(transaction.getReceiverId(), item.getItemType(), receivedQuantity, transaction);
        }
        // LOSS receiver: nothing to add
    }

    // ========================================
    // DISCREPANCY HANDLING
    // ========================================

    private void handleQuantityDiscrepancies(Transaction transaction, TransactionItem item,
                                             int senderClaimed, int receiverClaimed) {
        int discrepancy = senderClaimed - receiverClaimed;

        if (discrepancy > 0) {
            // Sender sent more than receiver got → STOLEN/LOST
            System.out.println("🚨 STOLEN/LOST: " + discrepancy + " units missing in transit");
            createStolenItemEntry(transaction, item, discrepancy);
        } else if (discrepancy < 0) {
            // Receiver got more than sender sent → OVERRECEIVED
            int overReceived = Math.abs(discrepancy);
            System.out.println("📈 OVERRECEIVED: " + overReceived + " extra units at receiver");
            createOverReceivedItemEntry(transaction, item, overReceived);
        } else {
            System.out.println("✅ Perfect quantity match");
        }
    }

    private void createStolenItemEntry(Transaction transaction, TransactionItem item, int stolenQuantity) {
        // STOLEN tracked at sender (always a warehouse)
        Warehouse warehouse = warehouseRepository.findById(transaction.getSenderId())
                .orElseThrow(() -> new IllegalArgumentException("Sender warehouse not found"));

        Item stolenItem = new Item();
        stolenItem.setItemType(item.getItemType());
        stolenItem.setWarehouse(warehouse);
        stolenItem.setQuantity(stolenQuantity);
        stolenItem.setItemStatus(ItemStatus.MISSING);
        stolenItem.setTransactionItem(item);
        stolenItem.setResolved(false);
        stolenItem.setCreatedAt(LocalDateTime.now());
        itemRepository.save(stolenItem);

        System.out.printf("🚨 STOLEN entry: %d %s at warehouse %s%n",
                stolenQuantity, item.getItemType().getName(), warehouse.getName());
    }

    private void createOverReceivedItemEntry(Transaction transaction, TransactionItem item, int overReceivedQuantity) {
        // OVERRECEIVED tracked at receiver
        if (transaction.getReceiverType() == PartyType.WAREHOUSE) {
            Warehouse warehouse = warehouseRepository.findById(transaction.getReceiverId())
                    .orElseThrow(() -> new IllegalArgumentException("Receiver warehouse not found"));

            Item overReceivedItem = new Item();
            overReceivedItem.setItemType(item.getItemType());
            overReceivedItem.setWarehouse(warehouse);
            overReceivedItem.setQuantity(overReceivedQuantity);
            overReceivedItem.setItemStatus(ItemStatus.OVERRECEIVED);
            overReceivedItem.setTransactionItem(item);
            overReceivedItem.setResolved(false);
            overReceivedItem.setCreatedAt(LocalDateTime.now());
            itemRepository.save(overReceivedItem);

            System.out.printf("📈 OVERRECEIVED entry: %d %s at warehouse %s%n",
                    overReceivedQuantity, item.getItemType().getName(), warehouse.getName());

        } else if (transaction.getReceiverType() == PartyType.EQUIPMENT) {
            Equipment equipment = equipmentRepository.findById(transaction.getReceiverId())
                    .orElseThrow(() -> new IllegalArgumentException("Receiver equipment not found"));

            Consumable overReceivedConsumable = new Consumable();
            overReceivedConsumable.setEquipment(equipment);
            overReceivedConsumable.setItemType(item.getItemType());
            overReceivedConsumable.setQuantity(overReceivedQuantity);
            overReceivedConsumable.setStatus(ItemStatus.OVERRECEIVED);
            overReceivedConsumable.setTransaction(transaction);
            consumableRepository.save(overReceivedConsumable);

            System.out.printf("📈 OVERRECEIVED consumable entry: %d %s at equipment %s%n",
                    overReceivedQuantity, item.getItemType().getName(), equipment.getName());
        }
    }

    // ========================================
    // WAREHOUSE INVENTORY OPERATIONS
    // ========================================

    /**
     * Deducts items from a warehouse using FIFO ordering.
     * Returns a list of deduction batches with quantity and unit price for price tracking.
     */
    private List<Map<String, Object>> deductFromWarehouseInventory(UUID warehouseId, ItemType itemType, int quantityToDeduct) {
        List<Item> availableItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                itemType.getId(), warehouseId, ItemStatus.IN_WAREHOUSE);

        if (availableItems.isEmpty()) {
            throw new IllegalArgumentException("No available items in warehouse for: " + itemType.getName());
        }

        int totalAvailable = availableItems.stream().mapToInt(Item::getQuantity).sum();
        if (totalAvailable < quantityToDeduct) {
            throw new IllegalArgumentException("Not enough quantity in warehouse for: " + itemType.getName() +
                    ". Available: " + totalAvailable + ", Requested: " + quantityToDeduct);
        }

        // FIFO sort
        availableItems.sort((a, b) -> {
            LocalDateTime dateA = a.getCreatedAt();
            LocalDateTime dateB = b.getCreatedAt();
            if (dateA == null && dateB == null) return a.getId().compareTo(b.getId());
            if (dateA == null) return 1;
            if (dateB == null) return -1;
            return dateA.compareTo(dateB);
        });

        int remaining = quantityToDeduct;
        List<Item> toDelete = new ArrayList<>();
        List<Map<String, Object>> deductedBatches = new ArrayList<>();

        for (Item item : availableItems) {
            if (remaining <= 0) break;

            int take = Math.min(item.getQuantity(), remaining);

            Map<String, Object> batch = new HashMap<>();
            batch.put("quantity", take);
            batch.put("unitPrice", item.getUnitPrice());
            deductedBatches.add(batch);

            System.out.println("  ➖ Taking " + take + " @ " + item.getUnitPrice() + " EGP (Item: " + item.getId() + ")");

            if (item.getQuantity() <= remaining) {
                remaining -= item.getQuantity();
                toDelete.add(item);
            } else {
                item.setQuantity(item.getQuantity() - remaining);
                item.calculateTotalValue();
                itemRepository.save(item);
                remaining = 0;
            }
        }

        if (!toDelete.isEmpty()) {
            itemRepository.deleteAll(toDelete);
        }

        System.out.println("✅ Deducted " + quantityToDeduct + " in " + deductedBatches.size() + " batch(es)");
        return deductedBatches;
    }

    /**
     * Adds items to a warehouse inventory, preserving original prices from deduction batches.
     */
    private void addToWarehouseInventory(Transaction transaction, TransactionItem transactionItem, int actualQuantity) {
        System.out.println("📦 Adding " + actualQuantity + " to warehouse inventory");

        Warehouse warehouse = warehouseRepository.findById(transaction.getReceiverId())
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found: " + transaction.getReceiverId()));

        List<Map<String, Object>> deductedItems = transactionItem.getDeductedItems();

        if (deductedItems != null && !deductedItems.isEmpty()) {
            // Preserve original prices from sender deduction
            int totalDeducted = deductedItems.stream()
                    .mapToInt(d -> (Integer) d.get("quantity"))
                    .sum();

            for (Map<String, Object> batch : deductedItems) {
                Integer batchQty = (Integer) batch.get("quantity");
                Double unitPrice = (Double) batch.get("unitPrice");

                // Scale down if receiver claims less than sender sent
                int addQty = (actualQuantity < totalDeducted)
                        ? (int) Math.round((double) batchQty * actualQuantity / totalDeducted)
                        : batchQty;

                if (addQty <= 0) continue;

                Item newItem = new Item();
                newItem.setItemType(transactionItem.getItemType());
                newItem.setQuantity(addQty);
                newItem.setUnitPrice(unitPrice);
                newItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
                newItem.setWarehouse(warehouse);
                newItem.setTransactionItem(transactionItem);
                newItem.setResolved(false);
                newItem.setItemSource(ItemSource.TRANSACTION_TRANSFER);
                newItem.setCreatedAt(LocalDateTime.now());
                newItem.setCreatedBy("Created by a Transaction");

                if (unitPrice != null) newItem.calculateTotalValue();
                itemRepository.save(newItem);

                System.out.println("  ✅ Added: " + addQty + " @ " + unitPrice + " EGP");
            }
        } else {
            // Fallback: no price info available
            System.out.println("⚠️ No deduction info — creating item without price tracking");
            Item newItem = new Item();
            newItem.setItemType(transactionItem.getItemType());
            newItem.setQuantity(actualQuantity);
            newItem.setUnitPrice(null);
            newItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
            newItem.setWarehouse(warehouse);
            newItem.setTransactionItem(transactionItem);
            newItem.setResolved(false);
            newItem.setItemSource(ItemSource.TRANSACTION_TRANSFER);
            newItem.setCreatedAt(LocalDateTime.now());
            newItem.setCreatedBy("Created by a Transaction");
            itemRepository.save(newItem);
        }

        System.out.println("✅ Added items to warehouse: " + warehouse.getName());
    }

    /**
     * Adds items back to a warehouse (e.g. on rejection or deletion).
     */
    private void addBackToWarehouseInventory(UUID warehouseId, ItemType itemType, int quantity) {
        if (quantity <= 0) return;

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found: " + warehouseId));

        List<Item> existing = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                itemType.getId(), warehouseId, ItemStatus.IN_WAREHOUSE);

        Double unitPrice = existing.stream()
                .map(Item::getUnitPrice)
                .filter(p -> p != null && p > 0)
                .findFirst()
                .orElse(null);

        Item returned = new Item();
        returned.setItemType(itemType);
        returned.setQuantity(quantity);
        returned.setUnitPrice(unitPrice);
        returned.setItemStatus(ItemStatus.IN_WAREHOUSE);
        returned.setWarehouse(warehouse);
        returned.setResolved(false);
        returned.setItemSource(ItemSource.TRANSACTION_TRANSFER);
        returned.setCreatedAt(LocalDateTime.now());

        if (unitPrice != null) returned.calculateTotalValue();
        itemRepository.save(returned);

        System.out.println("↩️ Returned " + quantity + " x " + itemType.getName() + " @ " + unitPrice + " EGP");
    }

    // ========================================
    // EQUIPMENT INVENTORY OPERATIONS
    // Equipment is always the receiver, never the sender.
    // ========================================

    private void addToEquipmentConsumables(UUID equipmentId, ItemType itemType, int quantity, Transaction transaction) {
        System.out.println("⚙️ Adding " + quantity + " " + itemType.getName() + " to equipment: " + equipmentId);
        System.out.println("   Transaction purpose: " + transaction.getPurpose());

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + equipmentId));

        // Retrieve unit price from sender deduction info
        Double unitPrice = null;
        TransactionItem txItem = transaction.getItems().stream()
                .filter(i -> i.getItemType().getId().equals(itemType.getId()))
                .findFirst()
                .orElse(null);

        if (txItem != null && txItem.getDeductedItems() != null && !txItem.getDeductedItems().isEmpty()) {
            unitPrice = (Double) txItem.getDeductedItems().get(0).get("unitPrice");
            System.out.println("💰 Unit price from deduction: " + unitPrice);
        }

        if (transaction.getPurpose() == TransactionPurpose.CONSUMABLE) {
            // Add to available equipment stock
            Consumable existing = consumableRepository.findByEquipmentIdAndItemTypeIdAndStatus(
                    equipmentId, itemType.getId(), ItemStatus.IN_WAREHOUSE);

            if (existing != null) {
                existing.setQuantity(existing.getQuantity() + quantity);
                existing.setTransaction(transaction);
                if (unitPrice != null) {
                    existing.setUnitPrice(unitPrice);
                    existing.setTotalValue(existing.getQuantity() * unitPrice);
                }
                consumableRepository.save(existing);
                System.out.println("✅ Updated existing consumable: +" + quantity);
            } else {
                Consumable consumable = new Consumable();
                consumable.setEquipment(equipment);
                consumable.setItemType(itemType);
                consumable.setQuantity(quantity);
                consumable.setStatus(ItemStatus.IN_WAREHOUSE);
                consumable.setTransaction(transaction);
                if (unitPrice != null) {
                    consumable.setUnitPrice(unitPrice);
                    consumable.setTotalValue(quantity * unitPrice);
                }
                consumableRepository.save(consumable);
                System.out.println("✅ Created new consumable stock entry: " + quantity);
            }
        } else {
            // MAINTENANCE or other purposes → CONSUMED entry
            Consumable consumed = new Consumable();
            consumed.setEquipment(equipment);
            consumed.setItemType(itemType);
            consumed.setQuantity(quantity);
            consumed.setStatus(ItemStatus.CONSUMED);
            consumed.setTransaction(transaction);
            if (unitPrice != null) {
                consumed.setUnitPrice(unitPrice);
                consumed.setTotalValue(quantity * unitPrice);
            }
            consumableRepository.save(consumed);
            System.out.println("✅ Created CONSUMED entry: " + quantity + " (purpose: " + transaction.getPurpose() + ")");
        }
    }

    // ========================================
    // VALIDATION METHODS
    // ========================================

    private void validateSenderHasAvailableInventory(UUID senderId, List<TransactionItem> items) {
        System.out.println("🔍 Validating sender warehouse inventory");
        for (TransactionItem item : items) {
            ItemType itemType = getItemType(item.getItemType().getId());
            List<Item> available = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                    itemType.getId(), senderId, ItemStatus.IN_WAREHOUSE);
            int total = available.stream().mapToInt(Item::getQuantity).sum();
            if (total < item.getQuantity()) {
                throw new IllegalArgumentException(
                        String.format("Insufficient inventory for %s: Available=%d, Requested=%d",
                                itemType.getName(), total, item.getQuantity()));
            }
        }
    }

    private void validateEntityExists(PartyType type, UUID id) {
        if (type == PartyType.LOSS) return;
        switch (type) {
            case WAREHOUSE:
                warehouseRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Warehouse not found: " + id));
                break;
            case EQUIPMENT:
                equipmentRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));
                break;
            default:
                throw new IllegalArgumentException("Unsupported entity type: " + type);
        }
    }

    // ========================================
    // QUERY METHODS
    // ========================================

    public List<Transaction> getTransactionsByEntity(PartyType entityType, UUID entityId) {
        return transactionRepository.findBySenderTypeAndSenderIdOrReceiverTypeAndReceiverId(
                entityType, entityId, entityType, entityId);
    }

    public List<Transaction> getTransactionsForWarehouse(UUID warehouseId) {
        return transactionRepository.findTransactionsByPartyIdAndType(warehouseId, PartyType.WAREHOUSE);
    }

    public List<Transaction> getTransactionsForEquipment(UUID equipmentId) {
        return transactionRepository.findTransactionsByPartyIdAndType(equipmentId, PartyType.EQUIPMENT);
    }

    public Transaction getTransactionById(UUID transactionId) {
        return transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));
    }

    public Optional<Transaction> findByBatchNumber(int batchNumber) {
        return transactionRepository.findByBatchNumber(batchNumber);
    }

    public Transaction saveTransaction(Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    public ItemType getItemTypeById(UUID itemTypeId) {
        return itemTypeRepository.findById(itemTypeId)
                .orElseThrow(() -> new IllegalArgumentException("Item type not found: " + itemTypeId));
    }

    public List<Transaction> getTransactionsForEquipmentByPurpose(UUID equipmentId, TransactionPurpose purpose) {
        return getTransactionsForEquipment(equipmentId).stream()
                .filter(t -> t.getPurpose() == purpose)
                .collect(Collectors.toList());
    }

    public List<Transaction> getConsumableTransactionsForEquipment(UUID equipmentId) {
        return getTransactionsForEquipmentByPurpose(equipmentId, TransactionPurpose.CONSUMABLE);
    }

    public List<Transaction> getMaintenanceTransactionsForEquipment(UUID equipmentId) {
        return getTransactionsForEquipmentByPurpose(equipmentId, TransactionPurpose.MAINTENANCE);
    }

    public List<Transaction> getIncomingTransactionsForEquipment(UUID equipmentId) {
        return transactionRepository.findByReceiverTypeAndReceiverIdAndStatusAndSentFirstNot(
                PartyType.EQUIPMENT, equipmentId, TransactionStatus.PENDING, equipmentId);
    }

    public List<Transaction> getOutgoingTransactionsForEquipment(UUID equipmentId) {
        return transactionRepository.findBySenderTypeAndSenderIdAndStatusAndSentFirstNot(
                PartyType.EQUIPMENT, equipmentId, TransactionStatus.PENDING, equipmentId);
    }

    public List<Transaction> getPendingTransactionsInitiatedByEquipment(UUID equipmentId) {
        return transactionRepository.findByStatusAndSentFirst(TransactionStatus.PENDING, equipmentId);
    }

    // ========================================
    // MAINTENANCE INTEGRATION
    // ========================================

    @Transactional
    public Transaction acceptTransactionWithMaintenanceHandling(
            UUID transactionId,
            Map<UUID, Integer> receivedQuantities,
            Map<UUID, Boolean> itemsNotReceived,
            String username,
            String acceptanceComment,
            TransactionPurpose purpose,
            com.example.backend.dto.equipment.MaintenanceLinkingRequest maintenanceRequest) {

        Transaction accepted = acceptTransactionWithPurpose(
                transactionId, receivedQuantities, itemsNotReceived, username, acceptanceComment, purpose);

        if (maintenanceRequest != null && purpose == TransactionPurpose.MAINTENANCE) {
            if (accepted.getPurpose() != TransactionPurpose.MAINTENANCE) {
                accepted.setPurpose(TransactionPurpose.MAINTENANCE);
                transactionRepository.save(accepted);
            }
        }

        return accepted;
    }

    // ========================================
    // UTILITY / BUILDER METHODS
    // ========================================

    private Transaction buildTransaction(PartyType senderType, UUID senderId,
                                         PartyType receiverType, UUID receiverId,
                                         LocalDateTime transactionDate, String username,
                                         int batchNumber, TransactionPurpose purpose, String description) {
        Transaction.TransactionBuilder builder = Transaction.builder()
                .createdAt(LocalDateTime.now())
                .transactionDate(transactionDate)
                .status(TransactionStatus.PENDING)
                .senderType(senderType)
                .senderId(senderId)
                .sentFirst(senderId)   // sender always initiates
                .receiverType(receiverType)
                .receiverId(receiverId)
                .addedBy(username)
                .batchNumber(batchNumber);

        if (purpose != null) builder.purpose(purpose);
        if (description != null) builder.description(description);

        return builder.build();
    }

    private ItemType getItemType(UUID itemTypeId) {
        return itemTypeRepository.findById(itemTypeId)
                .orElseThrow(() -> new IllegalArgumentException("Item type not found: " + itemTypeId));
    }

    private String getEntityName(PartyType type, UUID entityId) {
        if (type == PartyType.WAREHOUSE) {
            return warehouseRepository.findById(entityId).map(Warehouse::getName).orElse("Unknown Warehouse");
        } else if (type == PartyType.EQUIPMENT) {
            return equipmentRepository.findById(entityId).map(Equipment::getName).orElse("Unknown Equipment");
        } else if (type == PartyType.LOSS) {
            return "Loss/Disposal";
        }
        return "Unknown Entity";
    }

    // ========================================
    // NOTIFICATION HELPERS
    // ========================================

    private void sendCreationNotifications(Transaction tx) {
        try {
            String receiverName = getEntityName(tx.getReceiverType(), tx.getReceiverId());
            String itemsSummary = tx.getItems().stream()
                    .map(i -> i.getQuantity() + "x " + i.getItemType().getName())
                    .collect(Collectors.joining(", "));

            if (tx.getReceiverType() == PartyType.LOSS) {
                notificationService.sendNotificationToWarehouseUsers(
                        "Loss Transaction Completed",
                        "Loss/disposal (Batch #" + tx.getBatchNumber() + ") completed: " + itemsSummary,
                        NotificationType.INFO, "/warehouses/" + tx.getSenderId(), "TRANSACTION_" + tx.getId());
                return;
            }

            // Notify sender
            notificationService.sendNotificationToWarehouseUsers(
                    "Transaction Created",
                    "You created transaction (Batch #" + tx.getBatchNumber() + ") to " + receiverName + ": " + itemsSummary,
                    NotificationType.INFO, "/warehouses/" + tx.getSenderId(), "TRANSACTION_" + tx.getId());

            // Notify receiver
            String senderName = getEntityName(PartyType.WAREHOUSE, tx.getSenderId());
            String pendingMsg = "New pending transaction (Batch #" + tx.getBatchNumber() + ") from " + senderName + ": " + itemsSummary;

            if (tx.getReceiverType() == PartyType.WAREHOUSE) {
                notificationService.sendNotificationToWarehouseUsers(
                        "New Transaction Pending", pendingMsg,
                        NotificationType.WARNING, "/warehouses/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            } else if (tx.getReceiverType() == PartyType.EQUIPMENT) {
                notificationService.sendNotificationToEquipmentUsers(
                        "New Transaction Pending", pendingMsg,
                        NotificationType.WARNING, "/equipment/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            }
        } catch (Exception e) {
            System.err.println("Failed to send creation notifications: " + e.getMessage());
        }
    }

    private void sendAcceptanceNotifications(Transaction tx) {
        try {
            String senderName = getEntityName(tx.getSenderType(), tx.getSenderId());
            String receiverName = getEntityName(tx.getReceiverType(), tx.getReceiverId());

            if (tx.getStatus() == TransactionStatus.ACCEPTED) {
                String itemsSummary = tx.getItems().stream()
                        .filter(i -> i.getStatus() == TransactionStatus.ACCEPTED)
                        .map(i -> i.getReceivedQuantity() + "x " + i.getItemType().getName())
                        .collect(Collectors.joining(", "));

                notificationService.sendNotificationToWarehouseUsers(
                        "Transaction Accepted",
                        "Transaction (Batch #" + tx.getBatchNumber() + ") to " + receiverName + " was accepted: " + itemsSummary,
                        NotificationType.SUCCESS, "/warehouses/" + tx.getSenderId(), "TRANSACTION_" + tx.getId());

                String receiverMsg = "You accepted transaction (Batch #" + tx.getBatchNumber() + ") from " + senderName + ": " + itemsSummary;
                if (tx.getReceiverType() == PartyType.WAREHOUSE) {
                    notificationService.sendNotificationToWarehouseUsers("Transaction Completed", receiverMsg,
                            NotificationType.SUCCESS, "/warehouses/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
                } else if (tx.getReceiverType() == PartyType.EQUIPMENT) {
                    notificationService.sendNotificationToEquipmentUsers("Transaction Completed", receiverMsg,
                            NotificationType.SUCCESS, "/equipment/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
                }

            } else if (tx.getStatus() == TransactionStatus.REJECTED) {
                String reason = tx.getRejectionReason() != null ? tx.getRejectionReason() : "Some items had issues";

                notificationService.sendNotificationToWarehouseUsers(
                        "Transaction Rejected",
                        "Transaction (Batch #" + tx.getBatchNumber() + ") to " + receiverName + " was rejected. Reason: " + reason,
                        NotificationType.ERROR, "/warehouses/" + tx.getSenderId(), "TRANSACTION_" + tx.getId());

                String receiverMsg = "Transaction (Batch #" + tx.getBatchNumber() + ") from " + senderName + " completed with issues. Reason: " + reason;
                if (tx.getReceiverType() == PartyType.WAREHOUSE) {
                    notificationService.sendNotificationToWarehouseUsers("Transaction Rejected", receiverMsg,
                            NotificationType.INFO, "/warehouses/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
                } else if (tx.getReceiverType() == PartyType.EQUIPMENT) {
                    notificationService.sendNotificationToEquipmentUsers("Transaction Rejected", receiverMsg,
                            NotificationType.INFO, "/equipment/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to send acceptance notifications: " + e.getMessage());
        }
    }

    private void sendRejectionNotifications(Transaction tx, String reason) {
        try {
            String senderName = getEntityName(tx.getSenderType(), tx.getSenderId());
            String receiverName = getEntityName(tx.getReceiverType(), tx.getReceiverId());

            notificationService.sendNotificationToWarehouseUsers(
                    "Transaction Rejected",
                    "Transaction (Batch #" + tx.getBatchNumber() + ") to " + receiverName + " was rejected. Reason: " + reason,
                    NotificationType.ERROR, "/warehouses/" + tx.getSenderId(), "TRANSACTION_" + tx.getId());

            String receiverMsg = "You rejected transaction (Batch #" + tx.getBatchNumber() + ") from " + senderName + ". Reason: " + reason;
            if (tx.getReceiverType() == PartyType.WAREHOUSE) {
                notificationService.sendNotificationToWarehouseUsers("Transaction Rejected", receiverMsg,
                        NotificationType.INFO, "/warehouses/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            } else if (tx.getReceiverType() == PartyType.EQUIPMENT) {
                notificationService.sendNotificationToEquipmentUsers("Transaction Rejected", receiverMsg,
                        NotificationType.INFO, "/equipment/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            }
        } catch (Exception e) {
            System.err.println("Failed to send rejection notifications: " + e.getMessage());
        }
    }

    private void sendUpdateNotifications(Transaction tx) {
        try {
            String senderName = getEntityName(tx.getSenderType(), tx.getSenderId());
            String receiverName = getEntityName(tx.getReceiverType(), tx.getReceiverId());

            notificationService.sendNotificationToWarehouseUsers(
                    "Transaction Updated",
                    "Your transaction (Batch #" + tx.getBatchNumber() + ") to " + receiverName + " has been updated",
                    NotificationType.INFO, "/warehouses/" + tx.getSenderId(), "TRANSACTION_" + tx.getId());

            String receiverMsg = "Transaction (Batch #" + tx.getBatchNumber() + ") from " + senderName + " has been updated";
            if (tx.getReceiverType() == PartyType.WAREHOUSE) {
                notificationService.sendNotificationToWarehouseUsers("Transaction Updated", receiverMsg,
                        NotificationType.INFO, "/warehouses/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            } else if (tx.getReceiverType() == PartyType.EQUIPMENT) {
                notificationService.sendNotificationToEquipmentUsers("Transaction Updated", receiverMsg,
                        NotificationType.INFO, "/equipment/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            }
        } catch (Exception e) {
            System.err.println("Failed to send update notifications: " + e.getMessage());
        }
    }

    private void sendDeletionNotifications(Transaction tx) {
        try {
            String senderName = getEntityName(tx.getSenderType(), tx.getSenderId());
            String receiverName = getEntityName(tx.getReceiverType(), tx.getReceiverId());

            notificationService.sendNotificationToWarehouseUsers(
                    "Transaction Cancelled",
                    "Your transaction (Batch #" + tx.getBatchNumber() + ") to " + receiverName + " has been cancelled",
                    NotificationType.WARNING, "/warehouses/" + tx.getSenderId(), "TRANSACTION_" + tx.getId());

            String receiverMsg = "Transaction (Batch #" + tx.getBatchNumber() + ") from " + senderName + " has been cancelled";
            if (tx.getReceiverType() == PartyType.WAREHOUSE) {
                notificationService.sendNotificationToWarehouseUsers("Transaction Cancelled", receiverMsg,
                        NotificationType.WARNING, "/warehouses/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            } else if (tx.getReceiverType() == PartyType.EQUIPMENT) {
                notificationService.sendNotificationToEquipmentUsers("Transaction Cancelled", receiverMsg,
                        NotificationType.WARNING, "/equipment/" + tx.getReceiverId(), "TRANSACTION_" + tx.getId());
            }
        } catch (Exception e) {
            System.err.println("Failed to send deletion notifications: " + e.getMessage());
        }
    }
}