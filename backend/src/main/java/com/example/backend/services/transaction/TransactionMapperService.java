package com.example.backend.services.transaction;

import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.dto.transaction.TransactionItemDTO;
import com.example.backend.models.PartyType;
import com.example.backend.models.equipment.ConsumableResolution;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.ConsumableResolutionRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TransactionMapperService {

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private MerchantRepository merchantRepository;

    @Autowired
    private ConsumableResolutionRepository consumableResolutionRepository;

    /**
     * Converts a Transaction entity to TransactionDTO with enhanced sender and receiver names
     */
    public TransactionDTO toDTO(Transaction transaction) {
        if (transaction == null) {
            return null;
        }

        return TransactionDTO.builder()
                .id(transaction.getId())
                .createdAt(transaction.getCreatedAt())
                .transactionDate(transaction.getTransactionDate())
                .completedAt(transaction.getCompletedAt())
                .status(transaction.getStatus())
                .senderType(transaction.getSenderType())
                .senderId(transaction.getSenderId())
                .senderName(getEntityName(transaction.getSenderType(), transaction.getSenderId()))
                .receiverType(transaction.getReceiverType())
                .receiverId(transaction.getReceiverId())
                .receiverName(getEntityName(transaction.getReceiverType(), transaction.getReceiverId()))
                .rejectionReason(transaction.getRejectionReason())
                .acceptanceComment(transaction.getAcceptanceComment())
                .description(transaction.getDescription())
                .addedBy(transaction.getAddedBy())
                .handledBy(transaction.getHandledBy())
                .approvedBy(transaction.getApprovedBy())
                .batchNumber(transaction.getBatchNumber())
                .sentFirst(transaction.getSentFirst())
                .purpose(transaction.getPurpose())
                .description(transaction.getDescription())
                .items(toItemDTOs(transaction.getItems()))
                .build();
    }

    /**
     * Converts a list of Transaction entities to TransactionDTOs
     */

    public List<TransactionDTO> toDTOs(List<Transaction> transactions) {
        if (transactions == null) {
            return null;
        }
        return transactions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Converts TransactionItem entities to TransactionItemDTOs
     */
    private List<TransactionItemDTO> toItemDTOs(List<TransactionItem> items) {
        if (items == null) {
            return null;
        }
        return items.stream()
                .map(this::toItemDTO)
                .collect(Collectors.toList());
    }

    /**
     * Converts a single TransactionItem entity to TransactionItemDTO
     */
    private TransactionItemDTO toItemDTO(TransactionItem item) {
        if (item == null) {
            return null;
        }

        // Get resolution information for this transaction item
        List<ConsumableResolution> resolutions = consumableResolutionRepository.findByTransactionId(item.getTransaction().getId().toString());
        
        // Find the relevant resolution for this item type (if any)
        ConsumableResolution relevantResolution = null;
        if (resolutions != null && !resolutions.isEmpty() && item.getItemType() != null) {
            relevantResolution = resolutions.stream()
                    .filter(resolution -> resolution.getConsumable() != null && 
                            resolution.getConsumable().getItemType() != null &&
                            resolution.getConsumable().getItemType().getId().equals(item.getItemType().getId()))
                    .findFirst()
                    .orElse(null);
        }

        System.out.println("🔄 [MAPPER] Mapping transaction item: " + item.getId() + " for item type: " + (item.getItemType() != null ? item.getItemType().getName() : "null"));
        System.out.println("📊 [MAPPER] Item resolution data - isResolved: " + item.getIsResolved() + ", resolutionType: " + item.getResolutionType() + ", fullyResolved: " + item.getFullyResolved());
        System.out.println("📊 [MAPPER] Relevant resolution: " + (relevantResolution != null ? relevantResolution.getResolutionType() : "null"));
        
        // Handle null/undefined values properly - database might have NULL values
        Boolean itemIsResolvedBoolean = item.getIsResolved(); // Get Boolean field directly
        Boolean itemIsFullyResolvedBoolean = item.getFullyResolved(); // Get Boolean field directly
        
        boolean finalIsResolved = Boolean.TRUE.equals(itemIsResolvedBoolean) || relevantResolution != null;
        boolean finalFullyResolved = Boolean.TRUE.equals(itemIsFullyResolvedBoolean) || (relevantResolution != null ? relevantResolution.isFullyResolved() : false);
        
        System.out.println("📊 [MAPPER] Raw item values - isResolved: " + itemIsResolvedBoolean + ", fullyResolved: " + itemIsFullyResolvedBoolean + ", final: isResolved=" + finalIsResolved + ", fullyResolved=" + finalFullyResolved);
        
        System.out.println("📊 [MAPPER] Final resolution status - isResolved: " + finalIsResolved + ", fullyResolved: " + finalFullyResolved);
        
        return TransactionItemDTO.builder()
                .id(item.getId())
                .itemTypeId(item.getItemType() != null ? item.getItemType().getId() : null)
                .itemTypeName(item.getItemType() != null ? item.getItemType().getName() : null)
                .itemCategory(item.getItemType() != null && item.getItemType().getItemCategory() != null
                        ? item.getItemType().getItemCategory().getName() : null)
                .itemUnit(item.getItemType() != null ? item.getItemType().getMeasuringUnit() : null)
                .quantity(item.getQuantity())
                .receivedQuantity(item.getReceivedQuantity())
                .equipmentReceivedQuantity(item.getEquipmentReceivedQuantity())
                .status(item.getStatus())
                .rejectionReason(item.getRejectionReason())
                .isResolved(finalIsResolved) // Use item's resolution status first
                .resolutionType(item.getResolutionType() != null ? item.getResolutionType() : (relevantResolution != null ? relevantResolution.getResolutionType() : null))
                .resolutionNotes(item.getResolutionNotes() != null ? item.getResolutionNotes() : (relevantResolution != null ? relevantResolution.getNotes() : null))
                .resolvedBy(item.getResolvedBy() != null ? item.getResolvedBy() : (relevantResolution != null ? relevantResolution.getResolvedBy() : null))
                .correctedQuantity(item.getCorrectedQuantity() != null ? item.getCorrectedQuantity() : (relevantResolution != null ? relevantResolution.getCorrectedQuantity() : null))
                .fullyResolved(finalFullyResolved)
                .build();
    }

    /**
     * Gets the entity name based on type and ID
     * Enhanced to support all party types: WAREHOUSE, EQUIPMENT, MERCHANT, PROCUREMENT
     */
    private String getEntityName(PartyType type, UUID entityId) {
        if (type == null || entityId == null) {
            return "Unknown";
        }

        try {
            switch (type) {
                case WAREHOUSE:
                    return warehouseRepository.findById(entityId)
                            .map(Warehouse::getName)
                            .orElse("Unknown Warehouse");
                case EQUIPMENT:
                    return equipmentRepository.findById(entityId)
                            .map(Equipment::getName)
                            .orElse("Unknown Equipment");
                case MERCHANT:
                    return merchantRepository.findById(entityId)
                            .map(Merchant::getName)
                            .orElse("Unknown Merchant");
                case PROCUREMENT:
                    // For procurement, we might want to return a generic name or handle differently
                    return "Procurement Team";
                default:
                    return "Unknown Entity";
            }
        } catch (Exception e) {
            // Log the error but don't fail the transaction mapping
            System.err.println("Error resolving entity name for type " + type + " and ID " + entityId + ": " + e.getMessage());
            return "Unknown " + type.toString().toLowerCase();
        }
    }
}