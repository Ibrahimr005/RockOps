package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for updating Direct Purchase ticket - Step 4 (Transporting)
 * Includes: transport from/to locations, transportation cost, and responsible person
 * Responsible person can be EITHER a contact (from merchant) OR an employee (from site)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDirectPurchaseStep4Dto {

    // Transport from location (text field - where items are being picked up from)
    private String transportFromLocation;

    // Transport to site (defaults to equipment's site if not provided)
    private UUID transportToSiteId;

    // Actual transportation cost
    @DecimalMin(value = "0.0", inclusive = true, message = "Transportation cost must be non-negative")
    private BigDecimal actualTransportationCost;

    // Responsible person - EITHER contact OR employee (not both)
    // If both are provided, validation will fail
    private UUID transportResponsibleContactId;

    private UUID transportResponsibleEmployeeId;
}
