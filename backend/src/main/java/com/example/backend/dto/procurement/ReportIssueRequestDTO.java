
// ===== FILE 1: ReportIssueRequestDTO.java =====
package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.IssueType;
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
public class ReportIssueRequestDTO {
    private UUID purchaseOrderId;
    private List<IssueItemDTO> items;
    private String comments;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IssueItemDTO {
        private UUID purchaseOrderItemId;
        private IssueType issueType;
    }
}