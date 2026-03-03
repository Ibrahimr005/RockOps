package com.example.backend.dto.procurement.PurchaseOrderReturn;

import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderReturnResponseDTO {
    private UUID id;
    private String returnId;
    private UUID purchaseOrderId;
    private String purchaseOrderNumber;
    private UUID merchantId;
    private String merchantName;
    private BigDecimal totalReturnAmount;
    private String status;
    private String reason;
    private String requestedBy;
    private LocalDateTime requestedAt;

    // ✅ ADD THESE FIELDS
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String rejectedBy;
    private LocalDateTime rejectedAt;
    private String rejectionReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PurchaseOrderReturnItemDTO> returnItems;
}