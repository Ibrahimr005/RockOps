package com.example.backend.dto.procurement;

import com.example.backend.dto.merchant.MerchantDTO;
import com.example.backend.dto.warehouse.ItemTypeDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime; // ADD THIS IMPORT
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderItemDTO {
    private UUID id;
    private double quantity;
    private double unitPrice;
    private double totalPrice;
    private String comment;
    private String status;
    private int estimatedDeliveryDays;
    private String deliveryNotes;

    // ADD THESE THREE FIELDS:
    private Double receivedQuantity;  // Quantity received
    private LocalDateTime receivedAt; // When received
    private String receivedBy;        // Who received it

    // Parent Purchase Order reference (minimal to avoid circular deps)
    private UUID purchaseOrderId;

    // Offer Item reference (minimal to avoid circular deps)
    private UUID offerItemId;

    // Direct relationships (full DTOs)
    private UUID itemTypeId;
    private ItemTypeDTO itemType;

    private UUID merchantId;
    private MerchantDTO merchant;
}