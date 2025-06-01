package com.example.backend.services.transaction;

import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.dto.transaction.TransactionItemDTO;
import com.example.backend.models.PartyType;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.EquipmentRepository;
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
                .addedBy(transaction.getAddedBy())
                .approvedBy(transaction.getApprovedBy())
                .batchNumber(transaction.getBatchNumber())
                .sentFirst(transaction.getSentFirst())
                .purpose(transaction.getPurpose())
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

        return TransactionItemDTO.builder()
                .id(item.getId())
                .itemTypeId(item.getItemType() != null ? item.getItemType().getId() : null)
                .itemTypeName(item.getItemType() != null ? item.getItemType().getName() : null)
                .itemCategory(item.getItemType() != null && item.getItemType().getItemCategory() != null 
                        ? item.getItemType().getItemCategory().getName() : null)
                .quantity(item.getQuantity())
                .receivedQuantity(item.getReceivedQuantity())
                .status(item.getStatus())
                .build();
    }

    /**
     * Gets the entity name based on type and ID
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
                default:
                    return "Unknown Entity";
            }
        } catch (Exception e) {
            return "Unknown";
        }
    }
} 