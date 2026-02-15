package com.example.backend.repositories.warehouse;

import com.example.backend.models.warehouse.MeasuringUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface MeasuringUnitRepository extends JpaRepository<MeasuringUnit, UUID> {
    Optional<MeasuringUnit> findByName(String name);
}