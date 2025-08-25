package com.example.backend.services.finance.fixedAssets;

import com.example.backend.dto.finance.fixedAssets.*;
import com.example.backend.models.finance.fixedAssets.*;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.finance.fixedAssets.AssetDisposalRepository;
import com.example.backend.repositories.finance.fixedAssets.FixedAssetsRepository;
import com.example.backend.repositories.site.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class FixedAssetsService {

    private final FixedAssetsRepository fixedAssetsRepository;
    private final SiteRepository siteRepository;
    private final AssetDisposalRepository assetDisposalRepository;

    @Autowired
    public FixedAssetsService(FixedAssetsRepository fixedAssetsRepository, SiteRepository siteRepository, AssetDisposalRepository assetDisposalRepository) {
        this.fixedAssetsRepository = fixedAssetsRepository;
        this.siteRepository = siteRepository;
        this.assetDisposalRepository = assetDisposalRepository;
    }


    // Basic CRUD Operations
    public FixedAssetsResponseDTO createAsset(FixedAssetsRequestDTO requestDTO) {
        FixedAssets asset = mapToEntity(requestDTO);
        FixedAssets savedAsset = fixedAssetsRepository.save(asset);
        return mapToResponseDTO(savedAsset);
    }

    public FixedAssetsResponseDTO getAssetById(UUID id) {
        FixedAssets asset = findAssetById(id);
        return mapToResponseDTO(asset);
    }

    public FixedAssetsResponseDTO updateAsset(UUID id, FixedAssetsRequestDTO requestDTO) {
        FixedAssets existingAsset = findAssetById(id);
        updateAssetFromDTO(existingAsset, requestDTO);
        FixedAssets updatedAsset = fixedAssetsRepository.save(existingAsset);
        return mapToResponseDTO(updatedAsset);
    }

    public void deleteAsset(UUID id) {
        FixedAssets asset = findAssetById(id);
        fixedAssetsRepository.delete(asset);
    }

    // List Operations
    @Transactional(readOnly = true)
    public List<FixedAssetsResponseDTO> getAllAssets() {
        return fixedAssetsRepository.findAll()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FixedAssetsResponseDTO> getAssetsByStatus(AssetStatus status) {
        return fixedAssetsRepository.findByStatus(status)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

//    @Transactional(readOnly = true)
//    public List<FixedAssetsResponseDTO> getAssetsByCategory(String category) {
//        return fixedAssetsRepository.findByCategory(category)
//                .stream()
//                .map(this::mapToResponseDTO)
//                .collect(Collectors.toList());
//    }

    @Transactional(readOnly = true)
    public List<FixedAssetsResponseDTO> getAssetsBySite(UUID siteId) {
        return fixedAssetsRepository.findBySiteId(siteId)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }



//    // Assignment Operations
//    public FixedAssetsResponseDTO assignAssetToSite(UUID assetId, UUID siteId) {
//        FixedAssets asset = findAssetById(assetId);
//        Site site = siteRepository.findById(siteId)
//                .orElseThrow(() -> new RuntimeException("Site not found with id: " + siteId));
//
//        asset.setSite(site);
//        FixedAssets updatedAsset = fixedAssetRepository.save(asset);
//        return mapToResponseDTO(updatedAsset);
//    }
//
//    public FixedAssetsResponseDTO unassignAssetFromSite(UUID assetId) {
//        FixedAssets asset = findAssetById(assetId);
//        asset.setSite(null);
//        FixedAssets updatedAsset = fixedAssetRepository.save(asset);
//        return mapToResponseDTO(updatedAsset);
//    }

    // CORE FEATURE: Depreciation Calculations (FA-002)

    /**
     * Calculate monthly depreciation amount for an asset
     * Straight-line: (Cost - Salvage Value) / (Useful Life in Months)
     * Declining Balance: (Rate × Current Book Value) / 12
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateMonthlyDepreciation(UUID assetId) {
        FixedAssets asset = findAssetById(assetId);
        return calculateMonthlyDepreciation(asset);
    }

    private BigDecimal calculateMonthlyDepreciation(FixedAssets asset) {
        if (asset.getDepreciationMethod() == DepreciationMethod.STRAIGHT_LINE) {
            // Straight-line: (Cost - Salvage Value) / Useful Life in Months
            BigDecimal depreciableAmount = asset.getCost().subtract(
                    asset.getSalvageValue() != null ? asset.getSalvageValue() : BigDecimal.ZERO
            );
            int usefulLifeMonths = asset.getUsefulLifeYears() * 12;
            return depreciableAmount.divide(
                    BigDecimal.valueOf(usefulLifeMonths),
                    2,
                    RoundingMode.HALF_UP
            );
        } else if (asset.getDepreciationMethod() == DepreciationMethod.DECLINING_BALANCE) {
            // Declining Balance: Use 200% (double declining) rate
            BigDecimal rate = BigDecimal.valueOf(2.0)
                    .divide(BigDecimal.valueOf(asset.getUsefulLifeYears()), 4, RoundingMode.HALF_UP);
            BigDecimal currentBookValue = calculateCurrentBookValue(asset, LocalDate.now());
            return currentBookValue.multiply(rate).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
        }

        return BigDecimal.ZERO;
    }

    /**
     * Calculate total accumulated depreciation as of a specific date
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateAccumulatedDepreciation(UUID assetId, LocalDate asOfDate) {
        FixedAssets asset = findAssetById(assetId);
        return calculateAccumulatedDepreciation(asset, asOfDate);
    }

    private BigDecimal calculateAccumulatedDepreciation(FixedAssets asset, LocalDate asOfDate) {
        LocalDate depreciationStart = asset.getDepreciationStartDate();

        // If asset hasn't started depreciating yet
        if (asOfDate.isBefore(depreciationStart)) {
            return BigDecimal.ZERO;
        }

        // Calculate months between start date and as-of date
        Period period = Period.between(depreciationStart, asOfDate);
        int monthsElapsed = period.getYears() * 12 + period.getMonths();

        // Add 1 if we're past the day of the month when depreciation started
        if (asOfDate.getDayOfMonth() >= depreciationStart.getDayOfMonth()) {
            monthsElapsed++;
        }

        if (asset.getDepreciationMethod() == DepreciationMethod.STRAIGHT_LINE) {
            BigDecimal monthlyDepreciation = calculateMonthlyDepreciation(asset);
            BigDecimal totalDepreciation = monthlyDepreciation.multiply(BigDecimal.valueOf(monthsElapsed));

            // Don't depreciate below salvage value
            BigDecimal maxDepreciation = asset.getCost().subtract(
                    asset.getSalvageValue() != null ? asset.getSalvageValue() : BigDecimal.ZERO
            );

            return totalDepreciation.min(maxDepreciation);
        } else {
            // For declining balance, we need to calculate month by month
            return calculateDecliningBalanceAccumulated(asset, monthsElapsed);
        }
    }

    /**
     * Calculate current book value (Cost - Accumulated Depreciation)
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateCurrentBookValue(UUID assetId, LocalDate asOfDate) {
        FixedAssets asset = findAssetById(assetId);
        return calculateCurrentBookValue(asset, asOfDate);
    }

    private BigDecimal calculateCurrentBookValue(FixedAssets asset, LocalDate asOfDate) {
        BigDecimal accumulatedDepreciation = calculateAccumulatedDepreciation(asset, asOfDate);
        BigDecimal bookValue = asset.getCost().subtract(accumulatedDepreciation);

        // Ensure book value doesn't go below salvage value
        BigDecimal salvageValue = asset.getSalvageValue() != null ? asset.getSalvageValue() : BigDecimal.ZERO;
        return bookValue.max(salvageValue);
    }

    /**
     * Helper method for declining balance accumulated depreciation calculation
     */
    private BigDecimal calculateDecliningBalanceAccumulated(FixedAssets asset, int monthsElapsed) {
        BigDecimal rate = BigDecimal.valueOf(2.0)
                .divide(BigDecimal.valueOf(asset.getUsefulLifeYears()), 4, RoundingMode.HALF_UP);
        BigDecimal monthlyRate = rate.divide(BigDecimal.valueOf(12), 6, RoundingMode.HALF_UP);

        BigDecimal currentValue = asset.getCost();
        BigDecimal totalDepreciation = BigDecimal.ZERO;
        BigDecimal salvageValue = asset.getSalvageValue() != null ? asset.getSalvageValue() : BigDecimal.ZERO;

        for (int month = 0; month < monthsElapsed; month++) {
            if (currentValue.compareTo(salvageValue) <= 0) {
                break; // Don't depreciate below salvage value
            }

            BigDecimal monthlyDepreciation = currentValue.multiply(monthlyRate);

            // Ensure we don't go below salvage value
            if (currentValue.subtract(monthlyDepreciation).compareTo(salvageValue) < 0) {
                monthlyDepreciation = currentValue.subtract(salvageValue);
            }

            totalDepreciation = totalDepreciation.add(monthlyDepreciation);
            currentValue = currentValue.subtract(monthlyDepreciation);
        }

        return totalDepreciation;
    }

    // Search Operations
    @Transactional(readOnly = true)
    public List<FixedAssetsResponseDTO> searchAssetsByName(String name) {
        return fixedAssetsRepository.findByNameContainingIgnoreCase(name)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

//    @Transactional(readOnly = true)
//    public List<String> getAllCategories() {
//        return fixedAssetsRepository.findAllCategories();
//    }

    // Helper Methods
    private FixedAssets findAssetById(UUID id) {
        return fixedAssetsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + id));
    }

    /**
     * Map DTO to Entity
     */
    private FixedAssets mapToEntity(FixedAssetsRequestDTO dto) {
        Site site = null;
        if (dto.getSiteId() != null) {
            site = siteRepository.findById(dto.getSiteId())
                    .orElseThrow(() -> new RuntimeException("Site not found with id: " + dto.getSiteId()));
        }

        return FixedAssets.builder()
                .name(dto.getName())
                .description(dto.getDescription())
//                .category(dto.getCategory())
                .cost(dto.getCost())
                .salvageValue(dto.getSalvageValue())
                .usefulLifeYears(dto.getUsefulLifeYears())
                .depreciationMethod(dto.getDepreciationMethod())
                .purchaseDate(dto.getPurchaseDate())
                .depreciationStartDate(dto.getDepreciationStartDate())
                .status(dto.getStatus())
                .serialNumber(dto.getSerialNumber())
                .site(site)
                .build();
    }

    /**
     * Map Entity to Response DTO with calculated values
     */
    private FixedAssetsResponseDTO mapToResponseDTO(FixedAssets asset) {
        LocalDate today = LocalDate.now();

        // Calculate depreciation values
        BigDecimal monthlyDepreciation = calculateMonthlyDepreciation(asset);
        BigDecimal accumulatedDepreciation = calculateAccumulatedDepreciation(asset, today);
        BigDecimal currentBookValue = calculateCurrentBookValue(asset, today);

        // Calculate age in months
        Period period = Period.between(asset.getPurchaseDate(), today);
        int ageInMonths = period.getYears() * 12 + period.getMonths();

        // Calculate depreciation rate (for declining balance)
        BigDecimal depreciationRate = BigDecimal.ZERO;
        if (asset.getDepreciationMethod() == DepreciationMethod.DECLINING_BALANCE) {
            depreciationRate = BigDecimal.valueOf(2.0)
                    .divide(BigDecimal.valueOf(asset.getUsefulLifeYears()), 4, RoundingMode.HALF_UP);
        }

        return FixedAssetsResponseDTO.builder()
                .id(asset.getId())
                .name(asset.getName())
                .description(asset.getDescription())
//                .category(asset.getCategory())
                .cost(asset.getCost())
                .salvageValue(asset.getSalvageValue())
                .usefulLifeYears(asset.getUsefulLifeYears())
                .depreciationMethod(asset.getDepreciationMethod())
                .purchaseDate(asset.getPurchaseDate())
                .depreciationStartDate(asset.getDepreciationStartDate())
                .status(asset.getStatus())
                .serialNumber(asset.getSerialNumber())
                .siteId(asset.getSite() != null ? asset.getSite().getId() : null)
                .siteName(asset.getSite() != null ? asset.getSite().getName() : null)
                .currentBookValue(currentBookValue)
                .accumulatedDepreciation(accumulatedDepreciation)
                .monthlyDepreciation(monthlyDepreciation)
                .ageInMonths(ageInMonths)
                .depreciationRate(depreciationRate)
                .build();
    }

    /**
     * Update existing entity from DTO
     */
    private void updateAssetFromDTO(FixedAssets asset, FixedAssetsRequestDTO dto) {
        asset.setName(dto.getName());
        asset.setDescription(dto.getDescription());
//        asset.setCategory(dto.getCategory());
        asset.setCost(dto.getCost());
        asset.setSalvageValue(dto.getSalvageValue());
        asset.setUsefulLifeYears(dto.getUsefulLifeYears());
        asset.setDepreciationMethod(dto.getDepreciationMethod());
        asset.setPurchaseDate(dto.getPurchaseDate());
        asset.setDepreciationStartDate(dto.getDepreciationStartDate());
        asset.setStatus(dto.getStatus());
        asset.setSerialNumber(dto.getSerialNumber());

        // Update site if provided
        if (dto.getSiteId() != null) {
            Site site = siteRepository.findById(dto.getSiteId())
                    .orElseThrow(() -> new RuntimeException("Site not found with id: " + dto.getSiteId()));
            asset.setSite(site);
        } else {
            asset.setSite(null);
        }
    }


    // CORE FEATURE: Asset Disposal (FA-004)

    /**
     * Dispose of an asset and calculate gain/loss
     */
    public AssetDisposalResponseDTO disposeAsset(AssetDisposalRequestDTO requestDTO) {
        // 1. Get the asset
        FixedAssets asset = findAssetById(requestDTO.getAssetId());

        // 2. Validate asset can be disposed
        validateAssetForDisposal(asset);

        // 3. Calculate book value at disposal date
        BigDecimal bookValueAtDisposal = calculateCurrentBookValue(asset, requestDTO.getDisposalDate());

        // 4. Calculate gain/loss
        BigDecimal saleAmount = requestDTO.getSaleAmount() != null ? requestDTO.getSaleAmount() : BigDecimal.ZERO;
        BigDecimal gainLoss = saleAmount.subtract(bookValueAtDisposal);

        // 5. Create disposal record
        AssetDisposal disposal = AssetDisposal.builder()
                .asset(asset)
                .disposalDate(requestDTO.getDisposalDate())
                .saleAmount(requestDTO.getSaleAmount())
                .disposalMethod(requestDTO.getDisposalMethod())
                .disposalReason(requestDTO.getDisposalReason())
                .notes(requestDTO.getNotes())
                .bookValueAtDisposal(bookValueAtDisposal)
                .gainLoss(gainLoss)
                .documentPath(requestDTO.getDocumentPath())
                .createdDate(LocalDate.now())
                .createdBy(requestDTO.getCreatedBy())
                .build();

        // 6. Save disposal
        AssetDisposal savedDisposal = assetDisposalRepository.save(disposal);

        // 7. Update asset status to DISPOSED
        asset.setStatus(AssetStatus.DISPOSED);
        fixedAssetsRepository.save(asset);

        // 8. Return response DTO
        return mapDisposalToResponseDTO(savedDisposal);
    }

    /**
     * Get disposal record for an asset
     */
    @Transactional(readOnly = true)
    public AssetDisposalResponseDTO getAssetDisposal(UUID assetId) {
        AssetDisposal disposal = assetDisposalRepository.findByAssetId(assetId)
                .orElseThrow(() -> new RuntimeException("No disposal record found for asset: " + assetId));
        return mapDisposalToResponseDTO(disposal);
    }

    /**
     * Get all disposals
     */
    @Transactional(readOnly = true)
    public List<AssetDisposalResponseDTO> getAllDisposals() {
        return assetDisposalRepository.findAll()
                .stream()
                .map(this::mapDisposalToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get disposals by method
     */
    @Transactional(readOnly = true)
    public List<AssetDisposalResponseDTO> getDisposalsByMethod(DisposalMethod method) {
        return assetDisposalRepository.findByDisposalMethod(method)
                .stream()
                .map(this::mapDisposalToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get disposals within date range
     */
    @Transactional(readOnly = true)
    public List<AssetDisposalResponseDTO> getDisposalsByDateRange(LocalDate startDate, LocalDate endDate) {
        return assetDisposalRepository.findByDisposalDateBetween(startDate, endDate)
                .stream()
                .map(this::mapDisposalToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get disposal summary for a period
     */
    @Transactional(readOnly = true)
    public DisposalSummaryDTO getDisposalSummary(LocalDate startDate, LocalDate endDate) {
        List<AssetDisposal> disposals = assetDisposalRepository.findByDisposalDateBetween(startDate, endDate);

        if (disposals.isEmpty()) {
            return DisposalSummaryDTO.builder()
                    .period(formatPeriod(startDate, endDate))
                    .totalDisposals(0)
                    .totalSaleAmount(BigDecimal.ZERO)
                    .totalBookValue(BigDecimal.ZERO)
                    .totalGainLoss(BigDecimal.ZERO)
                    .profitableDisposals(0)
                    .lossDisposals(0)
                    .averageGainLoss(BigDecimal.ZERO)
                    .salesCount(0)
                    .donationsCount(0)
                    .scrapCount(0)
                    .tradeInsCount(0)
                    .otherCount(0)
                    .build();
        }

        // Calculate summary statistics
        BigDecimal totalSaleAmount = disposals.stream()
                .map(d -> d.getSaleAmount() != null ? d.getSaleAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalBookValue = disposals.stream()
                .map(AssetDisposal::getBookValueAtDisposal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalGainLoss = disposals.stream()
                .map(AssetDisposal::getGainLoss)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long profitableDisposals = disposals.stream()
                .mapToLong(d -> d.getGainLoss().compareTo(BigDecimal.ZERO) > 0 ? 1 : 0)
                .sum();

        long lossDisposals = disposals.stream()
                .mapToLong(d -> d.getGainLoss().compareTo(BigDecimal.ZERO) < 0 ? 1 : 0)
                .sum();

        BigDecimal averageGainLoss = totalGainLoss.divide(
                BigDecimal.valueOf(disposals.size()), 2, RoundingMode.HALF_UP);

        // Count by method
        int salesCount = (int) disposals.stream().filter(d -> d.getDisposalMethod() == DisposalMethod.SALE).count();
        int donationsCount = (int) disposals.stream().filter(d -> d.getDisposalMethod() == DisposalMethod.DONATION).count();
        int scrapCount = (int) disposals.stream().filter(d -> d.getDisposalMethod() == DisposalMethod.SCRAP).count();
        int tradeInsCount = (int) disposals.stream().filter(d -> d.getDisposalMethod() == DisposalMethod.TRADE_IN).count();
        int otherCount = disposals.size() - salesCount - donationsCount - scrapCount - tradeInsCount;

        return DisposalSummaryDTO.builder()
                .period(formatPeriod(startDate, endDate))
                .totalDisposals(disposals.size())
                .totalSaleAmount(totalSaleAmount)
                .totalBookValue(totalBookValue)
                .totalGainLoss(totalGainLoss)
                .profitableDisposals((int) profitableDisposals)
                .lossDisposals((int) lossDisposals)
                .averageGainLoss(averageGainLoss)
                .salesCount(salesCount)
                .donationsCount(donationsCount)
                .scrapCount(scrapCount)
                .tradeInsCount(tradeInsCount)
                .otherCount(otherCount)
                .build();
    }
    // Helper Methods for Asset Disposal

    /**
     * Validate that an asset can be disposed
     */
    private void validateAssetForDisposal(FixedAssets asset) {
        if (asset.getStatus() == AssetStatus.DISPOSED) {
            throw new RuntimeException("Asset is already disposed: " + asset.getName());
        }

        // Check if disposal record already exists
        Optional<AssetDisposal> existingDisposal = assetDisposalRepository.findByAssetId(asset.getId());
        if (existingDisposal.isPresent()) {
            throw new RuntimeException("Disposal record already exists for asset: " + asset.getName());
        }
    }

    /**
     * Map AssetDisposal entity to response DTO
     */
    private AssetDisposalResponseDTO mapDisposalToResponseDTO(AssetDisposal disposal) {
        FixedAssets asset = disposal.getAsset();

        // Calculate gain/loss status
        String gainLossStatus;
        if (disposal.getGainLoss().compareTo(BigDecimal.ZERO) > 0) {
            gainLossStatus = "GAIN";
        } else if (disposal.getGainLoss().compareTo(BigDecimal.ZERO) < 0) {
            gainLossStatus = "LOSS";
        } else {
            gainLossStatus = "BREAK_EVEN";
        }

        // Calculate gain/loss percentage of original cost
        BigDecimal gainLossPercentage = BigDecimal.ZERO;
        if (asset.getCost().compareTo(BigDecimal.ZERO) > 0) {
            gainLossPercentage = disposal.getGainLoss()
                    .divide(asset.getCost(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        return AssetDisposalResponseDTO.builder()
                .id(disposal.getId())
                .disposalDate(disposal.getDisposalDate())
                .saleAmount(disposal.getSaleAmount())
                .disposalMethod(disposal.getDisposalMethod())
                .disposalReason(disposal.getDisposalReason())
                .notes(disposal.getNotes())
                .bookValueAtDisposal(disposal.getBookValueAtDisposal())
                .gainLoss(disposal.getGainLoss())
                .documentPath(disposal.getDocumentPath())
                .createdDate(disposal.getCreatedDate())
                .createdBy(disposal.getCreatedBy())
                .assetId(asset.getId())
                .assetName(asset.getName())
//                .assetCategory(asset.getCategory())
                .assetOriginalCost(asset.getCost())
                .assetSerialNumber(asset.getSerialNumber())
                .siteId(asset.getSite() != null ? asset.getSite().getId() : null)
                .siteName(asset.getSite() != null ? asset.getSite().getName() : null)
                .gainLossStatus(gainLossStatus)
                .gainLossPercentage(gainLossPercentage)
                .build();
    }

    /**
     * Format period for display
     */
    private String formatPeriod(LocalDate startDate, LocalDate endDate) {
        if (startDate.getYear() == endDate.getYear()) {
            if (startDate.getMonth() == endDate.getMonth()) {
                return startDate.getMonth() + " " + startDate.getYear();
            } else {
                return startDate.getMonth() + " - " + endDate.getMonth() + " " + startDate.getYear();
            }
        } else {
            return startDate.getYear() + " - " + endDate.getYear();
        }
    }

    /**
     * Get profitable disposals (gains)
     */
    @Transactional(readOnly = true)
    public List<AssetDisposalResponseDTO> getProfitableDisposals() {
        return assetDisposalRepository.findDisposalsWithGains()
                .stream()
                .map(this::mapDisposalToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get loss-making disposals
     */
    @Transactional(readOnly = true)
    public List<AssetDisposalResponseDTO> getLossDisposals() {
        return assetDisposalRepository.findDisposalsWithLosses()
                .stream()
                .map(this::mapDisposalToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get total gain/loss for a period
     */
    @Transactional(readOnly = true)
    public BigDecimal getTotalGainLossForPeriod(LocalDate startDate, LocalDate endDate) {
        return assetDisposalRepository.getTotalGainLossForPeriod(startDate, endDate);
    }

    /**
     * Get recent disposals (last 30 days)
     */
    @Transactional(readOnly = true)
    public List<AssetDisposalResponseDTO> getRecentDisposals() {
        LocalDate cutoffDate = LocalDate.now().minusDays(30);
        return assetDisposalRepository.findRecentDisposals(cutoffDate)
                .stream()
                .map(this::mapDisposalToResponseDTO)
                .collect(Collectors.toList());
    }

}

