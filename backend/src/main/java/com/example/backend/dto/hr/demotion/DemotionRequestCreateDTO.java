package com.example.backend.dto.hr.demotion;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemotionRequestCreateDTO {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "New position ID is required")
    private UUID newPositionId;

    private String newGrade;

    @NotNull(message = "New salary is required")
    private BigDecimal newSalary;

    private LocalDate effectiveDate;

    @NotNull(message = "Reason is required")
    @Size(min = 10, max = 2000, message = "Reason must be between 10 and 2000 characters")
    private String reason;
}
