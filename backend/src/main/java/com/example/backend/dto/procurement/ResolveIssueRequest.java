package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.PurchaseOrderResolutionType;
import lombok.Data;

import java.util.UUID;

@Data
public class ResolveIssueRequest {
    private UUID issueId;
    private PurchaseOrderResolutionType resolutionType;
    private String resolutionNotes;
}