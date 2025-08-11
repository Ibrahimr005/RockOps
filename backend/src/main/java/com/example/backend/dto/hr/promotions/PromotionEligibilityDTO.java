package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for promotion eligibility details
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionEligibilityDTO {
    private Boolean eligible;
    private java.util.List<String> reasons;
    private Long monthsInCurrentPosition;
    private Boolean hasActivePromotionRequests;
    private Integer promotionHistoryCount;
    private String employeeStatus;
}
