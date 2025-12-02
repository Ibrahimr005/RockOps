package com.example.backend.dto.procurement;

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
public class PurchaseOrderDTO {
    private UUID id;
    private String poNumber;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String status;
    private String createdBy;
    private String approvedBy;
    private LocalDateTime financeApprovalDate;
    private String paymentTerms;
    private LocalDateTime expectedDeliveryDate;
    private double totalAmount;
    private String currency;

    // Request Order reference (minimal to avoid circular deps)
    private UUID requestOrderId;
    private RequestOrderDTO requestOrder;

    // Offer reference (minimal to avoid circular deps)
    private UUID offerId;
    private OfferDTO offer;

    // Purchase Order Items (full DTOs)
    private List<PurchaseOrderItemDTO> purchaseOrderItems;

    private List<DeliverySessionDTO> deliverySessions;
}
