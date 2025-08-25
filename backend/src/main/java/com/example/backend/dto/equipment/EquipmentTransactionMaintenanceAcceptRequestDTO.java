package com.example.backend.dto.equipment;

import com.example.backend.models.transaction.TransactionPurpose;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentTransactionMaintenanceAcceptRequestDTO {
    private Map<UUID, Integer> receivedQuantities;
    private Map<UUID, Boolean> itemsNotReceived;
    private String acceptanceComment;
    private TransactionPurpose purpose;
    private MaintenanceLinkingRequest maintenanceLinkingRequest; // Optional maintenance handling
} 