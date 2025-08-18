// ===== EmployeeDeductionDTO.java =====
package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDeductionDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private UUID deductionTypeId;
    private String deductionTypeName;
    private String deductionTypeCategory;
    private BigDecimal customAmount;
    private BigDecimal customPercentage;
    private Boolean isActive;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
}

