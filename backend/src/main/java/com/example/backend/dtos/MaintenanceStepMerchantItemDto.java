package com.example.backend.dtos;

import com.fasterxml.jackson.annotation.JsonInclude;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MaintenanceStepMerchantItemDto {

    private UUID id;

    @NotBlank(message = "Item description is required")
    private String description;

    @NotNull(message = "Item cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Item cost must be non-negative")
    private BigDecimal cost;
}
