package com.example.backend.dto.finance.fixedAssets;

import com.example.backend.models.finance.fixedAssets.DisposalMethod;
import com.example.backend.models.finance.fixedAssets.DisposalReason;
import jakarta.validation.constraints.*;
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
public class AssetDisposalRequestDTO {

    @NotNull(message = "Asset ID is required")
    private UUID assetId;

    @NotNull(message = "Disposal date is required")
    @PastOrPresent(message = "Disposal date cannot be in the future")
    private LocalDate disposalDate;

    @DecimalMin(value = "0.00", message = "Sale amount cannot be negative")
    @Digits(integer = 13, fraction = 2, message = "Sale amount format is invalid")
    private BigDecimal saleAmount; // Optional - can be null for donations/scrap

    @NotNull(message = "Disposal method is required")
    private DisposalMethod disposalMethod;

    @NotNull(message = "Disposal reason is required")
    private DisposalReason disposalReason;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    @Size(max = 255, message = "Document path cannot exceed 255 characters")
    private String documentPath;

    @Size(max = 100, message = "Created by cannot exceed 100 characters")
    private String createdBy;
}