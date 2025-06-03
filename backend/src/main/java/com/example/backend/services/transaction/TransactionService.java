package com.example.backend.services.transaction;

import com.example.backend.models.*;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.repositories.transaction.TransactionItemRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    // ========================================
    // BATCH MATCHING LOGIC - NEW ADDITION
    // ========================================

    /**
     * Attempts to match transactions with the same batch number between two warehouses
     * Handles case where:
     * - Warehouse A creates: A → B (I sent to B)
     * - Warehouse B creates: B ← A (I received from A, which is A → B initiated by B)
     */
    public void attemptBatchMatching(int batchNumber, UUID senderId, UUID receiverId) {
        System.out.println("🔍 Attempting to match transactions with:");
        System.out.println("Batch Number: " + batchNumber);
        System.out.println("Sender ID: " + senderId);
        System.out.println("Receiver ID: " + receiverId);

        // Find all pending transactions with this batch number
        List<Transaction> batchTransactions = transactionRepository.findByBatchNumberAndStatus(batchNumber, TransactionStatus.PENDING);

        // Look for matching transactions in both directions
        Transaction senderInitiatedTx = null;  // A → B initiated by A
        Transaction receiverInitiatedTx = null; // A → B initiated by B (receiver claiming they got it)

        for (Transaction tx : batchTransactions) {
            // Only process warehouse-to-warehouse transactions
            if (tx.getSenderType() != PartyType.WAREHOUSE || tx.getReceiverType() != PartyType.WAREHOUSE) {
                continue;
            }

            // Check if this transaction matches our sender→receiver flow
            if (tx.getSenderId().equals(senderId) && tx.getReceiverId().equals(receiverId)) {
                if (tx.getSentFirst().equals(senderId)) {
                    // Sender initiated: "I (sender) sent to receiver"
                    senderInitiatedTx = tx;
                    System.out.println("📤 Found sender-initiated transaction: " + tx.getId());
                } else if (tx.getSentFirst().equals(receiverId)) {
                    // Receiver initiated: "I (receiver) got from sender"
                    receiverInitiatedTx = tx;
                    System.out.println("📥 Found receiver-initiated transaction: " + tx.getId());
                }
            }
        }

        // If we found both complementary transactions, match them
        if (senderInitiatedTx != null && receiverInitiatedTx != null) {
            System.out.println("✅ Found matching pair, processing batch match");
            processBatchMatchedTransactions(senderInitiatedTx, receiverInitiatedTx);
        } else {
            System.out.println("📝 No matching pair found:");
            System.out.println("  - Sender-initiated: " + (senderInitiatedTx != null ? "✓" : "✗"));
            System.out.println("  - Receiver-initiated: " + (receiverInitiatedTx != null ? "✓" : "✗"));
        }
    }

    /**
     * Checks if two transactions are complementary - not needed anymore since we find them specifically
     */
    private boolean areComplementaryTransactions(Transaction tx1, Transaction tx2) {
        return tx1.getBatchNumber() == tx2.getBatchNumber() &&
                tx1.getSenderId().equals(tx2.getSenderId()) &&
                tx1.getReceiverId().equals(tx2.getReceiverId()) &&
                !tx1.getSentFirst().equals(tx2.getSentFirst()) && // Different initiators
                tx1.getSenderType() == PartyType.WAREHOUSE &&
                tx1.getReceiverType() == PartyType.WAREHOUSE &&
                tx2.getSenderType() == PartyType.WAREHOUSE &&
                tx2.getReceiverType() == PartyType.WAREHOUSE;
    }

    /**
     * Creates a consistent key for warehouse pairs regardless of direction
     */
    private String createWarehousePairKey(UUID warehouse1, UUID warehouse2) {
        String w1 = warehouse1.toString();
        String w2 = warehouse2.toString();
        return w1.compareTo(w2) < 0 ? w1 + "_" + w2 : w2 + "_" + w1;
    }

    /**
     * Processes two matched transactions as if they were a single sender-initiated transaction
     * senderTransaction: The transaction where sender claims "I sent X"
     * receiverTransaction: The transaction where receiver claims "I received Y"
     */
    private void processBatchMatchedTransactions(Transaction senderTransaction, Transaction receiverTransaction) {
        System.out.println("🔄 Processing batch matched transactions:");
        System.out.println("📤 Sender Transaction: " + senderTransaction.getId() + " (initiated by sender)");
        System.out.println("📥 Receiver Transaction: " + receiverTransaction.getId() + " (initiated by receiver)");

        // Create received quantities map from receiver transaction
        Map<UUID, Integer> receivedQuantities = createReceivedQuantitiesMap(senderTransaction, receiverTransaction);

        // For batch matching, assume no items were marked as "not received" (create empty map)
        Map<UUID, Boolean> itemsNotReceived = new HashMap<>(); // ADD THIS

        // Process the sender transaction as if it was accepted by the receiver
        String username = receiverTransaction.getAddedBy();
        String acceptanceComment = "Auto-matched with receiver transaction (Batch #" + senderTransaction.getBatchNumber() + ")";

        // Mark the receiver transaction as matched/processed
        receiverTransaction.setStatus(TransactionStatus.ACCEPTED);
        receiverTransaction.setCompletedAt(LocalDateTime.now());
        receiverTransaction.setApprovedBy("SYSTEM_BATCH_MATCH");
        receiverTransaction.setAcceptanceComment("Matched with sender transaction (Batch #" + receiverTransaction.getBatchNumber() + ")");
        transactionRepository.save(receiverTransaction);

        // Process the sender transaction using existing accept logic
        acceptTransaction(senderTransaction.getId(), receivedQuantities, itemsNotReceived, username, acceptanceComment); // ADD itemsNotReceived

        System.out.println("🎉 Batch matching completed successfully for batch #" + senderTransaction.getBatchNumber());
        System.out.println("✅ Sender claimed: " + senderTransaction.getItems().stream().mapToInt(TransactionItem::getQuantity).sum() + " total items");
        System.out.println("✅ Receiver claimed: " + receiverTransaction.getItems().stream().mapToInt(TransactionItem::getQuantity).sum() + " total items");
    }

    /**
     * Creates a map of received quantities by matching items between sender and receiver transactions
     */
    private Map<UUID, Integer> createReceivedQuantitiesMap(Transaction senderTransaction, Transaction receiverTransaction) {
        Map<UUID, Integer> receivedQuantities = new HashMap<>();

        // Create a map of receiver transaction items by item type for easy lookup
        Map<UUID, TransactionItem> receiverItemsByType = receiverTransaction.getItems().stream()
                .collect(Collectors.toMap(
                        item -> item.getItemType().getId(),
                        item -> item
                ));

        // Map sender transaction items to received quantities
        for (TransactionItem senderItem : senderTransaction.getItems()) {
            TransactionItem receiverItem = receiverItemsByType.get(senderItem.getItemType().getId());
            int receivedQuantity = (receiverItem != null) ? receiverItem.getQuantity() : 0;
            receivedQuantities.put(senderItem.getId(), receivedQuantity);
        }

        return receivedQuantities;
    }

    // ========================================
    // MODIFIED CREATE TRANSACTION TO TRIGGER BATCH MATCHING
    // ========================================

    public Transaction createTransaction(
            PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> items,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            UUID sentFirst) {

        Transaction transaction = createTransactionWithPurpose(
                senderType, senderId, receiverType, receiverId,
                items, transactionDate, username, batchNumber, sentFirst, null);

        // After creating the transaction, attempt batch matching with specific sender/receiver IDs
        attemptBatchMatching(batchNumber, senderId, receiverId);

        return transaction;
    }

    public Transaction createEquipmentTransaction(
            PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> items,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            UUID sentFirst, TransactionPurpose purpose) {

        Transaction transaction = createTransactionWithPurpose(
                senderType, senderId, receiverType, receiverId,
                items, transactionDate, username, batchNumber, sentFirst, purpose);

        // After creating the transaction, attempt batch matching with specific sender/receiver IDs
        attemptBatchMatching(batchNumber, senderId, receiverId);

        return transaction;
    }

    // ========================================
    // CORE TRANSACTION CREATION METHODS (UNCHANGED)
    // ========================================

    private Transaction createTransactionWithPurpose(
            PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> items,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            UUID sentFirst, TransactionPurpose purpose) {

        System.out.println("🚀 Starting createTransaction() - VALIDATION ONLY MODE");
        System.out.println("Sender Type: " + senderType + ", Sender ID: " + senderId);
        System.out.println("Receiver Type: " + receiverType + ", Receiver ID: " + receiverId);
        System.out.println("SentFirst (Initiator): " + sentFirst);

        validateEntityExists(senderType, senderId);
        validateEntityExists(receiverType, receiverId);

        // ONLY validate availability if sender initiated (they're claiming they have the items)
        // If sender initiated, validate AND immediately deduct inventory (they're claiming they sent it)
        // If sender initiated AND is a warehouse, validate AND immediately deduct inventory
        if (sentFirst.equals(senderId) && senderType == PartyType.WAREHOUSE) {
            validateSenderHasAvailableInventory(senderType, senderId, items);

            // Immediately deduct warehouse inventory since sender is claiming they sent these items
            for (TransactionItem item : items) {
                deductFromWarehouseInventory(senderId, item.getItemType(), item.getQuantity());
            }
            System.out.println("✅ Immediately deducted warehouse inventory from sender (they claim they sent it)");
        } else if (sentFirst.equals(senderId)) {
            // For equipment, just validate (keep original behavior)
            validateSenderHasAvailableInventory(senderType, senderId, items);
            System.out.println("✅ Validated sender has sufficient inventory (NO CHANGES MADE)");
        }

        Transaction transaction = buildTransaction(
                senderType, senderId, receiverType, receiverId,
                transactionDate, username, batchNumber, sentFirst, purpose);

        transaction.setItems(new ArrayList<>());
        for (TransactionItem item : items) {
            item.setTransaction(transaction);
            item.setStatus(TransactionStatus.PENDING);
            transaction.addItem(item);
        }

        Transaction saved = transactionRepository.save(transaction);
        System.out.println("✅ Transaction saved in PENDING state - NO inventory changes made");
        return saved;
    }

    // ========================================
    // TRANSACTION ACCEPTANCE - FIXED LOGIC (UNCHANGED)
    // ========================================

    public Transaction acceptTransaction(UUID transactionId, Map<UUID, Integer> receivedQuantities,
                                         Map<UUID, Boolean> itemsNotReceived, // ADD THIS
                                         String username, String acceptanceComment) {
        return acceptTransactionWithPurpose(transactionId, receivedQuantities, itemsNotReceived, username, acceptanceComment, null);
    }

    public Transaction acceptEquipmentTransaction(UUID transactionId, Map<UUID, Integer> receivedQuantities,
                                                  Map<UUID, Boolean> itemsNotReceived, // ADD THIS
                                                  String username, String acceptanceComment, TransactionPurpose purpose) {
        return acceptTransactionWithPurpose(transactionId, receivedQuantities, itemsNotReceived, username, acceptanceComment, purpose);
    }

    /**
     * 🚨 FIXED: Correctly interprets who claims what based on transaction flow
     */
    private Transaction acceptTransactionWithPurpose(UUID transactionId, Map<UUID, Integer> receivedQuantities,
                                                     Map<UUID, Boolean> itemsNotReceived, // ADD THIS
                                                     String username, String acceptanceComment, TransactionPurpose purpose) {
        System.out.println("🌍 Processing REAL-WORLD inventory changes based on actual claims");

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

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

        // 🎯 CRITICAL FIX: Process each item with correct claim interpretation
        for (TransactionItem item : transaction.getItems()) {
            Integer receivedQuantity = receivedQuantities.get(item.getId());
            if (receivedQuantity == null) {
                throw new IllegalArgumentException("Received quantity not provided for item: " + item.getId());
            }

            item.setReceivedQuantity(receivedQuantity);

            // NEW: Check if item was marked as not received FIRST
            Boolean itemNotReceived = itemsNotReceived != null ? itemsNotReceived.get(item.getId()) : false;
            if (itemNotReceived != null && itemNotReceived) {
                allItemsMatch = false;
                item.setStatus(TransactionStatus.REJECTED);
                item.setRejectionReason("Item was not sent/received");
                System.out.println("📭 ITEM NOT SENT/RECEIVED: " + item.getItemType().getName());

                // For items not sent/received, we still need to handle inventory but differently
                processItemNotSentReceived(transaction, item);
                continue; // Skip the rest of the logic for this item
            }

            // 🚨 FIXED: Determine what each party actually claims based on who initiated
            int senderClaimedQuantity;
            int receiverClaimedQuantity;

            if (transaction.getSentFirst().equals(transaction.getSenderId())) {
                // SENDER INITIATED: Sender set original quantity, receiver reports what they got
                senderClaimedQuantity = item.getQuantity(); // Original transaction quantity = sender's claim
                receiverClaimedQuantity = receivedQuantity;  // What receiver reports they got
                System.out.println(String.format("📤 SENDER-INITIATED: Sender claims %d, Receiver reports %d",
                        senderClaimedQuantity, receiverClaimedQuantity));
            } else {
                // RECEIVER INITIATED: Receiver set original quantity, sender reports what they sent
                receiverClaimedQuantity = item.getQuantity(); // Original transaction quantity = receiver's claim
                senderClaimedQuantity = receivedQuantity;     // What sender reports they sent
                System.out.println(String.format("📥 RECEIVER-INITIATED: Receiver claims %d, Sender reports %d",
                        receiverClaimedQuantity, senderClaimedQuantity));
            }

            // Check if quantities match
            if (senderClaimedQuantity != receiverClaimedQuantity) {
                allItemsMatch = false;
                String reason = String.format("Quantity mismatch",
                        senderClaimedQuantity, receiverClaimedQuantity);
                item.setStatus(TransactionStatus.REJECTED);
                item.setRejectionReason(reason);
                System.out.println("⚠️ MISMATCH: " + reason);
            } else {
                item.setStatus(TransactionStatus.ACCEPTED);
                item.setRejectionReason(null);
            }

            // 🌍 Process real-world inventory changes with CORRECT claims
            processRealWorldInventoryChangesFixed(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
        }

        // Set overall transaction status
        if (allItemsMatch) {
            transaction.setStatus(TransactionStatus.ACCEPTED);
            transaction.setRejectionReason(null);
            System.out.println("✅ Transaction ACCEPTED - Inventory reflects reality");
        } else {
            transaction.setStatus(TransactionStatus.REJECTED);
            transaction.setRejectionReason("Some items had issues - Check individual item statuses");
            System.out.println("❌ Transaction REJECTED - But inventory updated to reflect reality");
        }

        return transactionRepository.save(transaction);
    }

    // NEW: Method to handle items that were not sent/received
    private void processItemNotSentReceived(Transaction transaction, TransactionItem item) {
        System.out.println("📭 Processing item that was not sent/received: " + item.getItemType().getName());

        // For items not sent/received, we need to handle inventory correctly
        // If sender initiated and is warehouse, they already deducted - need to add back
        if (transaction.getSentFirst().equals(transaction.getSenderId()) &&
                transaction.getSenderType() == PartyType.WAREHOUSE) {

            System.out.println("↩️ Adding back item to sender warehouse (item was not actually sent)");
            addBackToWarehouseInventory(transaction.getSenderId(), item.getItemType(), item.getQuantity());
        }

        // No inventory changes for receiver since they never got the item
        System.out.println("⚠️ No inventory added to receiver (item was not received)");
    }

    /**
     * 🚨 FIXED: Processes inventory changes with correct sender/receiver claims
     */
    private void processRealWorldInventoryChangesFixed(Transaction transaction, TransactionItem item,
                                                       int senderClaimedQuantity, int receiverClaimedQuantity) {
        System.out.println(String.format("🌍 Processing FIXED real-world changes: Sender claims %d, Receiver claims %d",
                senderClaimedQuantity, receiverClaimedQuantity));

        // Step 1: Deduct what sender CLAIMS they sent
        deductActualSentQuantityFromSender(transaction, item, senderClaimedQuantity);

        // Step 2: Add what receiver CLAIMS they received
        addActualReceivedQuantityToReceiver(transaction, item, receiverClaimedQuantity);

        // Step 3: Handle discrepancies with CORRECT logic
        handleQuantityDiscrepanciesFixed(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
    }

    /**
     * 🚨 FIXED: Handles discrepancies with correct STOLEN/OVERRECEIVED logic
     */
    private void handleQuantityDiscrepanciesFixed(Transaction transaction, TransactionItem item,
                                                  int senderClaimedQuantity, int receiverClaimedQuantity) {
        int discrepancy = senderClaimedQuantity - receiverClaimedQuantity;

        if (discrepancy > 0) {
            // Sender claims they sent MORE than receiver claims they got = STOLEN/LOST
            System.out.println("🚨 STOLEN/LOST: " + discrepancy + " units went missing in transit");
            createStolenItemEntry(transaction, item, discrepancy);

        } else if (discrepancy < 0) {
            // Receiver claims they got MORE than sender claims they sent = OVERRECEIVED
            int overReceivedAmount = Math.abs(discrepancy);
            System.out.println("📈 OVERRECEIVED: " + overReceivedAmount + " units more than sender claimed to send");
            createOverReceivedItemEntry(transaction, item, overReceivedAmount);
        } else {
            // Perfect match - no discrepancy handling needed
            System.out.println("✅ Perfect quantity match - no discrepancy");
        }
    }

    // ========================================
    // INVENTORY OPERATIONS (UNCHANGED)
    // ========================================

    private void deductActualSentQuantityFromSender(Transaction transaction, TransactionItem item, int sentQuantity) {
        if (sentQuantity <= 0) return;

        // Check if sender initiated the transaction AND is a warehouse
        if (transaction.getSentFirst().equals(transaction.getSenderId()) && transaction.getSenderType() == PartyType.WAREHOUSE) {
            // Warehouse sender already deducted when creating transaction, so we might need to adjust
            int originalQuantity = item.getQuantity();
            int difference = originalQuantity - sentQuantity;

            if (difference > 0) {
                // Sender originally claimed more than they actually sent, so add back the difference
                System.out.println("↩️ Adding back " + difference + " to warehouse (they claimed to send more than they actually did)");
                addBackToWarehouseInventory(transaction.getSenderId(), item.getItemType(), difference);
            } else if (difference < 0) {
                // Sender actually sent more than originally claimed, deduct the additional amount
                int additionalAmount = Math.abs(difference);
                System.out.println("➖ Deducting additional " + additionalAmount + " from warehouse (they sent more than originally claimed)");
                deductFromWarehouseInventory(transaction.getSenderId(), item.getItemType(), additionalAmount);
            }
            // If difference == 0, no adjustment needed
        } else {
            // Either receiver initiated, or equipment is involved - use original logic
            System.out.println("➖ Deducting " + sentQuantity + " from sender (original logic)");

            if (transaction.getSenderType() == PartyType.WAREHOUSE) {
                deductFromWarehouseInventory(transaction.getSenderId(), item.getItemType(), sentQuantity);
            } else if (transaction.getSenderType() == PartyType.EQUIPMENT) {
                deductFromEquipmentConsumables(transaction.getSenderId(), item.getItemType(), sentQuantity);
            }
        }
    }

    private void addBackToWarehouseInventory(UUID warehouseId, ItemType itemType, int quantity) {
        if (quantity <= 0) return;

        System.out.println("↩️ Adding back " + quantity + " to warehouse inventory");

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found: " + warehouseId));

        // Create a new item entry for the returned quantity
        Item returnedItem = new Item();
        returnedItem.setItemType(itemType);
        returnedItem.setQuantity(quantity);
        returnedItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        returnedItem.setWarehouse(warehouse);
        returnedItem.setResolved(false);

        itemRepository.save(returnedItem);
        System.out.println("✅ Added back " + quantity + " units to warehouse inventory");
    }

    private void addActualReceivedQuantityToReceiver(Transaction transaction, TransactionItem item, int receivedQuantity) {
        if (receivedQuantity <= 0) return;

        System.out.println("➕ Adding " + receivedQuantity + " to receiver (what they claim they received)");

        if (transaction.getReceiverType() == PartyType.WAREHOUSE) {
            addToWarehouseInventory(transaction, item, receivedQuantity);
        } else if (transaction.getReceiverType() == PartyType.EQUIPMENT) {
            addToEquipmentConsumables(transaction.getReceiverId(), item.getItemType(), receivedQuantity, transaction);
        }
    }

    private void createStolenItemEntry(Transaction transaction, TransactionItem item, int stolenQuantity) {
        // STOLEN items are tracked at the SENDER location (where they went missing from)
        if (transaction.getSenderType() == PartyType.WAREHOUSE) {
            Warehouse warehouse = warehouseRepository.findById(transaction.getSenderId())
                    .orElseThrow(() -> new IllegalArgumentException("Sender warehouse not found"));

            // ✅ Use explicit setters instead of constructor
            Item stolenItem = new Item();
            stolenItem.setItemType(item.getItemType());
            stolenItem.setWarehouse(warehouse);
            stolenItem.setQuantity(stolenQuantity);
            stolenItem.setItemStatus(ItemStatus.MISSING);
            stolenItem.setTransactionItem(item); // Don't forget this
            stolenItem.setResolved(false);

            itemRepository.save(stolenItem);

            System.out.println(String.format("🚨 Created STOLEN entry: %d %s at warehouse %s",
                    stolenQuantity, item.getItemType().getName(), warehouse.getName()));

        } else if (transaction.getSenderType() == PartyType.EQUIPMENT) {
            // Equipment logic remains the same
            Equipment equipment = equipmentRepository.findById(transaction.getSenderId())
                    .orElseThrow(() -> new IllegalArgumentException("Sender equipment not found"));

            Consumable stolenConsumable = new Consumable();
            stolenConsumable.setEquipment(equipment);
            stolenConsumable.setItemType(item.getItemType());
            stolenConsumable.setQuantity(stolenQuantity);
            stolenConsumable.setStatus(ItemStatus.MISSING);
            stolenConsumable.setTransaction(transaction);
            consumableRepository.save(stolenConsumable);

            System.out.println(String.format("🚨 Created STOLEN consumable entry: %d %s at equipment %s",
                    stolenQuantity, item.getItemType().getName(), equipment.getName()));
        }
    }

    private void createOverReceivedItemEntry(Transaction transaction, TransactionItem item, int overReceivedQuantity) {
        // OVERRECEIVED items are tracked at the RECEIVER location (where the excess appeared)
        if (transaction.getReceiverType() == PartyType.WAREHOUSE) {
            Warehouse warehouse = warehouseRepository.findById(transaction.getReceiverId())
                    .orElseThrow(() -> new IllegalArgumentException("Receiver warehouse not found"));

            // ✅ Use explicit setters instead of constructor
            Item overReceivedItem = new Item();
            overReceivedItem.setItemType(item.getItemType());
            overReceivedItem.setWarehouse(warehouse);
            overReceivedItem.setQuantity(overReceivedQuantity);
            overReceivedItem.setItemStatus(ItemStatus.OVERRECEIVED);
            overReceivedItem.setTransactionItem(item); // Don't forget this
            overReceivedItem.setResolved(false);

            itemRepository.save(overReceivedItem);

            System.out.println(String.format("📈 Created OVERRECEIVED entry: %d %s at warehouse %s",
                    overReceivedQuantity, item.getItemType().getName(), warehouse.getName()));

        } else if (transaction.getReceiverType() == PartyType.EQUIPMENT) {
            // Equipment logic remains the same
            Equipment equipment = equipmentRepository.findById(transaction.getReceiverId())
                    .orElseThrow(() -> new IllegalArgumentException("Receiver equipment not found"));

            Consumable overReceivedConsumable = new Consumable();
            overReceivedConsumable.setEquipment(equipment);
            overReceivedConsumable.setItemType(item.getItemType());
            overReceivedConsumable.setQuantity(overReceivedQuantity);
            overReceivedConsumable.setStatus(ItemStatus.OVERRECEIVED);
            overReceivedConsumable.setTransaction(transaction);
            consumableRepository.save(overReceivedConsumable);

            System.out.println(String.format("📈 Created OVERRECEIVED consumable entry: %d %s at equipment %s",
                    overReceivedQuantity, item.getItemType().getName(), equipment.getName()));
        }
    }

    // ========================================
    // WAREHOUSE INVENTORY OPERATIONS (UNCHANGED)
    // ========================================

    private void deductFromWarehouseInventory(UUID warehouseId, ItemType itemType, int quantityToDeduct) {
        List<Item> availableItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                itemType.getId(), warehouseId, ItemStatus.IN_WAREHOUSE);

        if (availableItems.isEmpty()) {
            throw new IllegalArgumentException("No available items in warehouse for: " + itemType.getName());
        }

        // Calculate total available quantity across all items
        int totalAvailable = availableItems.stream().mapToInt(Item::getQuantity).sum();
        if (totalAvailable < quantityToDeduct) {
            throw new IllegalArgumentException("Not enough quantity in warehouse for: " + itemType.getName() +
                    ". Available: " + totalAvailable + ", Requested: " + quantityToDeduct);
        }

        // Sort items by creation date (oldest first) - FIFO approach
        availableItems.sort((a, b) -> {
            if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                return a.getCreatedAt().compareTo(b.getCreatedAt());
            }
            return a.getId().compareTo(b.getId()); // Fallback to ID if no creation date
        });

        int remainingToDeduct = quantityToDeduct;
        List<Item> itemsToDelete = new ArrayList<>();

        System.out.println("🔄 Deducting " + quantityToDeduct + " from warehouse inventory using FIFO method:");

        for (Item item : availableItems) {
            if (remainingToDeduct <= 0) break;

            int currentItemQuantity = item.getQuantity();

            if (currentItemQuantity <= remainingToDeduct) {
                // Use entire item and mark for deletion
                remainingToDeduct -= currentItemQuantity;
                itemsToDelete.add(item);
                System.out.println("  ➖ Using entire item: " + currentItemQuantity + " (Item ID: " + item.getId() + ")");
            } else {
                // Partially use this item
                item.setQuantity(currentItemQuantity - remainingToDeduct);
                itemRepository.save(item);
                System.out.println("  ➖ Partially using item: " + remainingToDeduct + " from " + currentItemQuantity +
                        " (Item ID: " + item.getId() + ", Remaining: " + item.getQuantity() + ")");
                remainingToDeduct = 0;
            }
        }

        // Delete items that were completely used
        if (!itemsToDelete.isEmpty()) {
            itemRepository.deleteAll(itemsToDelete);
            System.out.println("  🗑️ Deleted " + itemsToDelete.size() + " fully depleted items");
        }

        System.out.println("✅ Successfully deducted " + quantityToDeduct + " from warehouse inventory");
    }

    private void addToWarehouseInventory(Transaction transaction, TransactionItem transactionItem, int actualQuantity) {
        System.out.println("📦 Adding " + actualQuantity + " units to warehouse inventory as NEW ITEM ENTRY");

        // Get the receiving warehouse
        UUID receivingWarehouseId = transaction.getReceiverId();

        // Fetch the warehouse entity
        Warehouse warehouse = warehouseRepository.findById(receivingWarehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found: " + receivingWarehouseId));

        // 🆕 ALWAYS create a new item entry (no more checking for existing items)
        Item newItem = new Item();
        newItem.setItemType(transactionItem.getItemType());
        newItem.setQuantity(actualQuantity);
        newItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        newItem.setWarehouse(warehouse);
        newItem.setTransactionItem(transactionItem); // ✅ Always link to TransactionItem for traceability
        newItem.setResolved(false);

        itemRepository.save(newItem);

        System.out.println("✅ Created NEW item entry with quantity: " + actualQuantity +
                " linked to transaction: " + transaction.getId() +
                " (batch #" + transaction.getBatchNumber() + ")");

        System.out.println("✅ Successfully processed warehouse inventory addition - NEW ENTRY CREATED");
    }
    // ========================================
    // EQUIPMENT INVENTORY OPERATIONS (UNCHANGED)
    // ========================================

    private void deductFromEquipmentConsumables(UUID equipmentId, ItemType itemType, int quantity) {
        Consumable consumable = consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemType.getId());

        if (consumable == null || consumable.getQuantity() < quantity) {
            throw new IllegalArgumentException("Not enough consumables in equipment for: " + itemType.getName());
        }

        consumable.setQuantity(consumable.getQuantity() - quantity);
        if (consumable.getQuantity() <= 0) {
            consumableRepository.delete(consumable);
        } else {
            consumableRepository.save(consumable);
        }
        System.out.println("✅ Deducted " + quantity + " from equipment consumables");
    }

    private void addToEquipmentConsumables(UUID equipmentId, ItemType itemType, int quantity, Transaction transaction) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        // Get the original quantity from the transaction item
        TransactionItem transactionItem = transaction.getItems().stream()
                .filter(item -> item.getItemType().getId().equals(itemType.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Transaction item not found"));

        // Add the original quantity as CONSUMED
        Consumable consumedConsumable = new Consumable();
        consumedConsumable.setEquipment(equipment);
        consumedConsumable.setItemType(itemType);
        if (transactionItem.getQuantity() < quantity) {
            consumedConsumable.setQuantity(quantity-(quantity-transactionItem.getQuantity()));
        }
        else {
            consumedConsumable.setQuantity(quantity);
        }
        // Use original quantity
        consumedConsumable.setStatus(ItemStatus.CONSUMED);
        consumedConsumable.setTransaction(transaction);
        consumableRepository.save(consumedConsumable);




    }

    // ========================================
    // VALIDATION AND UTILITY METHODS (UNCHANGED)
    // ========================================

    private void validateSenderHasAvailableInventory(PartyType senderType, UUID senderId, List<TransactionItem> items) {
        if (senderType == PartyType.WAREHOUSE) {
            validateWarehouseInventoryAvailability(senderId, items);
        } else if (senderType == PartyType.EQUIPMENT) {
            validateEquipmentInventoryAvailability(senderId, items);
        }
    }

    private void validateWarehouseInventoryAvailability(UUID warehouseId, List<TransactionItem> items) {
        System.out.println("🔍 Validating warehouse inventory availability (READ-ONLY)");

        for (TransactionItem item : items) {
            ItemType itemType = getItemType(item.getItemType().getId());

            List<Item> availableItems = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                    itemType.getId(), warehouseId, ItemStatus.IN_WAREHOUSE);

            int totalAvailable = availableItems.stream().mapToInt(Item::getQuantity).sum();

            if (totalAvailable < item.getQuantity()) {
                throw new IllegalArgumentException(
                        String.format("Insufficient inventory in warehouse for %s: Available=%d, Requested=%d",
                                itemType.getName(), totalAvailable, item.getQuantity()));
            }
        }
    }

    private void validateEquipmentInventoryAvailability(UUID equipmentId, List<TransactionItem> items) {
        System.out.println("🔍 Validating equipment inventory availability (READ-ONLY)");

        for (TransactionItem item : items) {
            ItemType itemType = getItemType(item.getItemType().getId());

            Consumable consumable = consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemType.getId());
            int availableQuantity = (consumable != null) ? consumable.getQuantity() : 0;

            if (availableQuantity < item.getQuantity()) {
                throw new IllegalArgumentException(
                        String.format("Insufficient consumables in equipment for %s: Available=%d, Requested=%d",
                                itemType.getName(), availableQuantity, item.getQuantity()));
            }
        }
    }

    public Transaction rejectEquipmentTransaction(UUID transactionId, String rejectionReason, String username) {
        System.out.println("❌ Rejecting transaction cleanly - no inventory to revert");

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Transaction is not in PENDING status");
        }

        transaction.setRejectionReason(rejectionReason);
        transaction.setStatus(TransactionStatus.REJECTED);
        transaction.setCompletedAt(LocalDateTime.now());
        transaction.setApprovedBy(username);

        for (TransactionItem item : transaction.getItems()) {
            item.setStatus(TransactionStatus.REJECTED);
        }

        System.out.println("✅ Transaction rejected cleanly - no inventory changes were made");
        return transactionRepository.save(transaction);
    }

    // ========================================
    // UPDATE METHODS (SIMPLIFIED) (UNCHANGED)
    // ========================================

    public Transaction updateTransaction(
            UUID transactionId, PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId, List<TransactionItem> updatedItems,
            LocalDateTime transactionDate, String username, int batchNumber) {
        return updateTransactionWithPurpose(transactionId, senderType, senderId, receiverType,
                receiverId, updatedItems, transactionDate, username, batchNumber, null);
    }

    public Transaction updateEquipmentTransaction(
            UUID transactionId, PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId, List<TransactionItem> updatedItems,
            LocalDateTime transactionDate, String username, int batchNumber, TransactionPurpose purpose) {
        return updateTransactionWithPurpose(transactionId, senderType, senderId, receiverType,
                receiverId, updatedItems, transactionDate, username, batchNumber, purpose);
    }

    private Transaction updateTransactionWithPurpose(
            UUID transactionId, PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId, List<TransactionItem> updatedItems,
            LocalDateTime transactionDate, String username, int batchNumber, TransactionPurpose purpose) {

        System.out.println("🔄 Updating transaction with inventory role change handling");

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Only pending transactions can be updated");
        }

        validateEntityExists(senderType, senderId);
        validateEntityExists(receiverType, receiverId);

        // 🚨 NEW: Track if roles are changing
        boolean senderRoleChanged = !transaction.getSenderId().equals(senderId) || transaction.getSenderType() != senderType;
        boolean receiverRoleChanged = !transaction.getReceiverId().equals(receiverId) || transaction.getReceiverType() != receiverType;
        boolean initiatorChanged = !transaction.getSentFirst().equals(senderId) && !transaction.getSentFirst().equals(receiverId);

        System.out.println("🔍 Role change analysis:");
        System.out.println("  - Sender changed: " + senderRoleChanged);
        System.out.println("  - Receiver changed: " + receiverRoleChanged);
        System.out.println("  - Initiator changed: " + initiatorChanged);

        // 🚨 NEW: Handle inventory adjustments for role changes
        // 🚨 NEW: Handle inventory adjustments for role changes
        if (senderRoleChanged || receiverRoleChanged || initiatorChanged) {
            handleTransactionRoleChangeInventoryAdjustments(transaction, senderType, senderId, receiverType, receiverId, updatedItems);
        }

