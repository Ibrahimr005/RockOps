package com.example.backend.dto.payroll;

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
    private String name;
    private String type;
    private Boolean isPercentage;
    private BigDecimal percentageRate;
    private BigDecimal fixedAmount;
    private Boolean isMandatory;
    private Boolean isActive;
    private String description;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}