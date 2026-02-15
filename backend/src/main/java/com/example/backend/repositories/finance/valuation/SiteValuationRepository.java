package com.example.backend.repositories.finance.valuation;

import com.example.backend.models.finance.Valuation.SiteValuation;
import com.example.backend.models.site.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SiteValuationRepository extends JpaRepository<SiteValuation, UUID> {

    Optional<SiteValuation> findBySite(Site site);

    Optional<SiteValuation> findBySiteId(UUID siteId);

    boolean existsBySiteId(UUID siteId);
}