package com.example.backend.repositories.finance.loans;

import com.example.backend.models.finance.loans.FinancialInstitution;
import com.example.backend.models.finance.loans.enums.InstitutionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialInstitutionRepository extends JpaRepository<FinancialInstitution, UUID> {

    // Find by institution number
    Optional<FinancialInstitution> findByInstitutionNumber(String institutionNumber);

    // Find by name (case-insensitive)
    @Query("SELECT fi FROM FinancialInstitution fi WHERE LOWER(fi.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<FinancialInstitution> findByNameContainingIgnoreCase(@Param("name") String name);

    // Find by exact name
    Optional<FinancialInstitution> findByName(String name);

    // Find by institution type
    List<FinancialInstitution> findByInstitutionType(InstitutionType institutionType);

    // Find active institutions
    List<FinancialInstitution> findByIsActiveTrue();

    // Find active institutions by type
    List<FinancialInstitution> findByIsActiveTrueAndInstitutionType(InstitutionType institutionType);

    // Find all ordered by name
    List<FinancialInstitution> findAllByOrderByNameAsc();

    // Find active ordered by name (for dropdowns)
    List<FinancialInstitution> findByIsActiveTrueOrderByNameAsc();

    // Check if name exists (for validation)
    boolean existsByName(String name);

    // Check if institution number exists
    boolean existsByInstitutionNumber(String institutionNumber);

    // Count active institutions
    long countByIsActiveTrue();

    // Find institutions with active loans
    @Query("SELECT DISTINCT fi FROM FinancialInstitution fi " +
            "JOIN fi.loans l WHERE l.status = 'ACTIVE'")
    List<FinancialInstitution> findInstitutionsWithActiveLoans();

    // Count loans per institution
    @Query("SELECT fi.id, fi.name, COUNT(l) FROM FinancialInstitution fi " +
            "LEFT JOIN fi.loans l GROUP BY fi.id, fi.name")
    List<Object[]> countLoansPerInstitution();
}