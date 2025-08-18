package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.EmployeeDeduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmployeeDeductionRepository extends JpaRepository<EmployeeDeduction, UUID> {

    /**
     * Find all deductions for an employee ordered by creation date
     */
    List<EmployeeDeduction> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    /**
     * Find active deductions for an employee on a specific date
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "AND ed.effectiveFrom <= :asOfDate " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :asOfDate)")
    List<EmployeeDeduction> findActiveDeductionsForEmployee(@Param("employeeId") UUID employeeId, 
                                                           @Param("asOfDate") LocalDate asOfDate);

    /**
     * Find active deductions for an employee within a specific period
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "AND ed.effectiveFrom <= :periodEnd " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :periodStart)")
    List<EmployeeDeduction> findActiveDeductionsInPeriod(@Param("employeeId") UUID employeeId,
                                                         @Param("periodStart") LocalDate periodStart,
                                                         @Param("periodEnd") LocalDate periodEnd);

    /**
     * Find overlapping deductions of the same type for an employee
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.deductionType.id = :deductionTypeId " +
           "AND ed.isActive = true " +
           "AND ed.effectiveFrom <= :effectiveTo " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :effectiveFrom)")
    List<EmployeeDeduction> findOverlappingDeductions(@Param("employeeId") UUID employeeId,
                                                      @Param("deductionTypeId") UUID deductionTypeId,
                                                      @Param("effectiveFrom") LocalDate effectiveFrom,
                                                      @Param("effectiveTo") LocalDate effectiveTo);

    /**
     * Find deductions by employee and deduction type
     */
    List<EmployeeDeduction> findByEmployeeIdAndDeductionTypeIdOrderByCreatedAtDesc(UUID employeeId, UUID deductionTypeId);

    /**
     * Find active deductions by deduction type
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.deductionType.id = :deductionTypeId " +
           "AND ed.isActive = true " +
           "AND ed.effectiveFrom <= :asOfDate " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :asOfDate)")
    List<EmployeeDeduction> findActiveDeductionsByType(@Param("deductionTypeId") UUID deductionTypeId,
                                                       @Param("asOfDate") LocalDate asOfDate);

    /**
     * Find deductions expiring soon (within next N days)
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.isActive = true " +
           "AND ed.effectiveTo IS NOT NULL " +
           "AND ed.effectiveTo BETWEEN :fromDate AND :toDate")
    List<EmployeeDeduction> findExpiringSoon(@Param("fromDate") LocalDate fromDate,
                                            @Param("toDate") LocalDate toDate);

    /**
     * Count active deductions for an employee
     */
    @Query("SELECT COUNT(ed) FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.isActive = true " +
           "AND ed.effectiveFrom <= :asOfDate " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :asOfDate)")
    long countActiveDeductionsForEmployee(@Param("employeeId") UUID employeeId,
                                         @Param("asOfDate") LocalDate asOfDate);

    /**
     * Find all deductions for multiple employees
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id IN :employeeIds " +
           "ORDER BY ed.employee.id, ed.createdAt DESC")
    List<EmployeeDeduction> findByEmployeeIds(@Param("employeeIds") List<UUID> employeeIds);

    /**
     * Find active deductions for multiple employees
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id IN :employeeIds " +
           "AND ed.isActive = true " +
           "AND ed.effectiveFrom <= :asOfDate " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :asOfDate)")
    List<EmployeeDeduction> findActiveDeductionsForEmployees(@Param("employeeIds") List<UUID> employeeIds,
                                                            @Param("asOfDate") LocalDate asOfDate);

    /**
     * Find deductions created by a specific user
     */
    List<EmployeeDeduction> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    /**
     * Find deductions created within a date range
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.createdAt >= :fromDate " +
           "AND ed.createdAt <= :toDate " +
           "ORDER BY ed.createdAt DESC")
    List<EmployeeDeduction> findByCreatedAtBetween(@Param("fromDate") LocalDate fromDate,
                                                   @Param("toDate") LocalDate toDate);

    /**
     * Get deduction statistics by type
     */
    @Query("SELECT ed.deductionType.name as typeName, " +
           "COUNT(ed) as count, " +
           "SUM(CASE WHEN ed.customAmount IS NOT NULL THEN ed.customAmount ELSE 0 END) as totalAmount " +
           "FROM EmployeeDeduction ed " +
           "WHERE ed.isActive = true " +
           "AND ed.effectiveFrom <= :asOfDate " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :asOfDate) " +
           "GROUP BY ed.deductionType.name " +
           "ORDER BY count DESC")
    List<Object[]> getDeductionStatistics(@Param("asOfDate") LocalDate asOfDate);

    /**
     * Find deductions with custom amounts (fixed amounts)
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.customAmount IS NOT NULL " +
           "AND ed.isActive = true " +
           "ORDER BY ed.customAmount DESC")
    List<EmployeeDeduction> findWithCustomAmounts();

    /**
     * Find deductions with custom percentages
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.customPercentage IS NOT NULL " +
           "AND ed.isActive = true " +
           "ORDER BY ed.customPercentage DESC")
    List<EmployeeDeduction> findWithCustomPercentages();

    /**
     * Find one-time deductions (where effective from equals effective to)
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.effectiveFrom = ed.effectiveTo " +
           "ORDER BY ed.effectiveFrom DESC")
    List<EmployeeDeduction> findOneTimeDeductions();

    /**
     * Find recurring deductions (where effective to is null or after effective from)
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.effectiveTo IS NULL OR ed.effectiveTo > ed.effectiveFrom " +
           "AND ed.isActive = true " +
           "ORDER BY ed.effectiveFrom DESC")
    List<EmployeeDeduction> findRecurringDeductions();

    /**
     * Check if employee has any active deductions of a specific type
     */
    @Query("SELECT CASE WHEN COUNT(ed) > 0 THEN true ELSE false END " +
           "FROM EmployeeDeduction ed " +
           "WHERE ed.employee.id = :employeeId " +
           "AND ed.deductionType.id = :deductionTypeId " +
           "AND ed.isActive = true " +
           "AND ed.effectiveFrom <= :asOfDate " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :asOfDate)")
    boolean hasActiveDeductionOfType(@Param("employeeId") UUID employeeId,
                                    @Param("deductionTypeId") UUID deductionTypeId,
                                    @Param("asOfDate") LocalDate asOfDate);

    /**
     * Find employees with more than N active deductions
     */
    @Query("SELECT ed.employee.id " +
           "FROM EmployeeDeduction ed " +
           "WHERE ed.isActive = true " +
           "AND ed.effectiveFrom <= :asOfDate " +
           "AND (ed.effectiveTo IS NULL OR ed.effectiveTo >= :asOfDate) " +
           "GROUP BY ed.employee.id " +
           "HAVING COUNT(ed) > :threshold")
    List<UUID> findEmployeesWithManyDeductions(@Param("threshold") long threshold,
                                              @Param("asOfDate") LocalDate asOfDate);

    /**
     * Find deductions that need review (expiring within days)
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.isActive = true " +
           "AND ed.effectiveTo IS NOT NULL " +
           "AND ed.effectiveTo BETWEEN CURRENT_DATE AND :reviewDate")
    List<EmployeeDeduction> findDeductionsNeedingReview(@Param("reviewDate") LocalDate reviewDate);

    /**
     * Delete expired deductions (cleanup)
     */
    @Query("DELETE FROM EmployeeDeduction ed " +
           "WHERE ed.effectiveTo IS NOT NULL " +
           "AND ed.effectiveTo < :cutoffDate " +
           "AND ed.isActive = false")
    void deleteExpiredDeductions(@Param("cutoffDate") LocalDate cutoffDate);

    /**
     * Find deductions by amount range
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.customAmount BETWEEN :minAmount AND :maxAmount " +
           "AND ed.isActive = true " +
           "ORDER BY ed.customAmount DESC")
    List<EmployeeDeduction> findByAmountRange(@Param("minAmount") java.math.BigDecimal minAmount,
                                             @Param("maxAmount") java.math.BigDecimal maxAmount);

    /**
     * Find deductions by percentage range
     */
    @Query("SELECT ed FROM EmployeeDeduction ed " +
           "WHERE ed.customPercentage BETWEEN :minPercentage AND :maxPercentage " +
           "AND ed.isActive = true " +
           "ORDER BY ed.customPercentage DESC")
    List<EmployeeDeduction> findByPercentageRange(@Param("minPercentage") java.math.BigDecimal minPercentage,
                                                  @Param("maxPercentage") java.math.BigDecimal maxPercentage);
}