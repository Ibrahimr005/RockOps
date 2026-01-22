package com.example.backend.dto.finance.inventoryValuation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseTransactionHistoryDTO {
    // Transaction info
    private UUID transactionId;
    private Integer batchNumber;
    private String transactionDate;
    private String status;

    // Sender info
    private String senderName;
    private String senderType;

    // Receiver info
    private String receiverName;
    private String receiverType;

    // Item info (one item per row)
    private UUID itemId;
    private String itemName;
    private Integer quantity;
    private String measuringUnit;
    private Double unitPrice;
    private Double totalValue;

    // Meta
    private String createdBy;
    private String approvedBy;
    private String completedAt;

    // NEW: Source info for non-transaction items
    private String itemSource; // TRANSACTION, MANUAL_ENTRY, PURCHASE_ORDER, INITIAL_STOCK
    private String sourceReference; // PO number, etc.
    private String merchantName;
    private String createdAt;
}