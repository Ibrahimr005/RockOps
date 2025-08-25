package com.example.backend.dto.finance.fixedAssets;

import com.example.backend.models.finance.fixedAssets.DisposalMethod;
import com.example.backend.models.finance.fixedAssets.DisposalReason;
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
public class AssetDisposalResponseDTO {

    private UUID id;
    private LocalDate disposalDate;
    private BigDecimal saleAmount;
    private DisposalMethod disposalMethod;
    private DisposalReason disposalReason;
    private String notes;
    private BigDecimal bookValueAtDisposal;
    private BigDecimal gainLoss;
    private String documentPath;
    private LocalDate createdDate;
    private String createdBy;

    // Asset information
    private UUID assetId;
    private String assetName;
    private String assetCategory;
    private BigDecimal assetOriginalCost;
    private String assetSerialNumber;

    // Site information
    private UUID siteId;
    private String siteName;

    // Additional calculated fields
    private String gainLossStatus; // "GAIN", "LOSS", "BREAK_EVEN"
    private BigDecimal gainLossPercentage; // Percentage of original cost
}