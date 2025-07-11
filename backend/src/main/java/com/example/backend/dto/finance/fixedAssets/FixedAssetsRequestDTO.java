package com.example.backend.dto.finance.fixedAssets;

import com.example.backend.models.finance.fixedAssets.AssetStatus;
import com.example.backend.models.finance.fixedAssets.DepreciationMethod;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FixedAssetsRequestDTO {

    @NotBlank(message = "Asset name is required")
    @Size(max = 255, message = "Asset name cannot exceed 255 characters")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

//    @NotBlank(message = "Category is required")
//    private String category;

    @NotNull(message = "Cost is required")
    @DecimalMin(value = "0.01", message = "Cost must be greater than 0")
    @Digits(integer = 13, fraction = 2, message = "Cost format is invalid")
    private BigDecimal cost;

    @DecimalMin(value = "0.00", message = "Salvage value cannot be negative")
    @Digits(integer = 13, fraction = 2, message = "Salvage value format is invalid")
    private BigDecimal salvageValue;

    @NotNull(message = "Useful life years is required")
    @Min(value = 1, message = "Useful life must be at least 1 year")
    @Max(value = 100, message = "Useful life cannot exceed 100 years")
    private Integer usefulLifeYears;

    @NotNull(message = "Depreciation method is required")
    private DepreciationMethod depreciationMethod;

    @NotNull(message = "Purchase date is required")
    @PastOrPresent(message = "Purchase date cannot be in the future")
    private LocalDate purchaseDate;

    @NotNull(message = "Depreciation start date is required")
    private LocalDate depreciationStartDate;

    @NotNull(message = "Status is required")
    private AssetStatus status;

    @Size(max = 100, message = "Serial number cannot exceed 100 characters")
    private String serialNumber;

    // Add this field for when site admin assigns the asset
    private UUID siteId; // This will be null initially, then set when assigned

}
