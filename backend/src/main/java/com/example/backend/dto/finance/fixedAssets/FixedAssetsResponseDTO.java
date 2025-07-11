package com.example.backend.dto.finance.fixedAssets;

import com.example.backend.models.finance.fixedAssets.AssetStatus;
import com.example.backend.models.finance.fixedAssets.DepreciationMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FixedAssetsResponseDTO {

    private UUID id;
    private String name;
    private String description;
//    private String category;
    private BigDecimal cost;
    private BigDecimal salvageValue;
    private Integer usefulLifeYears;
    private DepreciationMethod depreciationMethod;
    private LocalDate purchaseDate;
    private LocalDate depreciationStartDate;
    private AssetStatus status;
    private String serialNumber;

    // Site information
    private UUID siteId;
    private String siteName;

    // Calculated fields (we'll calculate these in the service)
    private BigDecimal currentBookValue;
    private BigDecimal accumulatedDepreciation;
    private BigDecimal monthlyDepreciation;

    // Additional helpful fields
    private Integer ageInMonths;
    private BigDecimal depreciationRate;
}
