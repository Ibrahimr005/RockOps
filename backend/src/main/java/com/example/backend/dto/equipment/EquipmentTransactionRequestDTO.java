package com.example.backend.dto.equipment;

import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.TransactionPurpose;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentTransactionRequestDTO {
    private UUID receiverId;
    private PartyType receiverType;
    private Integer batchNumber;
    private LocalDateTime transactionDate;
    private TransactionPurpose purpose;
    private List<Map<String, Object>> items;
} 