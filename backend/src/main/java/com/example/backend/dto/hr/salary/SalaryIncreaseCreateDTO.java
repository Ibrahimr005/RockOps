package com.example.backend.dto.hr.salary;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
public class SalaryIncreaseCreateDTO {

    @NotNull(message = "Request type is required")
    private String requestType; // EMPLOYEE_LEVEL or POSITION_LEVEL

    private UUID employeeId; // Required for EMPLOYEE_LEVEL, null for POSITION_LEVEL

    private UUID jobPositionId; // Required for POSITION_LEVEL

    @NotNull(message = "Requested salary is required")
    @Positive(message = "Requested salary must be positive")
    private BigDecimal requestedSalary;

    private LocalDate effectiveDate;

    @NotNull(message = "Reason is required")
    @Size(min = 1, max = 2000, message = "Reason must be between 1 and 2000 characters")
    private String reason;
}
