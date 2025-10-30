package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.PurchaseOrderResolutionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveIssueRequestDTO {
    private UUID purchaseOrderId;
    private PurchaseOrderResolutionType resolutionType;  // ✅ FIXED
    private List<UUID> items;
    private String notes;
}