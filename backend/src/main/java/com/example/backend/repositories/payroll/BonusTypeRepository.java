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
     * Find active bonus types
     */
    List<BonusType> findByIsActiveTrue();

    /**
     * Find bonus type by code
     */
    Optional<BonusType> findByCode(String code);

    /**
     * Check if code exists
     */
    boolean existsByCode(String code);
}
