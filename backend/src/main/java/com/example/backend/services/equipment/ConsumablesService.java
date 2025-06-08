package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.ConsumableResolutionDTO;
import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.ConsumableResolution;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.ConsumableResolutionRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.services.transaction.TransactionMapperService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
     * This rebuilds the history based on actual transaction relationships, not the unreliable transaction field.
     * 
     * Returns TransactionDTOs with proper sender/receiver names and includes the specific quantity
     * each transaction contributed for this item type.
     * 
     * Logic:
     * 1. Get the equipment field from the consumable - this tells us where this consumable currently is
     * 2. Find all transactions where this equipment was a receiver
     * 3. Check if transaction has purpose "CONSUMABLE" and equipment is receiver
     * 4. Check if any transaction item matches the consumable's item type
     * 5. Convert to DTOs with proper names and return ordered by most recent first
     */
    public List<TransactionDTO> getConsumableHistory(UUID consumableId) {
        // First verify the consumable exists
        Consumable consumable = consumableRepository.findById(consumableId)
                .orElseThrow(() -> new IllegalArgumentException("Consumable not found"));
        
        // Get transactions that contributed to this consumable being in inventory
        List<Transaction> transactions = consumableRepository.findTransactionHistoryForConsumable(consumableId);
        
        // Convert to DTOs which includes proper sender/receiver names
        // The DTOs also include transaction items with quantities showing how much each transaction contributed
        return transactionMapperService.toDTOs(transactions);
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

    // Get resolution history for a specific consumable
    public List<ConsumableResolution> getConsumableResolutionHistory(UUID consumableId) {
        return consumableResolutionRepository.findByConsumableId(consumableId);
    }

    // Get all resolution history for an equipment
    public List<ConsumableResolution> getEquipmentResolutionHistory(UUID equipmentId) {
        return consumableResolutionRepository.findByConsumableEquipmentIdOrderByResolvedAtDesc(equipmentId);
    }
}

