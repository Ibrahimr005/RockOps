
// DeductionTypeRepository.java
package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.DeductionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeductionTypeRepository extends JpaRepository<DeductionType, UUID> {

    // Find active deduction types
    List<DeductionType> findByIsActiveTrueOrderByName();

    // Find deduction types by type
    List<DeductionType> findByTypeOrderByName(DeductionType.DeductionTypeEnum type);

    // Find mandatory deduction types
    List<DeductionType> findByIsMandatoryTrueAndIsActiveTrueOrderByName();

    // Find by name
    DeductionType findByNameIgnoreCase(String name);
}