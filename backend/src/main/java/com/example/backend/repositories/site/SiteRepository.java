package com.example.backend.repositories.site;

import com.example.backend.models.site.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SiteRepository extends JpaRepository<Site, UUID> {

    @Query("SELECT s.id, " +
           "(SELECT COUNT(e) FROM Equipment e WHERE e.site = s), " +
           "(SELECT COUNT(emp) FROM Employee emp WHERE emp.site = s), " +
           "(SELECT COUNT(w) FROM Warehouse w WHERE w.site = s), " +
           "(SELECT COUNT(m) FROM Merchant m JOIN m.sites ms WHERE ms = s) " +
           "FROM Site s")
    List<Object[]> findAllSiteCounts();

    @Query("SELECT " +
           "(SELECT COUNT(e) FROM Equipment e WHERE e.site.id = :siteId), " +
           "(SELECT COUNT(emp) FROM Employee emp WHERE emp.site.id = :siteId), " +
           "(SELECT COUNT(w) FROM Warehouse w WHERE w.site.id = :siteId), " +
           "(SELECT COUNT(m) FROM Merchant m JOIN m.sites ms WHERE ms.id = :siteId) ")
    Object[] findSiteCountsById(@Param("siteId") UUID siteId);
}
