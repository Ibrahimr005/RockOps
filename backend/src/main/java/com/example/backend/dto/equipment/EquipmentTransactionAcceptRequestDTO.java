package com.example.backend.dto.equipment;

import com.example.backend.models.transaction.TransactionPurpose;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentTransactionAcceptRequestDTO {
    private Map<String, Integer> receivedQuantities;
    private String comment;
    private TransactionPurpose purpose;
    private Map<String, Boolean> itemsNotReceived;
} 