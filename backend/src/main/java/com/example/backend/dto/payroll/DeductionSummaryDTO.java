package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeductionSummaryDTO {
    private UUID employeeId;
    private String employeeName;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private Integer totalDeductions;
    private BigDecimal totalFixedAmount;
    private BigDecimal totalPercentage;
    private Map<String, BigDecimal> deductionsByType;
    private List<EmployeeDeductionDTO> activeDeductions;
    private BigDecimal estimatedTotalAmount; // Estimated total for percentage-based deductions
}
