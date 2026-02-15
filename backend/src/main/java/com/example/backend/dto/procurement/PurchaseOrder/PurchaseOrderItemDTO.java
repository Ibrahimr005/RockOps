package com.example.backend.dto.procurement.PurchaseOrder;

import com.example.backend.dto.merchant.MerchantDTO;
import com.example.backend.dto.procurement.DeliveryItemReceiptDTO;
import com.example.backend.dto.warehouse.ItemTypeDTO;
import com.example.backend.models.procurement.PurchaseOrder.POItemPaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
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
    private Double receivedQuantity;
    private LocalDateTime receivedAt;
    private String receivedBy;

    // Parent Purchase Order reference (minimal to avoid circular deps)
    private UUID purchaseOrderId;

    // Offer Item reference (minimal to avoid circular deps)
    private UUID offerItemId;

    // Direct relationships (full DTOs)
    private UUID itemTypeId;
    private ItemTypeDTO itemType;

    private UUID merchantId;
    private MerchantDTO merchant;

    // ✅ ADD THESE NEW FIELDS:
    private String itemTypeName;
    private String measuringUnit;
    private String currency;
    private String merchantName;

    private POItemPaymentStatus paymentStatus;  // ← ADD THIS
    private UUID paymentRequestItemId;

    // Add these at the end of the class:
    private List<DeliveryItemReceiptDTO> itemReceipts;

    // All issues for this item (aggregated from all deliveries)
    private List<PurchaseOrderIssueDTO> issues;

    // Calculated field - how much is left to receive/account for
    private Double remainingQuantity;
}