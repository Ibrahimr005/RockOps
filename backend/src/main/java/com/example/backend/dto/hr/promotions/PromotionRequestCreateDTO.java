package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for creating promotion requests
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionRequestCreateDTO {
    private UUID employeeId;
    private UUID promotedToJobPositionId;
    private String requestTitle;
    private String justification;
    private LocalDate proposedEffectiveDate;
    private BigDecimal proposedSalary;
    private String priority; // LOW, NORMAL, HIGH, URGENT
    private String hrComments;
    private String performanceRating;
    private String educationalQualifications;
    private String additionalCertifications;
    private Boolean requiresAdditionalTraining;
    private String trainingPlan;
}
