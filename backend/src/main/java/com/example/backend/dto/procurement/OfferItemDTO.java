package com.example.backend.dto.procurement;

import com.example.backend.dto.merchant.MerchantDTO;
import com.example.backend.dto.warehouse.ItemTypeDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferItemDTO {
    private UUID id;
    private double quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private String currency;
    private Integer estimatedDeliveryDays;
    private String deliveryNotes;
    private String comment;
    private String financeStatus;
    private String rejectionReason;
    private String financeApprovedBy;
    private boolean finalized;

    // Parent offer reference (minimal to avoid circular deps)
    private UUID offerId;

    // Merchant information (full DTO)
    private UUID merchantId;
    private MerchantDTO merchant;

    // Request Order Item reference (minimal to avoid circular deps)
    private UUID requestOrderItemId;
    private RequestOrderItemDTO requestOrderItem;

    // Item Type information (full DTO)
    private UUID itemTypeId;
    private ItemTypeDTO itemType;

    // Purchase Order Item reference (minimal to avoid circular deps)
    private UUID purchaseOrderItemId;
    private boolean hasPurchaseOrderItem;
}