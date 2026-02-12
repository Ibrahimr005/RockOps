package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.BonusType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for BonusType entity
 */
@Repository
public interface BonusTypeRepository extends JpaRepository<BonusType, UUID> {

    /**
     * Find all bonus types for a site
     */
    List<BonusType> findBySiteId(UUID siteId);

    /**
     * Find active bonus types for a site
     */
    List<BonusType> findBySiteIdAndIsActiveTrue(UUID siteId);

    /**
     * Find bonus type by code and site
     */
    Optional<BonusType> findByCodeAndSiteId(String code, UUID siteId);

    /**
     * Check if code exists for a site
     */
    boolean existsByCodeAndSiteId(String code, UUID siteId);
}
