package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePayrollRequest {
    private LocalDate startDate;
    private LocalDate endDate;
    private String createdBy;
    private Boolean overrideContinuity;
    private String overrideReason;
}
