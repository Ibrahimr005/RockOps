package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.PurchaseOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueResponseDTO {
    private boolean success;
    private String message;
    private PurchaseOrder purchaseOrder;
    private List<PurchaseOrderIssueDTO> issues;
}