package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for Step 4: Transporting
 * Transport details including from/to locations, cost, and responsible person
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransportingStepDto {

    @NotBlank(message = "From location is required")
    @Size(max = 500, message = "From location must not exceed 500 characters")
    private String transportFromLocation;

    @NotNull(message = "Destination site is required")
    private UUID transportToSiteId;

    @NotNull(message = "Transportation cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Transportation cost must be non-negative")
    private BigDecimal actualTransportationCost;

    // Exactly ONE of these must be set (either contact OR employee)
    private UUID transportResponsibleContactId;
    private UUID transportResponsibleEmployeeId;

    // For display purposes
    private String transportResponsiblePersonName;
    private String transportResponsiblePersonPhone;
    private String transportResponsiblePersonEmail;
    private String transportResponsiblePersonType; // CONTACT or EMPLOYEE
}
