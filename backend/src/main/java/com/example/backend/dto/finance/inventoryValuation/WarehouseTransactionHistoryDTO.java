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
    private String itemName;
    private Integer quantity;
    private String measuringUnit;
    private Double unitPrice;
    private Double totalValue; // quantity * unitPrice

    // Meta
    private String createdBy;
    private String approvedBy;
    private String completedAt;
}