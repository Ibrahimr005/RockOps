package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBonusDTO {
    private UUID employeeId;
    private UUID bonusTypeId;
    private BigDecimal amount;
    private Integer effectiveMonth;
    private Integer effectiveYear;
    private String reason;
    private String notes;
}
