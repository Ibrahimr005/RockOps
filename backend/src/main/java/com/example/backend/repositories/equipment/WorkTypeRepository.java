package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.WorkType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkTypeRepository extends JpaRepository<WorkType, UUID> {
    // Find work types that are active
    List<WorkType> findByActiveTrue();

    // Find work type by name (case-sensitive)
    Optional<WorkType> findByName(String name);
    
    // Find work type by name (case-insensitive)
    Optional<WorkType> findByNameIgnoreCase(String name);

    // Find work type by name and active status
    Optional<WorkType> findByNameAndActiveTrue(String name);
}