// 🚨 NEW: Handle inventory adjustments for sender-initiated warehouse transactions (quantity changes)
// 🚨 NEW: Handle inventory adjustments for sender-initiated warehouse transactions (quantity changes)
        if (!senderRoleChanged && !receiverRoleChanged && !initiatorChanged &&
                transaction.getSentFirst().equals(transaction.getSenderId()) &&
                transaction.getSenderType() == PartyType.WAREHOUSE &&
                senderType == PartyType.WAREHOUSE &&
                senderId.equals(transaction.getSenderId())) {

            System.out.println("🏭 Handling warehouse sender inventory adjustments for quantity changes");
            handleWarehouseSenderInventoryUpdate(transaction, updatedItems);
        }

        // Validate new sender has inventory if they're now the initiator
        if (transaction.getSentFirst().equals(senderId)) {
            validateSenderHasAvailableInventory(senderType, senderId, updatedItems);
        }

        // Update transaction details
        transaction.setSenderType(senderType);
        transaction.setSenderId(senderId);
        transaction.setReceiverType(receiverType);
        transaction.setReceiverId(receiverId);
        transaction.setTransactionDate(transactionDate);
        transaction.setBatchNumber(batchNumber);
        transaction.setAddedBy(username);

        if (purpose != null) {
            transaction.setPurpose(purpose);
        }

        // Update items
        transaction.getItems().clear();
        for (TransactionItem item : updatedItems) {
            item.setTransaction(transaction);
            item.setStatus(TransactionStatus.PENDING);
            transaction.getItems().add(item);
        }

        // 🚨 NEW: Apply new inventory changes if sender is now the initiator and is a warehouse
        // 🚨 NEW: Apply new inventory changes if sender is now the initiator and is a warehouse
