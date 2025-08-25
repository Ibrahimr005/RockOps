package com.example.backend.dto.payroll;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkDeductionRequest {

    @NotEmpty(message = "At least one deduction request is required")
    @Valid
    private List<CreateManualDeductionRequest> deductions;

    private Boolean validateOnly; // If true, only validate without creating
    private String reason; // Reason for bulk operation
}
