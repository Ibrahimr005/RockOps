package com.example.backend.repositories.finance.fixedAssets;

import com.example.backend.models.finance.fixedAssets.AssetDisposal;
import com.example.backend.models.finance.fixedAssets.DisposalMethod;
import com.example.backend.models.finance.fixedAssets.DisposalReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetDisposalRepository extends JpaRepository<AssetDisposal, UUID> {

    // Find disposal by asset
    Optional<AssetDisposal> findByAssetId(UUID assetId);

    // Find disposals by method
    List<AssetDisposal> findByDisposalMethod(DisposalMethod method);

    // Find disposals by reason
    List<AssetDisposal> findByDisposalReason(DisposalReason reason);

    // Find disposals within date range
    List<AssetDisposal> findByDisposalDateBetween(LocalDate startDate, LocalDate endDate);

    // Find disposals by site (through asset relationship)
    @Query("SELECT d FROM AssetDisposal d WHERE d.asset.site.id = :siteId")
    List<AssetDisposal> findBySiteId(@Param("siteId") UUID siteId);

    // Find disposals with gains (profitable sales)
    @Query("SELECT d FROM AssetDisposal d WHERE d.gainLoss > 0")
    List<AssetDisposal> findDisposalsWithGains();

    // Find disposals with losses
    @Query("SELECT d FROM AssetDisposal d WHERE d.gainLoss < 0")
    List<AssetDisposal> findDisposalsWithLosses();

    // Get total gain/loss for a period
    @Query("SELECT COALESCE(SUM(d.gainLoss), 0) FROM AssetDisposal d WHERE d.disposalDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalGainLossForPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Get disposal statistics by method
    @Query("SELECT d.disposalMethod, COUNT(d), COALESCE(SUM(d.saleAmount), 0), COALESCE(SUM(d.gainLoss), 0) " +
            "FROM AssetDisposal d " +
            "GROUP BY d.disposalMethod")
    List<Object[]> getDisposalStatsByMethod();

    // Find recent disposals (last 30 days)
    @Query("SELECT d FROM AssetDisposal d WHERE d.disposalDate >= :cutoffDate ORDER BY d.disposalDate DESC")
    List<AssetDisposal> findRecentDisposals(@Param("cutoffDate") LocalDate cutoffDate);
}