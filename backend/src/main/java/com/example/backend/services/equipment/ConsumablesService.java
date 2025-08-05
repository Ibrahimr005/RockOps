package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.ConsumableResolutionDTO;
import com.example.backend.dto.equipment.ConsumableHistoryDTO;
import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.ConsumableResolution;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.ResolutionType;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.ConsumableResolutionRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.transaction.TransactionMapperService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ConsumablesService {


    @Autowired
    private ConsumableRepository consumableRepository;

    @Autowired
    private ConsumableResolutionRepository consumableResolutionRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TransactionMapperService transactionMapperService;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Transactional
    public void createConsumableTransaction(Equipment equipment, Warehouse warehouse, Integer quantity, LocalDateTime timestamp) {

    }


    // You can implement other methods as needed, such as for viewing pending transactions, etc.
    public List<Consumable> getConsumablesByEquipmentId(UUID equipmentId) {
        return consumableRepository.findByEquipmentId(equipmentId);
    }

    // Add to ConsumablesService.java
    /**
     * Get regular consumables (not STOLEN or OVERRECEIVED)
     */
    public List<Consumable> getRegularConsumables(UUID equipmentId) {
        // Get all consumables for this equipment that are NOT marked as STOLEN or OVERRECEIVED
        return consumableRepository.findByEquipmentId(equipmentId).stream()
                .filter(c -> c.getStatus() != ItemStatus.MISSING && c.getStatus() != ItemStatus.OVERRECEIVED)
                .collect(Collectors.toList());
    }

    public List<Consumable> getConsumablesByEquipmentIdAndStatus(UUID equipmentId, ItemStatus itemStatus) {
        return consumableRepository.findByEquipmentIdAndStatus(equipmentId, itemStatus);
    }

    /**
     * Get consumable history for a specific consumable
     * 
     * This endpoint returns the transaction-based history of how a given consumable 
     * came to exist in inventory. It uses the new transactions relationship to get
     * all transactions that contributed to this consumable.
     * 
     * Logic:
     * 1. Get the consumable with its associated transactions
     * 2. For each transaction, find the relevant transaction item for this consumable's item type
     * 3. Return transactions with equipment's claimed received quantity and status
     * 4. Order transactions by creation date (most recent first)
     * 
     * Endpoint: GET /api/v1/equipment/consumables/{consumableId}/history
     */
    @Transactional
    public List<TransactionDTO> getConsumableHistory(UUID consumableId) {
        // First verify the consumable exists and get it with transactions
        Consumable consumable = consumableRepository.findById(consumableId)
                .orElseThrow(() -> new IllegalArgumentException("Consumable not found"));
        
        // Force load the transactions within the transaction context
        // This ensures lazy loading works properly
        List<Transaction> transactions = consumable.getTransactions();
        if (transactions == null || transactions.isEmpty()) {
            System.out.println("⚠️ No transactions found in new relationship, falling back to legacy method");
            List<Transaction> legacyTransactions = consumableRepository.findTransactionHistoryForConsumable(consumableId);
            return transactionMapperService.toDTOs(legacyTransactions);
        }
        
        // Sort transactions by creation date (most recent first)
        transactions.sort((t1, t2) -> {
            if (t1.getCreatedAt() == null && t2.getCreatedAt() == null) return 0;
            if (t1.getCreatedAt() == null) return 1;
            if (t2.getCreatedAt() == null) return -1;
            return t2.getCreatedAt().compareTo(t1.getCreatedAt());
        });
        
        // Convert to DTOs which includes proper sender/receiver names
        // The DTOs also include transaction items with quantities showing how much each transaction contributed
        return transactionMapperService.toDTOs(transactions);
    }

    /**
     * Get consumable history with resolution information
     * This method returns both transaction history and resolution history for a consumable
     */
    @Transactional
    public ConsumableHistoryDTO getConsumableHistoryWithResolutions(UUID consumableId) {
        // Get transaction history
        List<TransactionDTO> transactions = getConsumableHistory(consumableId);
        
        // Get resolution history
        List<ConsumableResolution> resolutions = getConsumableResolutionHistory(consumableId);
        
        return new ConsumableHistoryDTO(transactions, resolutions);
    }

    /**
     * Resolve a consumable discrepancy (similar to ItemService.resolveDiscrepancy)
     */
    @Transactional
    public ConsumableResolution resolveDiscrepancy(ConsumableResolutionDTO request) {
        // Find the consumable
        Consumable consumable = consumableRepository.findById(request.getConsumableId())
                .orElseThrow(() -> new IllegalArgumentException("Consumable not found"));

        // Validate that the consumable actually has a discrepancy status
        if (consumable.getStatus() != ItemStatus.MISSING &&
                consumable.getStatus() != ItemStatus.OVERRECEIVED) {
            throw new IllegalArgumentException("Consumable does not have a discrepancy status");
        }

        // Store original values for audit
        ItemStatus originalStatus = consumable.getStatus();
        int originalQuantity = consumable.getQuantity();

        // Process the resolution based on type
        switch (request.getResolutionType()) {
            case ACKNOWLEDGE_LOSS:
            case REPORT_THEFT:
                // Just mark as resolved, keep the MISSING status for history
                consumable.setResolved(true);
                System.out.println("✅ Consumable marked as resolved - " + request.getResolutionType());
                break;

            case ACCEPT_SURPLUS:
                // Just mark as resolved - overreceived entries are logical, not actual inventory
                consumable.setResolved(true);
                System.out.println("✅ Surplus accepted and marked as resolved");
                break;

            case COUNTING_ERROR:
                // Handle counting error with quantity re-validation
                handleCountingErrorResolution(consumable, request);
                break;

            case FOUND_ITEMS:
                // Convert to regular inventory for missing items
                handleConsumableToRegularInventory(consumable);
                consumable.setResolved(true);
                System.out.println("✅ Found items added to inventory");
                break;

            case RETURN_TO_SENDER:
                // Mark for return
                consumable.setStatus(ItemStatus.PENDING);
                consumable.setResolved(true);
                System.out.println("✅ Consumable marked for return to sender");
                break;

            default:
                throw new IllegalArgumentException("Unsupported resolution type: " + request.getResolutionType());
        }

        // Save the updated consumable
        consumableRepository.save(consumable);

        // 🆕 Update related transaction items to reflect resolution
        updateTransactionItemsForResolution(consumable, request);

        // Create resolution record
        ConsumableResolution consumableResolution = ConsumableResolution.builder()
                .consumable(consumable)
                .resolutionType(request.getResolutionType())
                .notes(request.getNotes())
                .resolvedBy(request.getResolvedBy())
                .transactionId(request.getTransactionId())
                .originalStatus(originalStatus)
                .originalQuantity(originalQuantity)
                .correctedQuantity(request.getCorrectedQuantity())
                .resolvedAt(LocalDateTime.now())
                .fullyResolved(consumable.isResolved()) // Set based on whether consumable was actually resolved
                .build();

        return consumableResolutionRepository.save(consumableResolution);
    }

    // Helper method to handle counting error resolution with quantity validation
    private void handleCountingErrorResolution(Consumable overreceivedConsumable, ConsumableResolutionDTO request) {
        if (request.getCorrectedQuantity() == null) {
            throw new IllegalArgumentException("Corrected quantity is required for counting error resolution");
        }

        // Get the original transaction to find the expected quantity
        Transaction originalTransaction = overreceivedConsumable.getTransaction();
        if (originalTransaction == null) {
            throw new IllegalArgumentException("Cannot resolve counting error: original transaction not found");
        }

        // Find the transaction item for this consumable type
        int originalClaimedQuantity = 0;
        for (var item : originalTransaction.getItems()) {
            if (item.getItemType().getId().equals(overreceivedConsumable.getItemType().getId())) {
                originalClaimedQuantity = item.getQuantity();
                break;
            }
        }

        if (originalClaimedQuantity == 0) {
            throw new IllegalArgumentException("Cannot resolve counting error: original claimed quantity not found in transaction");
        }

        int correctedQuantity = request.getCorrectedQuantity();
        int currentOverreceivedQuantity = overreceivedConsumable.getQuantity();
        
        System.out.println(String.format("🔄 Counting error resolution: OriginalClaimed=%d, Corrected=%d, CurrentOverreceived=%d", 
                originalClaimedQuantity, correctedQuantity, currentOverreceivedQuantity));

        // Find the regular inventory entry that was created from the original transaction
        Consumable regularInventoryConsumable = consumableRepository.findByEquipmentIdAndItemTypeIdAndStatus(
            overreceivedConsumable.getEquipment().getId(),
            overreceivedConsumable.getItemType().getId(),
            ItemStatus.IN_WAREHOUSE
        );

        if (regularInventoryConsumable == null) {
            throw new IllegalArgumentException("Cannot find regular inventory entry to correct");
        }

        // Calculate the adjustment needed to the regular inventory
        int currentRegularQuantity = regularInventoryConsumable.getQuantity();
        int adjustmentNeeded = originalClaimedQuantity - correctedQuantity; // How much to subtract

        System.out.println(String.format("📊 Inventory adjustment: CurrentRegular=%d, AdjustmentNeeded=-%d", 
                currentRegularQuantity, adjustmentNeeded));

        if (correctedQuantity == originalClaimedQuantity) {
            // Perfect match - the original claim was correct, just resolve the overreceived entry
            overreceivedConsumable.setResolved(true);
            System.out.println("✅ Counting error resolved: corrected quantity matches original claim");
            
        } else if (correctedQuantity < originalClaimedQuantity) {
            // Equipment received less than they claimed
            // Subtract the difference from regular inventory
            int newRegularQuantity = currentRegularQuantity - adjustmentNeeded;
            
            if (newRegularQuantity < 0) {
                throw new IllegalArgumentException("Cannot reduce inventory below zero. Current: " + currentRegularQuantity + ", Adjustment: " + adjustmentNeeded);
            }
            
            regularInventoryConsumable.setQuantity(newRegularQuantity);
            consumableRepository.save(regularInventoryConsumable);
            
            // Original overreceived entry is resolved since we've corrected the inventory
            overreceivedConsumable.setResolved(true);
            System.out.println(String.format("✅ Reduced regular inventory by %d (from %d to %d), resolved overreceived entry", 
                    adjustmentNeeded, currentRegularQuantity, newRegularQuantity));
            
        } else {
            // Equipment received more than they originally claimed (correctedQuantity > originalClaimedQuantity)
            // This means there's still an overreceived amount, but different from before
            int newOverreceivedQuantity = correctedQuantity - originalClaimedQuantity;
            overreceivedConsumable.setQuantity(newOverreceivedQuantity);
            // Keep as unresolved since there's still an overreceived issue
            overreceivedConsumable.setResolved(false);
            System.out.println(String.format("📈 Updated overreceived quantity to %d (still unresolved)", newOverreceivedQuantity));
        }

        // If the overreceived entry is resolved, update the transaction status to COMPLETED
        if (overreceivedConsumable.isResolved()) {
            // Check if all discrepancies for this transaction are resolved
            List<Consumable> transactionDiscrepancies = consumableRepository.findByTransactionAndStatusIn(
                originalTransaction, List.of(ItemStatus.MISSING, ItemStatus.OVERRECEIVED)
            ).stream().filter(c -> !c.isResolved()).collect(Collectors.toList());
            
            if (transactionDiscrepancies.isEmpty()) {
                // All discrepancies resolved, mark transaction as completed
                originalTransaction.setStatus(TransactionStatus.ACCEPTED);
                transactionRepository.save(originalTransaction);
                System.out.println("✅ Transaction marked as COMPLETED - all discrepancies resolved");
            }
        }
    }

    // Helper method to handle converting consumables to regular inventory
    private void handleConsumableToRegularInventory(Consumable discrepancyConsumable) {
        // Look for existing regular inventory consumable
        Consumable existingConsumable = consumableRepository.findByEquipmentIdAndItemTypeIdAndStatus(
                discrepancyConsumable.getEquipment().getId(),
                discrepancyConsumable.getItemType().getId(),
                ItemStatus.IN_WAREHOUSE
        );



        if (existingConsumable != null) {
            // Merge with existing consumable
            existingConsumable.setQuantity(existingConsumable.getQuantity() + discrepancyConsumable.getQuantity());
            consumableRepository.save(existingConsumable);
            System.out.println("✅ Merged " + discrepancyConsumable.getQuantity() + " consumables into existing inventory");
        } else {
            // Just convert the status
            discrepancyConsumable.setStatus(ItemStatus.IN_WAREHOUSE);
            System.out.println("✅ Converted discrepancy consumable to regular inventory");
        }
    }

    /**
     * Update related transaction items to reflect resolution status
     * This ensures that the history modal shows correct resolution information
     */
    private void updateTransactionItemsForResolution(Consumable consumable, ConsumableResolutionDTO request) {
        System.out.println("🔄 [RESOLUTION-UPDATE] Starting transaction item updates for consumable: " + consumable.getId());
        System.out.println("🔄 [RESOLUTION-UPDATE] Consumable status: " + consumable.getStatus() + ", isResolved: " + consumable.isResolved());
        System.out.println("🔄 [RESOLUTION-UPDATE] Resolution type: " + request.getResolutionType());
        
        // 🔧 ENHANCED APPROACH: Find transactions by querying the database directly
        // The consumable.getTransactions() might not be populated correctly due to lazy loading
        System.out.println("🔄 [RESOLUTION-UPDATE] Searching for transactions that contain this consumable's item type...");
        
        // Find transactions that have items matching this consumable's item type and are related to the same equipment
        List<Transaction> relatedTransactions = transactionRepository.findByReceiverIdAndReceiverType(
            consumable.getEquipment().getId(), 
            PartyType.EQUIPMENT
        );
        
        System.out.println("🔄 [RESOLUTION-UPDATE] Found " + relatedTransactions.size() + " transactions for this equipment");
        System.out.println("🔄 [RESOLUTION-UPDATE] Looking for item type: " + consumable.getItemType().getName() + " (ID: " + consumable.getItemType().getId() + ")");
        System.out.println("🔄 [RESOLUTION-UPDATE] Equipment ID: " + consumable.getEquipment().getId());
        
        boolean updatedAnyItems = false;
        
        for (Transaction transaction : relatedTransactions) {
            System.out.println("🔄 [RESOLUTION-UPDATE] Processing transaction: " + transaction.getId() + " (batch: " + transaction.getBatchNumber() + ")");
            
            boolean foundMatchingItem = false;
            // Find the transaction item that matches this consumable's item type
            for (TransactionItem item : transaction.getItems()) {
                System.out.println("🔄 [RESOLUTION-UPDATE] Checking transaction item: " + item.getId() + " for item type: " + item.getItemType().getName() + " (status: " + item.getStatus() + ")");
                
                if (item.getItemType().getId().equals(consumable.getItemType().getId()) && 
                    (item.getStatus() == TransactionStatus.REJECTED || item.getStatus() == TransactionStatus.PARTIALLY_ACCEPTED || item.getStatus() == TransactionStatus.ACCEPTED)) {
                    foundMatchingItem = true;
                    updatedAnyItems = true;
                    System.out.println("✅ [RESOLUTION-UPDATE] Found matching transaction item! Updating...");
                    System.out.println("📊 [RESOLUTION-UPDATE] Before update - item status: " + item.getStatus() + ", isResolved: " + item.getIsResolved() + ", resolutionType: " + item.getResolutionType());
                    
                    // Update resolution fields in the transaction item
                    item.setIsResolved(consumable.isResolved());
                    item.setResolutionType(request.getResolutionType());
                    item.setResolutionNotes(request.getNotes());
                    item.setResolvedBy(request.getResolvedBy());
                    item.setFullyResolved(consumable.isResolved());
                    
                    // For counting error resolutions, update the corrected quantity
                    if (request.getResolutionType() == ResolutionType.COUNTING_ERROR && request.getCorrectedQuantity() != null) {
                        item.setCorrectedQuantity(request.getCorrectedQuantity());
                        System.out.println("📊 [RESOLUTION-UPDATE] Set corrected quantity: " + request.getCorrectedQuantity());
                    }
                    
                    System.out.println("📊 [RESOLUTION-UPDATE] After update - item status: " + item.getStatus() + ", isResolved: " + item.getIsResolved() + ", resolutionType: " + item.getResolutionType());
                    System.out.println("📊 [RESOLUTION-UPDATE] Resolution type set to: " + item.getResolutionType());
                    System.out.println("✅ [RESOLUTION-UPDATE] Updated transaction item " + item.getId() + " with resolution info");
                    
                    // Don't break - there might be multiple items of the same type in different transactions
                }
            }
            
            if (foundMatchingItem) {
                // Save the updated transaction
                transactionRepository.save(transaction);
                System.out.println("💾 [RESOLUTION-UPDATE] Saved transaction: " + transaction.getId());
            }
        }
        
        if (!updatedAnyItems) {
            System.out.println("⚠️ [RESOLUTION-UPDATE] No matching transaction items found for item type: " + consumable.getItemType().getName());
            System.out.println("⚠️ [RESOLUTION-UPDATE] Equipment ID: " + consumable.getEquipment().getId());
        }
        
        System.out.println("✅ [RESOLUTION-UPDATE] Completed updating transaction items for resolution");
        
        // 🆕 CRITICAL: Also update any existing resolved consumables that might have missed updates
        updateExistingResolvedTransactionItems(consumable);
        
        // 🆕 NEW: Force refresh the transaction items to ensure they're properly saved
        System.out.println("🔄 [RESOLUTION-UPDATE] Forcing transaction refresh...");
        for (Transaction transaction : relatedTransactions) {
            transactionRepository.flush();

        }
    }
    
    /**
     * Update transaction items for consumables that were resolved before this fix was implemented
     * This ensures historical data is consistent
     */
    private void updateExistingResolvedTransactionItems(Consumable consumable) {
        System.out.println("🔄 [BACKFILL-UPDATE] Checking for other resolved consumables of same item type...");
        
        // Find all resolved consumables of the same item type on the same equipment
        List<Consumable> resolvedConsumables = consumableRepository.findByEquipmentIdAndResolvedTrue(consumable.getEquipment().getId());
        
        for (Consumable resolvedConsumable : resolvedConsumables) {
            if (resolvedConsumable.getItemType().getId().equals(consumable.getItemType().getId())) {
                System.out.println("🔄 [BACKFILL-UPDATE] Found resolved consumable: " + resolvedConsumable.getId() + ", checking transaction items...");
                
                // Get the resolution for this consumable
                List<ConsumableResolution> resolutions = getConsumableResolutionHistory(resolvedConsumable.getId());
                if (!resolutions.isEmpty()) {
                    ConsumableResolution resolution = resolutions.get(0); // Get the most recent resolution
                    
                    // Find related transactions and update them if they don't have resolution data
                    List<Transaction> relatedTransactions = transactionRepository.findByReceiverIdAndReceiverType(
                        resolvedConsumable.getEquipment().getId(), 
                        PartyType.EQUIPMENT
                    );
                    
                    for (Transaction transaction : relatedTransactions) {
                        for (TransactionItem item : transaction.getItems()) {
                            if (item.getItemType().getId().equals(resolvedConsumable.getItemType().getId()) && 
                                (item.getStatus() == TransactionStatus.REJECTED || item.getStatus() == TransactionStatus.PARTIALLY_ACCEPTED) &&
                                !Boolean.TRUE.equals(item.getIsResolved())) { // Only update items that don't have resolution data yet
                                
                                System.out.println("🔄 [BACKFILL-UPDATE] Updating transaction item " + item.getId() + " with historical resolution data");
                                
                                item.setIsResolved(resolvedConsumable.isResolved());
                                item.setResolutionType(resolution.getResolutionType());
                                item.setResolutionNotes(resolution.getNotes());
                                item.setResolvedBy(resolution.getResolvedBy());
                                item.setFullyResolved(resolvedConsumable.isResolved());
                                
                                if (resolution.getCorrectedQuantity() != null) {
                                    item.setCorrectedQuantity(resolution.getCorrectedQuantity());
                                }
                                
                                transactionRepository.save(transaction);
                                System.out.println("✅ [BACKFILL-UPDATE] Updated transaction item with historical resolution data");
                            }
                        }
                    }
                }
            }
        }
        
        System.out.println("✅ [BACKFILL-UPDATE] Completed backfill update for existing resolved items");
    }

    // Method to get ACTIVE (unresolved) consumables with discrepancies
    public List<Consumable> getDiscrepancyConsumables(UUID equipmentId) {
        return consumableRepository.findByEquipmentIdAndStatusInAndResolvedFalse(
                equipmentId,
                List.of(ItemStatus.MISSING, ItemStatus.OVERRECEIVED)
        );
    }

    // Method to get resolved consumables for history tab
    public List<Consumable> getResolvedConsumables(UUID equipmentId) {
        return consumableRepository.findByEquipmentIdAndResolvedTrue(equipmentId);
    }
    
    /**
     * EMERGENCY METHOD: Manually trigger backfill for all resolved consumables
     * Call this method once to fix all historical data
     */
    @Transactional
    public void manualBackfillAllResolvedTransactionItems() {
        System.out.println("🚨 [MANUAL-BACKFILL] Starting manual backfill for ALL resolved consumables...");
        
        // Update NULL values in database first
        System.out.println("🔧 [MANUAL-BACKFILL] Setting default values for NULL resolution fields...");
        
        // This will be done via raw query to set defaults for existing records
        // For now, let's find all resolved consumables and update their transaction items
        
        List<Consumable> allResolvedConsumables = consumableRepository.findByResolvedTrue();
        System.out.println("🔧 [MANUAL-BACKFILL] Found " + allResolvedConsumables.size() + " resolved consumables");
        
        int updatedItems = 0;
        
        for (Consumable resolvedConsumable : allResolvedConsumables) {
            System.out.println("🔧 [MANUAL-BACKFILL] Processing resolved consumable: " + resolvedConsumable.getId() + " (" + resolvedConsumable.getItemType().getName() + ")");
            
            // Get the resolution for this consumable
            List<ConsumableResolution> resolutions = getConsumableResolutionHistory(resolvedConsumable.getId());
            if (!resolutions.isEmpty()) {
                ConsumableResolution resolution = resolutions.get(0);
                
                // Find related transactions
                List<Transaction> relatedTransactions = transactionRepository.findByReceiverIdAndReceiverType(
                    resolvedConsumable.getEquipment().getId(), 
                    PartyType.EQUIPMENT
                );
                
                for (Transaction transaction : relatedTransactions) {
                    for (TransactionItem item : transaction.getItems()) {
                        if (item.getItemType().getId().equals(resolvedConsumable.getItemType().getId()) && 
                            (item.getStatus() == TransactionStatus.REJECTED || item.getStatus() == TransactionStatus.PARTIALLY_ACCEPTED)) {
                            
                            System.out.println("🔧 [MANUAL-BACKFILL] Updating transaction item " + item.getId() + " - Before: isResolved=" + item.getIsResolved());
                            
                            item.setIsResolved(true); // Force set to true
                            item.setResolutionType(resolution.getResolutionType());
                            item.setResolutionNotes(resolution.getNotes());
                            item.setResolvedBy(resolution.getResolvedBy());
                            item.setFullyResolved(true); // Force set to true
                            
                            if (resolution.getCorrectedQuantity() != null) {
                                item.setCorrectedQuantity(resolution.getCorrectedQuantity());
                            }
                            
                            transactionRepository.save(transaction);
                            updatedItems++;
                            System.out.println("✅ [MANUAL-BACKFILL] Updated transaction item " + item.getId() + " - After: isResolved=" + item.getIsResolved());
                        }
                    }
                }
            }
        }
        
        System.out.println("✅ [MANUAL-BACKFILL] Completed manual backfill. Updated " + updatedItems + " transaction items.");
    }

    // Get resolution history for a specific consumable
    public List<ConsumableResolution> getConsumableResolutionHistory(UUID consumableId) {
        return consumableResolutionRepository.findByConsumableId(consumableId);
    }

    // Get all resolution history for an equipment
    public List<ConsumableResolution> getEquipmentResolutionHistory(UUID equipmentId) {
        return consumableResolutionRepository.findByConsumableEquipmentIdOrderByResolvedAtDesc(equipmentId);
    }

    /**
     * Add a transaction to a consumable's transaction list
     * This method is called when a new transaction contributes to an existing consumable
     * 
     * @param consumableId The ID of the consumable
     * @param transactionId The ID of the transaction to add
     */
    @Transactional
    public void addTransactionToConsumable(UUID consumableId, UUID transactionId) {
        Consumable consumable = consumableRepository.findById(consumableId)
                .orElseThrow(() -> new IllegalArgumentException("Consumable not found"));
        
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
        
        // Add transaction to consumable's transaction list
        if (consumable.getTransactions() == null) {
            consumable.setTransactions(new ArrayList<>());
        }
        
        if (!consumable.getTransactions().contains(transaction)) {
            consumable.getTransactions().add(transaction);
            consumableRepository.save(consumable);
            System.out.println("✅ Added transaction " + transactionId + " to consumable " + consumableId);
        } else {
            System.out.println("⚠️ Transaction " + transactionId + " already exists in consumable " + consumableId);
        }
    }

    /**
     * Find or create a consumable for a specific equipment and item type
     * This method ensures we have a single consumable entry per equipment-itemType combination
     * 
     * @param equipmentId The equipment ID
     * @param itemTypeId The item type ID
     * @return The existing or newly created consumable
     */
    @Transactional
    public Consumable findOrCreateConsumable(UUID equipmentId, UUID itemTypeId) {
        Consumable existingConsumable = consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemTypeId);
        
        if (existingConsumable != null) {
            return existingConsumable;
        }
        
        // Create new consumable if it doesn't exist
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));
        
        ItemType itemType = itemTypeRepository.findById(itemTypeId)
                .orElseThrow(() -> new IllegalArgumentException("Item type not found"));
        
        Consumable newConsumable = new Consumable();
        newConsumable.setEquipment(equipment);
        newConsumable.setItemType(itemType);
        newConsumable.setQuantity(0); // Will be updated when transactions are added
        newConsumable.setStatus(ItemStatus.IN_WAREHOUSE);
        newConsumable.setResolved(false);
        newConsumable.setTransactions(new ArrayList<>());
        
        return consumableRepository.save(newConsumable);
    }

    /**
     * Update consumable quantity and add transaction to history
     * This method is called when a transaction affects an existing consumable
     * 
     * @param equipmentId The equipment ID
     * @param itemTypeId The item type ID
     * @param quantityChange The quantity to add/subtract
     * @param transaction The transaction that caused this change
     * @param status The new status for the consumable
     */
    @Transactional
    public void updateConsumableWithTransaction(UUID equipmentId, UUID itemTypeId, int quantityChange, Transaction transaction, ItemStatus status) {
        Consumable consumable = consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemTypeId);
        
        if (consumable == null) {
            // Create new consumable if it doesn't exist
            Equipment equipment = equipmentRepository.findById(equipmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));
            
            ItemType itemType = itemTypeRepository.findById(itemTypeId)
                    .orElseThrow(() -> new IllegalArgumentException("Item type not found"));
            
            consumable = new Consumable();
            consumable.setEquipment(equipment);
            consumable.setItemType(itemType);
            consumable.setQuantity(quantityChange);
            consumable.setStatus(status);
            consumable.setResolved(false);
            consumable.setTransactions(new ArrayList<>());
        } else {
            // Update existing consumable
            consumable.setQuantity(consumable.getQuantity() + quantityChange);
            consumable.setStatus(status);
        }
        
        // Add transaction to the list if not already present
        if (consumable.getTransactions() == null) {
            consumable.setTransactions(new ArrayList<>());
        }
        
        if (!consumable.getTransactions().contains(transaction)) {
            consumable.getTransactions().add(transaction);
        }
        
        consumableRepository.save(consumable);
        System.out.println("✅ Updated consumable: " + quantityChange + " " + consumable.getItemType().getName() + 
                          " (New total: " + consumable.getQuantity() + ") - Added transaction to history");
    }
}

