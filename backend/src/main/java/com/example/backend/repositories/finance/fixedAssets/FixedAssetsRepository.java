package com.example.backend.repositories.finance.fixedAssets;

import com.example.backend.models.finance.fixedAssets.AssetStatus;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FixedAssetsRepository extends JpaRepository<FixedAssets, UUID> {

    // Find by status
    List<FixedAssets> findByStatus(AssetStatus status);

//    // Find by category
//    List<FixedAssets> findByCategory(String category);

    // Find by site
    List<FixedAssets> findBySiteId(UUID siteId);

    // Find by status and site
    List<FixedAssets> findByStatusAndSiteId(AssetStatus status, UUID siteId);

    // Find assets purchased within a date range
    List<FixedAssets> findByPurchaseDateBetween(LocalDate startDate, LocalDate endDate);

    // Find assets that need depreciation calculation (active assets)
    List<FixedAssets> findByStatusAndDepreciationStartDateLessThanEqual(
            AssetStatus status, LocalDate date);

    // Custom query to find assets by name (case-insensitive)
    @Query("SELECT a FROM FixedAssets a WHERE LOWER(a.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<FixedAssets> findByNameContainingIgnoreCase(@Param("name") String name);

    // Custom query to find assets by serial number
    Optional<FixedAssets> findBySerialNumber(String serialNumber);




    // Find assets that are due for maintenance (we'll use this later)
    @Query("SELECT a FROM FixedAssets a WHERE a.status = :status AND a.purchaseDate <= :cutoffDate")
    List<FixedAssets> findAssetsDueForMaintenance(
            @Param("status") AssetStatus status,
            @Param("cutoffDate") LocalDate cutoffDate);
}
