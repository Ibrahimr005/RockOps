package com.example.backend.dto.finance.inventoryValuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseItemHistoryDTO {
    private UUID itemId;
    private String itemName;
    private String categoryName;
    private String parentCategoryName;
    private int quantity;
    private String measuringUnit;
    private Double unitPrice;
    private Double totalValue;
    private String itemSource; // MANUAL_ENTRY, PURCHASE_ORDER, TRANSACTION, INITIAL_STOCK
    private String sourceReference; // PO number, batch number, etc.
    private String senderName;
    private String receiverName;
    private String createdBy;
    private LocalDateTime createdAt;
    private String batchNumber;
    private String merchantName;

    // Transaction-specific fields
    private UUID transactionId;
    private String transactionStatus;
}