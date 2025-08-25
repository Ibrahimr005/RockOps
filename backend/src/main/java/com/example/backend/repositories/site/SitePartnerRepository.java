package com.example.backend.repositories.site;

import com.example.backend.models.site.SitePartner;
import com.example.backend.models.site.SitePartnerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SitePartnerRepository extends JpaRepository<SitePartner, SitePartnerId> {

    @Query("SELECT sp FROM SitePartner sp WHERE sp.site.id = :siteId AND sp.partner.id = :partnerId")
    Optional<SitePartner> findBySiteIdAndPartnerId(@Param("siteId") UUID siteId, @Param("partnerId") Integer partnerId);

    @Query("SELECT sp FROM SitePartner sp WHERE sp.site.id = :siteId")
    List<SitePartner> findAllBySiteId(@Param("siteId") UUID siteId);

    @Query("SELECT COALESCE(SUM(sp.percentage), 0.0) FROM SitePartner sp WHERE sp.site.id = :siteId")
    Double getTotalPercentageBySiteId(@Param("siteId") UUID siteId);

    @Query("SELECT sp FROM SitePartner sp JOIN FETCH sp.partner WHERE sp.site.id = :siteId")
    List<SitePartner> findAllBySiteIdWithPartner(@Param("siteId") UUID siteId);

    @Query("SELECT COUNT(sp) FROM SitePartner sp WHERE sp.site.id = :siteId AND sp.partner.id = :partnerId")
    Long countBySiteIdAndPartnerId(@Param("siteId") UUID siteId, @Param("partnerId") Integer partnerId);
}
