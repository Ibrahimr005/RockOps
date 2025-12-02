package com.example.backend.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDirectPurchaseTicketDto {

    @NotNull(message = "Equipment ID is required")
    private UUID equipmentId;

    @NotNull(message = "Merchant ID is required")
    private UUID merchantId;

    @NotNull(message = "Responsible person ID is required")
    private UUID responsiblePersonId;

    @NotBlank(message = "Spare part name is required")
    @Size(max = 255, message = "Spare part name must not exceed 255 characters")
    private String sparePart;

    @NotNull(message = "Expected parts cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected parts cost must be non-negative")
    private BigDecimal expectedPartsCost;

    @NotNull(message = "Expected transportation cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected transportation cost must be non-negative")
    private BigDecimal expectedTransportationCost;

    private String description;
}
