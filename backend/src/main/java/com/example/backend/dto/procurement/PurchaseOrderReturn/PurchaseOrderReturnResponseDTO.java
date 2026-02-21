package com.example.backend.dto.procurement.PurchaseOrderReturn;

import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderReturnResponseDTO {

    private UUID id;
    private String returnNumber;
    private UUID purchaseOrderId;
    private String purchaseOrderNumber;
    private UUID merchantId;
    private String merchantName;
    private BigDecimal totalReturnAmount;
    private PurchaseOrderReturnStatus status;
    private String reason;
    private String requestedBy;
    private LocalDateTime requestedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PurchaseOrderReturnItemDTO> returnItems;
}