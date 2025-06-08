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
    // CORE TRANSACTION CREATION METHODS - MODIFIED FOR RECEIVER INVENTORY UPDATE
    // ========================================

    private Transaction createTransactionWithPurpose(
            PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> items,
            LocalDateTime transactionDate,
            String username, int batchNumber,
            UUID sentFirst, TransactionPurpose purpose) {

        System.out.println("🚀 Starting createTransaction() with immediate inventory updates");
        System.out.println("Sender Type: " + senderType + ", Sender ID: " + senderId);
        System.out.println("Receiver Type: " + receiverType + ", Receiver ID: " + receiverId);
        System.out.println("SentFirst (Initiator): " + sentFirst);

        validateEntityExists(senderType, senderId);
        validateEntityExists(receiverType, receiverId);

        // 🆕 NEW LOGIC: Handle immediate inventory updates based on who initiated
        if (sentFirst.equals(senderId)) {
            // SENDER INITIATED: "I sent these items"
            System.out.println("📤 SENDER-INITIATED transaction");

            if (senderType == PartyType.WAREHOUSE) {
                // Validate and immediately deduct from sender warehouse
                validateSenderHasAvailableInventory(senderType, senderId, items);
                for (TransactionItem item : items) {
                    deductFromWarehouseInventory(senderId, item.getItemType(), item.getQuantity());
                }
                System.out.println("✅ Immediately deducted warehouse inventory from sender");
            } else {
                // For equipment, just validate (keep original behavior - don't touch equipment logic)
                validateSenderHasAvailableInventory(senderType, senderId, items);
                System.out.println("✅ Validated sender has sufficient inventory (equipment - no changes)");
            }

        } else if (sentFirst.equals(receiverId)) {
            // RECEIVER INITIATED: "I received these items"
            System.out.println("📥 RECEIVER-INITIATED transaction");

            if (receiverType == PartyType.WAREHOUSE) {
                // 🆕 NEW: Immediately add to receiver warehouse inventory
                System.out.println("🏭 Receiver is warehouse - immediately adding inventory");
                for (TransactionItem item : items) {
                    addToWarehouseInventoryOnReceive(receiverId, item);
                }
                System.out.println("✅ Immediately added inventory to receiver warehouse");
            } else {
                // Equipment receiver - don't touch equipment logic
                System.out.println("⚙️ Receiver is equipment - no immediate changes (equipment logic preserved)");
            }


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
        System.out.println("✅ Transaction saved with immediate inventory updates applied");
        return saved;
    }

    /**
     * 🆕 NEW METHOD: Adds inventory to warehouse when receiver initiates transaction
     * This creates a new item entry when a warehouse claims they received items
     */
    private void addToWarehouseInventoryOnReceive(UUID receivingWarehouseId, TransactionItem transactionItem) {
        System.out.println("📦 Adding " + transactionItem.getQuantity() + " units to receiver warehouse on initiation");

        // Fetch the warehouse entity
        Warehouse warehouse = warehouseRepository.findById(receivingWarehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found: " + receivingWarehouseId));

        // Create a new item entry for the received quantity
        Item newItem = new Item();
        newItem.setItemType(transactionItem.getItemType());
        newItem.setQuantity(transactionItem.getQuantity());
        newItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        newItem.setWarehouse(warehouse);
        newItem.setTransactionItem(transactionItem); // Link to TransactionItem for traceability
        newItem.setResolved(false);
        newItem.setCreatedAt(LocalDateTime.now());
        newItem.setCreatedBy("Created by a Transaction");

        itemRepository.save(newItem);

        System.out.println("✅ Created new item entry with quantity: " + transactionItem.getQuantity() +
                " for item type: " + transactionItem.getItemType().getName() +
                " in warehouse: " + warehouse.getName());
    }

    // ========================================
    // TRANSACTION ACCEPTANCE - MODIFIED TO HANDLE IMMEDIATE INVENTORY UPDATES
    // ========================================

    public Transaction acceptTransaction(UUID transactionId, Map<UUID, Integer> receivedQuantities,
                                         Map<UUID, Boolean> itemsNotReceived,
                                         String username, String acceptanceComment) {
        return acceptTransactionWithPurpose(transactionId, receivedQuantities, itemsNotReceived, username, acceptanceComment, null);
    }

    public Transaction acceptEquipmentTransaction(UUID transactionId, Map<UUID, Integer> receivedQuantities,
                                                  Map<UUID, Boolean> itemsNotReceived,
                                                  String username, String acceptanceComment, TransactionPurpose purpose) {
        return acceptTransactionWithPurpose(transactionId, receivedQuantities, itemsNotReceived, username, acceptanceComment, purpose);
    }

    /**
     * 🚨 MODIFIED: Now handles cases where inventory was already updated during transaction creation
     */
    private Transaction acceptTransactionWithPurpose(UUID transactionId, Map<UUID, Integer> receivedQuantities,
                                                     Map<UUID, Boolean> itemsNotReceived,
                                                     String username, String acceptanceComment, TransactionPurpose purpose) {
        System.out.println("🌍 Processing acceptance with consideration for immediate inventory updates");

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

        // Process each item with updated logic for immediate inventory updates
        for (TransactionItem item : transaction.getItems()) {
            Integer receivedQuantity = receivedQuantities.get(item.getId());
            if (receivedQuantity == null) {
                throw new IllegalArgumentException("Received quantity not provided for item: " + item.getId());
            }

            item.setReceivedQuantity(receivedQuantity);

            // Check if item was marked as not received FIRST
            Boolean itemNotReceived = itemsNotReceived != null ? itemsNotReceived.get(item.getId()) : null;
            if (itemNotReceived != null && itemNotReceived.booleanValue()) {
                allItemsMatch = false;
                item.setStatus(TransactionStatus.REJECTED);
                item.setRejectionReason("Item was not sent/received");
                System.out.println("📭 ITEM NOT SENT/RECEIVED: " + item.getItemType().getName());

                // Handle inventory for items not sent/received
                processItemNotSentReceivedWithImmediateUpdates(transaction, item);
                continue;
            }

            // Determine what each party actually claims
            int senderClaimedQuantity;
            int receiverClaimedQuantity;

            if (transaction.getSentFirst().equals(transaction.getSenderId())) {
                // SENDER INITIATED: Sender set original quantity, receiver reports what they got
                senderClaimedQuantity = item.getQuantity();
                receiverClaimedQuantity = receivedQuantity;
                System.out.println(String.format("📤 SENDER-INITIATED: Sender claims %d, Receiver reports %d",
                        senderClaimedQuantity, receiverClaimedQuantity));
            } else {
                // RECEIVER INITIATED: Receiver set original quantity, sender reports what they sent
                receiverClaimedQuantity = item.getQuantity();
                senderClaimedQuantity = receivedQuantity;
                System.out.println(String.format("📥 RECEIVER-INITIATED: Receiver claims %d, Sender reports %d",
                        receiverClaimedQuantity, senderClaimedQuantity));
            }

            // Check if quantities match
            if (senderClaimedQuantity != receiverClaimedQuantity) {
                allItemsMatch = false;
                String reason = String.format("Quantity mismatch between quantity sent and quantity received",
                        senderClaimedQuantity, receiverClaimedQuantity);
                item.setStatus(TransactionStatus.REJECTED);
                item.setRejectionReason(reason);
                System.out.println("⚠️ MISMATCH: " + reason);
            } else {
                item.setStatus(TransactionStatus.ACCEPTED);
                item.setRejectionReason(null);
            }

            // Process real-world inventory changes considering immediate updates
            processInventoryChangesWithImmediateUpdates(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
        }

        // Set overall transaction status
        if (allItemsMatch) {
            transaction.setStatus(TransactionStatus.ACCEPTED);
            transaction.setRejectionReason(null);
            System.out.println("✅ Transaction ACCEPTED");
        } else {
            transaction.setStatus(TransactionStatus.REJECTED);
            transaction.setRejectionReason("Some items had issues - Check individual item statuses");
            System.out.println("❌ Transaction REJECTED - But inventory adjusted as needed");
        }

        return transactionRepository.save(transaction);
    }

    /**
     * 🆕 NEW METHOD: Handles items not sent/received with consideration for immediate updates
     */
    private void processItemNotSentReceivedWithImmediateUpdates(Transaction transaction, TransactionItem item) {
        System.out.println("📭 Processing item that was not sent/received with immediate updates consideration");

        if (transaction.getSentFirst().equals(transaction.getSenderId())) {
            // SENDER-INITIATED: Sender already deducted, need to add back
            if (transaction.getSenderType() == PartyType.WAREHOUSE) {
                System.out.println("↩️ Adding back item to sender warehouse (item was not actually sent)");
                addBackToWarehouseInventory(transaction.getSenderId(), item.getItemType(), item.getQuantity());
            }
        } else if (transaction.getSentFirst().equals(transaction.getReceiverId())) {
            // RECEIVER-INITIATED: Receiver already added, need to remove
            if (transaction.getReceiverType() == PartyType.WAREHOUSE) {
                System.out.println("➖ Removing item from receiver warehouse (item was not actually received)");
                deductFromWarehouseInventory(transaction.getReceiverId(), item.getItemType(), item.getQuantity());
            }
        }
    }

    /**
     * 🚨 MODIFIED: Processes inventory changes considering immediate updates during transaction creation
     */
    private void processInventoryChangesWithImmediateUpdates(Transaction transaction, TransactionItem item,
                                                             int senderClaimedQuantity, int receiverClaimedQuantity) {
        System.out.println("🌍 Processing inventory changes considering immediate updates");

        if (transaction.getSentFirst().equals(transaction.getSenderId())) {
            // SENDER-INITIATED: Sender already deducted during creation
            handleSenderInitiatedInventoryChanges(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
        } else if (transaction.getSentFirst().equals(transaction.getReceiverId())) {
            // RECEIVER-INITIATED: Receiver already added during creation
            handleReceiverInitiatedInventoryChanges(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
        }
    }

    /**
     * 🆕 NEW METHOD: Handles inventory for sender-initiated transactions
     */
    /**
     * 🚨 FIXED METHOD: Handles inventory for sender-initiated transactions
     */
    /**
     * 🚨 FIXED METHOD: Handles inventory for sender-initiated transactions
     */
    private void handleSenderInitiatedInventoryChanges(Transaction transaction, TransactionItem item,
                                                       int senderClaimedQuantity, int receiverClaimedQuantity) {
        System.out.println("📤 Handling sender-initiated inventory changes");

        // Sender already deducted during creation, now handle receiver side
        if (transaction.getReceiverType() == PartyType.WAREHOUSE) {
            // 🚨 FIXED: Add only what RECEIVER claims they got, NOT what sender claims they sent
            System.out.println("🏭 Adding to warehouse what RECEIVER claims they got: " + receiverClaimedQuantity);
            addToWarehouseInventory(transaction, item, receiverClaimedQuantity);
        }
        // Equipment receiver handling unchanged (preserve equipment logic)

        // Handle sender adjustments if quantities don't match what was originally claimed
        if (transaction.getSenderType() == PartyType.WAREHOUSE) {
            int originalQuantity = item.getQuantity();
            int difference = originalQuantity - senderClaimedQuantity;

            if (difference > 0) {
                // Sender originally claimed more than they actually sent, add back difference
                addBackToWarehouseInventory(transaction.getSenderId(), item.getItemType(), difference);
            } else if (difference < 0) {
                // Sender actually sent more than originally claimed, deduct additional
                deductFromWarehouseInventory(transaction.getSenderId(), item.getItemType(), Math.abs(difference));
            }
        }

        // Handle discrepancies - this will create OVERRECEIVED entry for the extra 2
        handleQuantityDiscrepanciesFixed(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
    }
    /**
     * 🆕 NEW METHOD: Handles inventory for receiver-initiated transactions
     */
    private void handleReceiverInitiatedInventoryChanges(Transaction transaction, TransactionItem item,
                                                         int senderClaimedQuantity, int receiverClaimedQuantity) {
        System.out.println("📥 Handling receiver-initiated inventory changes");

        // Receiver already added during creation, now handle sender side
        if (transaction.getSenderType() == PartyType.WAREHOUSE) {
            // 🚨 FIXED: Deduct only what receiver claims they got, NOT what sender claims they sent
            System.out.println("🏭 Deducting from warehouse what RECEIVER claims they got: " + receiverClaimedQuantity);
            deductFromWarehouseInventory(transaction.getSenderId(), item.getItemType(), senderClaimedQuantity);
        }
        // Equipment sender handling unchanged (preserve equipment logic)

        // Handle receiver adjustments if quantities don't match what was originally claimed
        if (transaction.getReceiverType() == PartyType.WAREHOUSE) {
            int originalQuantity = item.getQuantity();
            int difference = originalQuantity - receiverClaimedQuantity;

            if (difference > 0) {
                // Receiver originally claimed more than they actually received, remove difference
                deductFromWarehouseInventory(transaction.getReceiverId(), item.getItemType(), difference);
            } else if (difference < 0) {
                // Receiver actually received more than originally claimed, add additional
                addBackToWarehouseInventory(transaction.getReceiverId(), item.getItemType(), Math.abs(difference));
            }
        }

        // Handle discrepancies - this will create appropriate STOLEN/OVERRECEIVED entries
        handleQuantityDiscrepanciesFixed(transaction, item, senderClaimedQuantity, receiverClaimedQuantity);
    }
    /**
     * 🚨 UNCHANGED: Handles discrepancies with correct STOLEN/OVERRECEIVED logic
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
    // INVENTORY OPERATIONS - PRESERVED AND EXTENDED
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
            stolenItem.setCreatedAt(LocalDateTime.now());

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
            overReceivedItem.setCreatedAt(LocalDateTime.now());

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

        // 🔧 IMPROVED FIFO SORTING: Handle null dates properly and add more debugging
        availableItems.sort((a, b) -> {
            LocalDateTime dateA = a.getCreatedAt();
            LocalDateTime dateB = b.getCreatedAt();

            System.out.println("🔍 Comparing items:");
            System.out.println("  Item A - ID: " + a.getId() + ", Created: " + dateA + ", Qty: " + a.getQuantity());
            System.out.println("  Item B - ID: " + b.getId() + ", Created: " + dateB + ", Qty: " + b.getQuantity());

            // Handle null dates - items with null dates go to the end (treated as newest)
            if (dateA == null && dateB == null) {
                // Both null, fall back to ID comparison for consistency
                int result = a.getId().compareTo(b.getId());
                System.out.println("  Both dates null, comparing by ID: " + result);
                return result;
            }
            if (dateA == null) {
                System.out.println("  A is null, B comes first: 1");
                return 1; // A goes after B (null dates are "newer")
            }
            if (dateB == null) {
                System.out.println("  B is null, A comes first: -1");
                return -1; // B goes after A (null dates are "newer")
            }

            // Both dates exist, compare normally (oldest first)
            int result = dateA.compareTo(dateB);
            System.out.println("  Date comparison result: " + result + " (negative = A is older)");
            return result;
        });

        System.out.println("📋 SORTED ITEMS (FIFO ORDER - oldest first):");
        for (int i = 0; i < availableItems.size(); i++) {
            Item item = availableItems.get(i);
            System.out.println("  " + (i + 1) + ". ID: " + item.getId() +
                    ", Created: " + item.getCreatedAt() +
                    ", Qty: " + item.getQuantity() +
                    ", TransactionItem: " + (item.getTransactionItem() != null ? item.getTransactionItem().getId() : "null"));
        }

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
                System.out.println("  ➖ Using ENTIRE item: " + currentItemQuantity +
                        " (Item ID: " + item.getId() +
                        ", Created: " + item.getCreatedAt() + ")");
            } else {
                // Partially use this item
                item.setQuantity(currentItemQuantity - remainingToDeduct);
                itemRepository.save(item);
                System.out.println("  ➖ PARTIALLY using item: " + remainingToDeduct + " from " + currentItemQuantity +
                        " (Item ID: " + item.getId() +
                        ", Created: " + item.getCreatedAt() +
                        ", Remaining: " + item.getQuantity() + ")");
                remainingToDeduct = 0;
            }
        }

        // Delete items that were completely used
        if (!itemsToDelete.isEmpty()) {
            itemRepository.deleteAll(itemsToDelete);
            System.out.println("  🗑️ Deleted " + itemsToDelete.size() + " fully depleted items");
        }

        System.out.println("✅ Successfully deducted " + quantityToDeduct + " from warehouse inventory using FIFO");
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
        newItem.setCreatedAt(LocalDateTime.now());
        newItem.setCreatedBy("Created by a Transaction");

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
    // UPDATE METHODS - MODIFIED TO HANDLE IMMEDIATE INVENTORY UPDATES
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

        System.out.println("🔄 Updating transaction with foreign key safe handling");

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            throw new IllegalArgumentException("Only pending transactions can be updated");
        }

        validateEntityExists(senderType, senderId);
        validateEntityExists(receiverType, receiverId);

        System.out.println("📊 Safe update - preserving foreign key relationships");

        // Validate new sender has inventory if they are warehouse and initiator
        if (transaction.getSentFirst().equals(senderId) && senderType == PartyType.WAREHOUSE) {
            validateSenderHasAvailableInventory(senderType, senderId, updatedItems);
        }

        // Update transaction details (not items yet)
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

        // 🚨 SAFE ITEM UPDATE: Update existing items instead of clearing
        List<TransactionItem> existingItems = transaction.getItems();

        // If number of items changed, we need special handling
        if (existingItems.size() != updatedItems.size()) {
            System.out.println("⚠️ Number of items changed - this update is not fully supported yet");
            throw new IllegalArgumentException("Cannot change number of items in transaction update - please create a new transaction");
        }

        // Update existing items with new values
        for (int i = 0; i < existingItems.size(); i++) {
            TransactionItem existingItem = existingItems.get(i);
            TransactionItem updatedItem = updatedItems.get(i);

            // Update the existing item's properties
            existingItem.setItemType(updatedItem.getItemType());
            existingItem.setQuantity(updatedItem.getQuantity());
            existingItem.setStatus(TransactionStatus.PENDING);

            System.out.println("✅ Updated item " + i + ": " + updatedItem.getItemType().getName() + " -> " + updatedItem.getQuantity());
            System.out.println("   - Old values: " + existingItem.getItemType().getName() + " = " + existingItem.getQuantity());
            System.out.println("   - New values: " + updatedItem.getItemType().getName() + " = " + updatedItem.getQuantity());
        }

        System.out.println("✅ Transaction update completed successfully");
        return transactionRepository.save(transaction);
    }

    /**
     * 🆕 NEW METHOD: Handles inventory adjustments when only quantities change (no role changes)
     */
    private void handleQuantityOnlyUpdatesWithImmediateInventory(
            Transaction currentTransaction,
            PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId,
            List<TransactionItem> newItems) {

        System.out.println("📊 Handling quantity-only updates with immediate inventory consideration");

        if (currentTransaction.getSentFirst().equals(senderId) && senderType == PartyType.WAREHOUSE) {
            // SENDER-INITIATED warehouse transaction - handle sender inventory adjustments
            handleWarehouseSenderInventoryUpdate(currentTransaction, newItems);

        } else if (currentTransaction.getSentFirst().equals(receiverId) && receiverType == PartyType.WAREHOUSE) {
            // RECEIVER-INITIATED warehouse transaction - handle receiver inventory adjustments
            handleWarehouseReceiverInventoryUpdate(currentTransaction, newItems);
        }
    }

    /**
     * 🆕 NEW METHOD: Handles warehouse receiver inventory updates for quantity changes
     */
    private void handleWarehouseReceiverInventoryUpdate(Transaction currentTransaction, List<TransactionItem> newItems) {
        System.out.println("📊 Calculating receiver inventory differences for warehouse receiver update");

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
                // New quantity is HIGHER than old quantity - need to add MORE to receiver
                System.out.println("➕ Need to add additional to receiver: " + difference);
                Warehouse warehouse = warehouseRepository.findById(currentTransaction.getReceiverId())
                        .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

                Item additionalItem = new Item();
                additionalItem.setItemType(newItem.getItemType());
                additionalItem.setQuantity(difference);
                additionalItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
                additionalItem.setWarehouse(warehouse);
                additionalItem.setResolved(false);
                additionalItem.setCreatedAt(LocalDateTime.now());
                itemRepository.save(additionalItem);

            } else if (difference < 0) {
                // New quantity is LOWER than old quantity - need to REMOVE from receiver
                int removeAmount = Math.abs(difference);
                System.out.println("➖ Need to remove from receiver: " + removeAmount);
                deductFromWarehouseInventory(currentTransaction.getReceiverId(), newItem.getItemType(), removeAmount);
            } else {
                // No change needed
                System.out.println("✅ No change needed - quantities match");
            }
        }

        // Handle removed items (items that were in old transaction but not in new)
        for (TransactionItem oldItem : currentTransaction.getItems()) {
            UUID itemTypeId = oldItem.getItemType().getId();
            if (!newQuantities.containsKey(itemTypeId)) {
                // Item was completely removed, remove the full original quantity from receiver
                System.out.println("➖ Item completely removed, removing from receiver: " + oldItem.getQuantity() + " for " + oldItem.getItemType().getName());
                deductFromWarehouseInventory(currentTransaction.getReceiverId(), oldItem.getItemType(), oldItem.getQuantity());
            }
        }

        System.out.println("✅ Warehouse receiver inventory update completed");
    }

    /**
     * 🆕 NEW METHOD: Handles inventory adjustments when transaction roles change with immediate updates
     */
    private void handleTransactionRoleChangeInventoryAdjustmentsWithImmediateUpdates(
            Transaction currentTransaction,
            PartyType newSenderType, UUID newSenderId,
            PartyType newReceiverType, UUID newReceiverId,
            List<TransactionItem> newItems) {

        System.out.println("🔄 Handling inventory adjustments for role change with immediate updates");

        // Step 1: Revert previous immediate inventory changes
        if (currentTransaction.getSentFirst().equals(currentTransaction.getSenderId()) &&
                currentTransaction.getSenderType() == PartyType.WAREHOUSE) {
            // Sender-initiated warehouse: add back what was deducted
            System.out.println("↩️ Reverting previous sender warehouse inventory deductions");
            for (TransactionItem originalItem : currentTransaction.getItems()) {
                addBackToWarehouseInventory(
                        currentTransaction.getSenderId(),
                        originalItem.getItemType(),
                        originalItem.getQuantity()
                );
            }

        } else if (currentTransaction.getSentFirst().equals(currentTransaction.getReceiverId()) &&
                currentTransaction.getReceiverType() == PartyType.WAREHOUSE) {
            // Receiver-initiated warehouse: remove what was added
            System.out.println("➖ Reverting previous receiver warehouse inventory additions");
            for (TransactionItem originalItem : currentTransaction.getItems()) {
                deductFromWarehouseInventory(
                        currentTransaction.getReceiverId(),
                        originalItem.getItemType(),
                        originalItem.getQuantity()
                );
            }
        }

        // Step 2: Apply new immediate inventory changes based on new roles
        if (newSenderId.equals(currentTransaction.getSentFirst()) && newSenderType == PartyType.WAREHOUSE) {
            // New sender is the initiator and is warehouse - deduct immediately
            System.out.println("🏭 New sender is warehouse and initiator - deducting inventory");
            for (TransactionItem item : newItems) {
                deductFromWarehouseInventory(newSenderId, item.getItemType(), item.getQuantity());
            }

        } else if (newReceiverId.equals(currentTransaction.getSentFirst()) && newReceiverType == PartyType.WAREHOUSE) {
            // New receiver is the initiator and is warehouse - add immediately
            System.out.println("🏭 New receiver is warehouse and initiator - adding inventory");
            Warehouse warehouse = warehouseRepository.findById(newReceiverId)
                    .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

            for (TransactionItem item : newItems) {
                Item newItem = new Item();
                newItem.setItemType(item.getItemType());
                newItem.setQuantity(item.getQuantity());
                newItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
                newItem.setWarehouse(warehouse);
                newItem.setTransactionItem(item);
                newItem.setResolved(false);
                newItem.setCreatedAt(LocalDateTime.now());
                itemRepository.save(newItem);
            }
        }

        System.out.println("✅ Role change inventory adjustments with immediate updates completed");
    }

    /**
     * 🆕 PRESERVED METHOD: Handles inventory adjustments for warehouse senders when quantities change
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