package com.example.backend.repositories.warehouse;

import com.example.backend.models.warehouse.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {

    List<Warehouse> findBySiteId(UUID siteId);

    @Query("SELECT w FROM Warehouse w WHERE w.id = :id")
    Optional<Warehouse> findByIdWithoutCollections(@Param("id") UUID id);

    @Query("SELECT DISTINCT w FROM Warehouse w LEFT JOIN FETCH w.site LEFT JOIN FETCH w.employees e LEFT JOIN FETCH e.jobPosition")
    List<Warehouse> findAllWithSiteAndEmployees();

    @Query("SELECT w FROM Warehouse w LEFT JOIN FETCH w.site LEFT JOIN FETCH w.employees e LEFT JOIN FETCH e.jobPosition WHERE w.id = :id")
    Optional<Warehouse> findByIdWithSiteAndEmployees(@Param("id") UUID id);
}
