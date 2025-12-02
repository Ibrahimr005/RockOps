package com.example.backend.dto.procurement;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class ProcessItemReceiptRequest {
    private UUID purchaseOrderItemId;
    private Double goodQuantity;
    private Boolean isRedelivery;
    private List<CreateIssueRequest> issues;
}