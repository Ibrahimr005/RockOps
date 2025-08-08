package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for reviewing promotion requests
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionRequestReviewDTO {
    private String action; // "approve" or "reject"
    private String managerComments;
    private String rejectionReason;
    private BigDecimal approvedSalary;
    private LocalDate actualEffectiveDate;
}
