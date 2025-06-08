package com.example.backend.dto.transaction;

import com.example.backend.models.transaction.TransactionStatus;
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
    private Integer quantity;
    private Integer receivedQuantity;
    private TransactionStatus status;
    private String rejectionReason;
} 