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
public class DeliverySessionDTO {
    private UUID id;
    private UUID purchaseOrderId;
    private UUID merchantId;
    private String merchantName;
    private String processedBy;
    private LocalDateTime processedAt;
    private String deliveryNotes;
    private List<DeliveryItemReceiptDTO> itemReceipts;
}