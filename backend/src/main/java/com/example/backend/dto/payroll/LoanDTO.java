
// LoanDTO.java
package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private BigDecimal loanAmount;
    private BigDecimal remainingBalance;
    private BigDecimal interestRate;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal installmentAmount;
    private String installmentFrequency;
    private Integer totalInstallments;
    private Integer paidInstallments;
    private String status;
    private String description;
    private String createdBy;
    private String approvedBy;
    private LocalDateTime approvalDate;
    private List<RepaymentScheduleDTO> repaymentSchedules;
    private String rejectedBy;
    private String rejectionReason;
    private LocalDateTime rejectionDate;
    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;

}