package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for employee promotion summary
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeePromotionSummaryDTO {
    private UUID employeeId;
    private String employeeName;
    private String currentPositionName;
    private String currentDepartmentName;
    private Integer totalPromotions;
    private Integer pendingRequests;
    private Integer approvedRequests;
    private Long monthsSinceLastPromotion;
    private Double averageTimeBetweenPromotions;
    private Boolean isEligibleForPromotion;
    private PromotionEligibilityDTO eligibilityStatus;
    private PromotionRequestResponseDTO lastPromotion;
    private PromotionRequestResponseDTO mostRecentRequest;
}
