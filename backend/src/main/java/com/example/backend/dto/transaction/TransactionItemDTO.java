package com.example.backend.dto.transaction;

import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ResolutionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionItemDTO {
    private UUID id;
    private UUID itemTypeId;
    private String itemTypeName;
    private String itemCategory;
    private String itemUnit;
    private Integer quantity; // Warehouse claimed sent quantity
    private Integer receivedQuantity; // Warehouse validation quantity (used in warehouse-to-warehouse)
    private Integer equipmentReceivedQuantity; // Equipment claimed received quantity (used when equipment is receiver)
    private TransactionStatus status;
    private String rejectionReason;
    
    // Resolution information
    private boolean isResolved;
    private ResolutionType resolutionType;
    private String resolutionNotes;
    private String resolvedBy;
    private Integer correctedQuantity; // For counting error resolutions
    private boolean fullyResolved;
} 