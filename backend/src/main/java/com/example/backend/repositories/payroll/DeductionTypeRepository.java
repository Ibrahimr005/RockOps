package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.DeductionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for DeductionType entity
 */
@Repository
public interface DeductionTypeRepository extends JpaRepository<DeductionType, UUID> {

    /**
     * Find by code
     */
    Optional<DeductionType> findByCode(String code);

    /**
     * Find by name
     */
    Optional<DeductionType> findByName(String name);

    /**
     * Find by name and site
     */
    Optional<DeductionType> findByNameAndSiteId(String name, UUID siteId);

    /**
     * Find all active deduction types
     */
    List<DeductionType> findByIsActiveTrue();

    /**
     * Find all active deduction types for a site (including global types without site)
     */
    @Query("SELECT dt FROM DeductionType dt WHERE dt.isActive = true " +
           "AND (dt.site.id = :siteId OR dt.site IS NULL) " +
           "ORDER BY dt.category, dt.name")
    List<DeductionType> findActiveForSite(@Param("siteId") UUID siteId);

    /**
     * Find by category
     */
    List<DeductionType> findByCategoryAndIsActiveTrue(DeductionType.DeductionCategory category);

    /**
     * Find system-defined types
     */
    List<DeductionType> findByIsSystemDefinedTrue();

    /**
     * Find custom (non-system) types
     */
    List<DeductionType> findByIsSystemDefinedFalseAndIsActiveTrue();

    /**
     * Check if code exists
     */
    boolean existsByCode(String code);

    /**
     * Check if name exists for site
     */
    boolean existsByNameAndSiteId(String name, UUID siteId);

    /**
     * Find all ordered by category and name
     */
    @Query("SELECT dt FROM DeductionType dt WHERE dt.isActive = true " +
           "ORDER BY dt.category, dt.name")
    List<DeductionType> findAllActiveOrdered();
}
