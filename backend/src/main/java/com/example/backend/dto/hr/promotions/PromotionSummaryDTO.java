package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionSummaryDTO {
    private UUID id;
    private String employeeName;
    private String currentPositionName;
    private String promotedToPositionName;
    private String status; // PENDING, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTED
    private BigDecimal currentSalary;
    private BigDecimal proposedSalary;
    private BigDecimal salaryIncrease;
    private Double salaryIncreasePercentage;
    private LocalDateTime requestDate;
    private LocalDateTime effectiveDate;
    private String requestedBy;
    private String approvedBy;
    private Integer yearsInCurrentPosition;
    private String justification;
}


