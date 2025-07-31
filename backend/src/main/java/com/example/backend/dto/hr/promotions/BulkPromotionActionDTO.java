package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for bulk promotion operations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkPromotionActionDTO {
    private java.util.List<UUID> promotionRequestIds;
    private String action; // "approve", "reject", "implement"
    private String comments;
    private String reason; // for rejections
}
