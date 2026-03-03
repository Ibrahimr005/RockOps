package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.EmployeeDeduction;
import com.example.backend.models.payroll.DeductionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for EmployeeDeduction entity
 */
@Repository
public interface EmployeeDeductionRepository extends JpaRepository<EmployeeDeduction, UUID> {

    /**
     * Find by deduction number
     */
    Optional<EmployeeDeduction> findByDeductionNumber(String deductionNumber);

    /**
     * Find all deductions for an employee
     */
    List<EmployeeDeduction> findByEmployeeIdOrderByPriorityAsc(UUID employeeId);

    /**
     * Find active deductions for an employee
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "ORDER BY ed.priority ASC")
    List<EmployeeDeduction> findActiveByEmployeeId(@Param("employeeId") UUID employeeId);

    /**
     * Find deductions active during a specific payroll period
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "AND ed.effectiveStartDate <= :periodEnd " +
           "AND (ed.effectiveEndDate IS NULL OR ed.effectiveEndDate >= :periodStart) " +
           "ORDER BY ed.priority ASC")
    List<EmployeeDeduction> findActiveForPayrollPeriod(
        @Param("employeeId") UUID employeeId,
        @Param("periodStart") LocalDate periodStart,
        @Param("periodEnd") LocalDate periodEnd
    );

    /**
     * Find by employee and deduction type
     */
    List<EmployeeDeduction> findByEmployeeIdAndDeductionTypeId(UUID employeeId, UUID deductionTypeId);

    /**
     * Find active deductions by deduction type category
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "AND ed.deductionType.category = :category " +
           "ORDER BY ed.priority ASC")
    List<EmployeeDeduction> findActiveByEmployeeAndCategory(
        @Param("employeeId") UUID employeeId,
        @Param("category") DeductionType.DeductionCategory category
    );

    /**
     * Find loan-related deductions for an employee
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "AND ed.deductionType.category = 'LOANS' " +
           "ORDER BY ed.priority ASC")
    List<EmployeeDeduction> findActiveLoanDeductionsByEmployeeId(@Param("employeeId") UUID employeeId);

    /**
     * Find by reference (e.g., loan ID)
     */
    List<EmployeeDeduction> findByReferenceIdAndReferenceType(UUID referenceId, String referenceType);

    /**
     * Find active deduction by reference
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.referenceId = :referenceId " +
           "AND ed.referenceType = :referenceType " +
           "AND ed.isActive = true")
    Optional<EmployeeDeduction> findActiveByReference(
        @Param("referenceId") UUID referenceId,
        @Param("referenceType") String referenceType
    );

    /**
     * Count active deductions for employee
     */
    long countByEmployeeIdAndIsActiveTrue(UUID employeeId);

    /**
     * Check if deduction number exists
     */
    boolean existsByDeductionNumber(String deductionNumber);

    /**
     * Find all active deductions (for batch processing)
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.isActive = true " +
           "AND ed.effectiveStartDate <= :currentDate " +
           "AND (ed.effectiveEndDate IS NULL OR ed.effectiveEndDate >= :currentDate) " +
           "ORDER BY ed.employee.id, ed.priority ASC")
    List<EmployeeDeduction> findAllActiveDeductions(@Param("currentDate") LocalDate currentDate);

    /**
     * Get the maximum deduction number sequence (legacy - for generic DED- prefix)
     */
    @Query("SELECT MAX(CAST(SUBSTRING(ed.deductionNumber, 5) AS long)) FROM EmployeeDeduction ed WHERE ed.deductionNumber LIKE 'DED-%'")
    Long getMaxDeductionNumberSequence();

    /**
     * Get the maximum deduction number sequence for a specific deduction type code
     */
    @Query(value = "SELECT MAX(CAST(SUBSTRING(ed.deduction_number, LENGTH(:typeCode) + 2) AS BIGINT)) " +
           "FROM employee_deductions ed " +
           "WHERE ed.deduction_number LIKE CONCAT(:typeCode, '-%')", nativeQuery = true)
    Long getMaxDeductionNumberSequenceByTypeCode(@Param("typeCode") String typeCode);

    /**
     * Find deductions by frequency
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.isActive = true " +
           "AND ed.frequency = :frequency " +
           "ORDER BY ed.employee.id, ed.priority ASC")
    List<EmployeeDeduction> findByFrequency(@Param("frequency") EmployeeDeduction.DeductionFrequency frequency);

    /**
     * Sum total deductions for an employee
     */
    @Query("SELECT COALESCE(SUM(ed.amount), 0) FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "AND ed.calculationMethod = 'FIXED_AMOUNT'")
    java.math.BigDecimal sumFixedDeductionsForEmployee(@Param("employeeId") UUID employeeId);
}
