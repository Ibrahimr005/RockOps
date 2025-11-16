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
public class ResolveIssuesRequestDTO {
    private List<IssueResolution> resolutions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IssueResolution {
        private UUID issueId;
        private PurchaseOrderResolutionType resolutionType;
        private String resolutionNotes;
    }
}