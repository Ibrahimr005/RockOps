package com.example.backend.repositories.finance.valuation;

import com.example.backend.models.finance.Valuation.WarehouseValuation;
import com.example.backend.models.warehouse.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseValuationRepository extends JpaRepository<WarehouseValuation, UUID> {

    Optional<WarehouseValuation> findByWarehouse(Warehouse warehouse);

    Optional<WarehouseValuation> findByWarehouseId(UUID warehouseId);

    boolean existsByWarehouseId(UUID warehouseId);
}