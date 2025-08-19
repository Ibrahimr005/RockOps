// RepaymentScheduleDTO.java
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
public class RepaymentScheduleDTO {
    private UUID id;
    private UUID loanId;
    private Integer installmentNumber;
    private LocalDate dueDate;
    private BigDecimal scheduledAmount;
    private BigDecimal principalAmount;
    private BigDecimal interestAmount;
    private BigDecimal actualAmount;
    private LocalDate paidDate;
    private UUID payslipId;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}