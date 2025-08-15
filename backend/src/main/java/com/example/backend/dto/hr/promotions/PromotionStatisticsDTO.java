package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for promotion statistics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionStatisticsDTO {
    private Long totalRequests;
    private Long pendingRequests;
    private Long approvedRequests;
    private Long implementedRequests;
    private Long rejectedRequests;
    private Long cancelledRequests;
    private Double approvalRate;
    private Double implementationRate;
    private BigDecimal averageSalaryIncrease;
    private BigDecimal averageSalaryIncreasePercentage;
    private Long averageDaysToApproval;
    private Long averageDaysToImplementation;
}
