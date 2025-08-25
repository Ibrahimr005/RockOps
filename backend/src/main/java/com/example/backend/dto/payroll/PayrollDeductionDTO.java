package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollDeductionDTO {
    private UUID id;
    private UUID payslipId;
    private UUID deductionTypeId;
    private String deductionTypeName;
    private String description;
    private BigDecimal amount;
    private Boolean isPreTax;
    private LocalDate payrollDate;
    private String source; // "MANUAL", "AUTOMATIC", "LOAN", etc.
}
