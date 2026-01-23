package com.example.backend.dto.payroll;

import com.example.backend.models.payroll.EmployeeDeduction;
import com.example.backend.models.payroll.DeductionType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for EmployeeDeduction entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDeductionDTO {

    private UUID id;

    private String deductionNumber;

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    private String employeeName;

    private String employeeNumber;

    @NotNull(message = "Deduction Type ID is required")
    private UUID deductionTypeId;

    private String deductionTypeName;

    private String deductionTypeCode;

    private DeductionType.DeductionCategory deductionCategory;

    private String categoryDisplayName;

    @Size(max = 100, message = "Custom name must be less than 100 characters")
    private String customName;

    private String displayName;

    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;

    // Amount is required for fixed deductions, can be 0 for percentage-based
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0", message = "Amount must be non-negative")
    private BigDecimal amount;

    @NotNull(message = "Calculation method is required")
    private EmployeeDeduction.CalculationMethod calculationMethod;

    private String calculationMethodDisplayName;

    @DecimalMin(value = "0", message = "Percentage value must be positive")
    @DecimalMax(value = "100", message = "Percentage value must be less than or equal to 100")
    private BigDecimal percentageValue;

    @DecimalMin(value = "0", message = "Max amount must be positive")
    private BigDecimal maxAmount;

    @NotNull(message = "Frequency is required")
    private EmployeeDeduction.DeductionFrequency frequency;

    private String frequencyDisplayName;

    @NotNull(message = "Effective start date is required")
    private LocalDate effectiveStartDate;

    private LocalDate effectiveEndDate;

    private Boolean isActive;

    private UUID referenceId;

    private String referenceType;

    // Tracking fields
    private BigDecimal totalDeducted;

    private Integer deductionCount;

    private LocalDate lastDeductionDate;

    private Integer priority;

    // Audit fields
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;

    /**
     * Convert entity to DTO
     */
    public static EmployeeDeductionDTO fromEntity(EmployeeDeduction entity) {
        if (entity == null) {
            return null;
        }

        EmployeeDeductionDTOBuilder builder = EmployeeDeductionDTO.builder()
            .id(entity.getId())
            .deductionNumber(entity.getDeductionNumber())
            .customName(entity.getCustomName())
            .displayName(entity.getDisplayName())
            .description(entity.getDescription())
            .amount(entity.getAmount())
            .calculationMethod(entity.getCalculationMethod())
            .calculationMethodDisplayName(entity.getCalculationMethod() != null
                ? entity.getCalculationMethod().getDisplayName() : null)
            .percentageValue(entity.getPercentageValue())
            .maxAmount(entity.getMaxAmount())
            .frequency(entity.getFrequency())
            .frequencyDisplayName(entity.getFrequency() != null
                ? entity.getFrequency().getDisplayName() : null)
            .effectiveStartDate(entity.getEffectiveStartDate())
            .effectiveEndDate(entity.getEffectiveEndDate())
            .isActive(entity.getIsActive())
            .referenceId(entity.getReferenceId())
            .referenceType(entity.getReferenceType())
            .totalDeducted(entity.getTotalDeducted())
            .deductionCount(entity.getDeductionCount())
            .lastDeductionDate(entity.getLastDeductionDate())
            .priority(entity.getPriority())
            .createdBy(entity.getCreatedBy())
            .createdAt(entity.getCreatedAt())
            .updatedBy(entity.getUpdatedBy())
            .updatedAt(entity.getUpdatedAt());

        // Employee info
        if (entity.getEmployee() != null) {
            builder.employeeId(entity.getEmployee().getId())
                .employeeName(entity.getEmployee().getFirstName() + " " + entity.getEmployee().getLastName())
                .employeeNumber(entity.getEmployee().getEmployeeNumber());
        }

        // Deduction type info
        if (entity.getDeductionType() != null) {
            builder.deductionTypeId(entity.getDeductionType().getId())
                .deductionTypeName(entity.getDeductionType().getName())
                .deductionTypeCode(entity.getDeductionType().getCode())
                .deductionCategory(entity.getDeductionType().getCategory())
                .categoryDisplayName(entity.getDeductionType().getCategory() != null
                    ? entity.getDeductionType().getCategory().getDisplayName() : null);
        }

        return builder.build();
    }
}
