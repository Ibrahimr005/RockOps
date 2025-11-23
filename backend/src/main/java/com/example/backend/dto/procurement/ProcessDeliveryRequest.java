package com.example.backend.dto.procurement;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class ProcessDeliveryRequest {
    private UUID purchaseOrderId;
    private UUID merchantId;
    private String processedBy;
    private String deliveryNotes;
    private List<ProcessItemReceiptRequest> itemReceipts;
}