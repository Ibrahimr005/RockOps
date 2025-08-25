package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeductionValidationResult {
    private Boolean isValid;
    private List<String> errors;
    private List<String> warnings;
    private UUID employeeId;
    private String employeeName;
    private CreateManualDeductionRequest request;
}