// BUT ONLY if roles changed (not for quantity-only updates)
        if (transaction.getSentFirst().equals(senderId) && senderType == PartyType.WAREHOUSE &&
                (senderRoleChanged || receiverRoleChanged || initiatorChanged)) {
            System.out.println("🏭 New sender is warehouse and initiator - deducting inventory for role change");
            for (TransactionItem item : updatedItems) {
                deductFromWarehouseInventory(senderId, item.getItemType(), item.getQuantity());
            }
        }

        return transactionRepository.save(transaction);
    }

    /**
     * 🆕 NEW METHOD: Handles inventory adjustments when transaction roles change
     */
    private void handleTransactionRoleChangeInventoryAdjustments(
            Transaction currentTransaction,
            PartyType newSenderType, UUID newSenderId,
            PartyType newReceiverType, UUID newReceiverId,
            List<TransactionItem> newItems) {

        System.out.println("🔄 Handling inventory adjustments for role change");

        // Step 1: Revert any previous inventory changes made during transaction creation
        if (currentTransaction.getSentFirst().equals(currentTransaction.getSenderId()) &&
                currentTransaction.getSenderType() == PartyType.WAREHOUSE) {

            System.out.println("↩️ Reverting previous warehouse inventory deductions");

            // Add back the original items that were deducted
            for (TransactionItem originalItem : currentTransaction.getItems()) {
                addBackToWarehouseInventory(
                        currentTransaction.getSenderId(),
                        originalItem.getItemType(),
                        originalItem.getQuantity()
                );
                System.out.println("  ↩️ Added back " + originalItem.getQuantity() + " " + originalItem.getItemType().getName());
            }
        }

        // Step 2: If warehouse is becoming receiver (was sender), add items that were received
        if (currentTransaction.getSenderId().equals(newReceiverId) &&
                currentTransaction.getSenderType() == PartyType.WAREHOUSE &&
                newReceiverType == PartyType.WAREHOUSE) {

            System.out.println("🔄 Warehouse changing from sender to receiver - no additional action needed");
            // Items were already added back in Step 1
        }

        // Step 3: If warehouse is becoming sender (was receiver), we need to check if items exist
        if (currentTransaction.getReceiverId().equals(newSenderId) &&
                currentTransaction.getReceiverType() == PartyType.WAREHOUSE &&
                newSenderType == PartyType.WAREHOUSE) {

            System.out.println("🔄 Warehouse changing from receiver to sender");

            // Remove any items that might have been added when this transaction was created as receiver-initiated
            // This is more complex because we need to identify which items came from this specific transaction
            // For now, we'll rely on the validation to ensure the warehouse has enough inventory
            // The actual deduction will happen in the main update method
        }

        System.out.println("✅ Role change inventory adjustments completed");
    }
    /**
     * 🆕 NEW METHOD: Handles inventory adjustments for warehouse senders when quantities change
     */
    private void handleWarehouseSenderInventoryUpdate(Transaction currentTransaction, List<TransactionItem> newItems) {
        System.out.println("📊 Calculating inventory differences for warehouse sender update");

        // Create maps for easy comparison
        Map<UUID, Integer> oldQuantities = currentTransaction.getItems().stream()
                .collect(Collectors.toMap(
                        item -> item.getItemType().getId(),
                        TransactionItem::getQuantity
                ));

        Map<UUID, Integer> newQuantities = newItems.stream()
                .collect(Collectors.toMap(
                        item -> item.getItemType().getId(),
                        TransactionItem::getQuantity
                ));

        // Process each item type in the new transaction
        for (TransactionItem newItem : newItems) {
            UUID itemTypeId = newItem.getItemType().getId();
            int newQuantity = newItem.getQuantity();
            int oldQuantity = oldQuantities.getOrDefault(itemTypeId, 0);

            int difference = newQuantity - oldQuantity;

            System.out.println("🔢 Item: " + newItem.getItemType().getName());
            System.out.println("   Old quantity: " + oldQuantity);
            System.out.println("   New quantity: " + newQuantity);
            System.out.println("   Difference: " + difference);

            if (difference > 0) {
                // New quantity is HIGHER than old quantity - need to deduct MORE
                System.out.println("➖ Need to deduct additional: " + difference);
                deductFromWarehouseInventory(currentTransaction.getSenderId(), newItem.getItemType(), difference);

            } else if (difference < 0) {
                // New quantity is LOWER than old quantity - need to ADD BACK
                int addBackAmount = Math.abs(difference);
                System.out.println("↩️ Need to add back: " + addBackAmount);
                addBackToWarehouseInventory(currentTransaction.getSenderId(), newItem.getItemType(), addBackAmount);
            } else {
                // No change needed
                System.out.println("✅ No change needed - quantities match");
            }
        }

        // Handle removed items (items that were in old transaction but not in new)
        for (TransactionItem oldItem : currentTransaction.getItems()) {
            UUID itemTypeId = oldItem.getItemType().getId();
            if (!newQuantities.containsKey(itemTypeId)) {
                // Item was completely removed, add back the full original quantity
                System.out.println("↩️ Item completely removed, adding back: " + oldItem.getQuantity() + " for " + oldItem.getItemType().getName());
                addBackToWarehouseInventory(currentTransaction.getSenderId(), oldItem.getItemType(), oldItem.getQuantity());
            }
        }

        System.out.println("✅ Warehouse sender inventory update completed");
    }
    // ========================================
    // QUERY METHODS (UNCHANGED)
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
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + transactionId));
    }

    public List<Transaction> getTransactionsForEquipmentByPurpose(UUID equipmentId, TransactionPurpose purpose) {
        return getTransactionsForEquipment(equipmentId).stream()
                .filter(t -> t.getPurpose() == purpose)
                .collect(java.util.stream.Collectors.toList());
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
    // UTILITY METHODS
    // ========================================

    private Transaction buildTransaction(PartyType senderType, UUID senderId, PartyType receiverType,
                                         UUID receiverId, LocalDateTime transactionDate, String username,
                                         int batchNumber, UUID sentFirst, TransactionPurpose purpose) {
        Transaction.TransactionBuilder builder = Transaction.builder()
                .createdAt(LocalDateTime.now())
                .transactionDate(transactionDate)
                .status(TransactionStatus.PENDING)
                .senderType(senderType)
                .senderId(senderId)
                .receiverType(receiverType)
                .receiverId(receiverId)
                .addedBy(username)
                .batchNumber(batchNumber)
                .sentFirst(sentFirst);

        if (purpose != null) {
            builder.purpose(purpose);
        }

        return builder.build();
    }

    private ItemType getItemType(UUID itemTypeId) {
        return itemTypeRepository.findById(itemTypeId)
                .orElseThrow(() -> new IllegalArgumentException("Item type not found: " + itemTypeId));
    }

    private void validateEntityExists(PartyType type, UUID id) {
        switch (type) {
            case WAREHOUSE:
                warehouseRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));
                break;
            case EQUIPMENT:
                equipmentRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));
                break;
            default:
                throw new IllegalArgumentException("Unsupported entity type: " + type);
        }
    }
}