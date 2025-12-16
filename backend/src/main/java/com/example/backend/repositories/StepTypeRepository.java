package com.example.backend.repositories;

import com.example.backend.models.maintenance.StepType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StepTypeRepository extends JpaRepository<StepType, UUID> {
    List<StepType> findByActiveTrue();

    Optional<StepType> findByName(String name);

    boolean existsByName(String name);
}
