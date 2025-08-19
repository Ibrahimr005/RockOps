package com.example.backend.dto.payroll;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class DeductionTypeDTO {

    private UUID id;

    @NotBlank(message = "Deduction type name is required")
    private String name;

    @NotNull(message = "Deduction type category is required")
    private String type; // DeductionTypeEnum as string

    private Boolean isPercentage;
    private BigDecimal percentageRate;
    private BigDecimal fixedAmount;
    private Boolean isMandatory;
    private Boolean isActive;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
}
