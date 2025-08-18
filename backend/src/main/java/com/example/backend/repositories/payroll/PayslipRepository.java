package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.Payslip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, UUID> {

    /**
     * Find payslips by employee ID ordered by pay date (descending)
     */
    List<Payslip> findByEmployeeIdOrderByPayDateDesc(UUID employeeId);

    /**
     * Find payslips by employee ID with pagination
     */
    Page<Payslip> findByEmployeeIdOrderByPayDateDesc(UUID employeeId, Pageable pageable);

    /**
     * Find payslips by pay period start date range
     */
    List<Payslip> findByPayPeriodStartBetweenOrderByPayDateDesc(LocalDate startDate, LocalDate endDate);
    Page<Payslip> findByPayPeriodStartBetweenOrderByPayDateDesc(LocalDate start, LocalDate end, Pageable pageable);

    /**
     * Find payslips by pay period range - DETAILED VERSION
     */
    @Query("SELECT p FROM Payslip p WHERE " +
            "(p.payPeriodStart BETWEEN :startDate AND :endDate) OR " +
            "(p.payPeriodEnd BETWEEN :startDate AND :endDate) OR " +
            "(p.payPeriodStart <= :startDate AND p.payPeriodEnd >= :endDate) " +
            "ORDER BY p.payDate DESC")
    List<Payslip> findByPayPeriodStartBetweenOrPayPeriodEndBetween(@Param("startDate") LocalDate startDate,
                                                                   @Param("endDate") LocalDate endDate,
                                                                   @Param("startDate") LocalDate startDate2,
                                                                   @Param("endDate") LocalDate endDate2);

    /**
     * Alternative simpler query for payslips in period
     */
    @Query("SELECT p FROM Payslip p WHERE " +
            "p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate " +
            "ORDER BY p.payDate DESC")
    List<Payslip> findByPayPeriodWithinRange(@Param("startDate") LocalDate startDate,
                                             @Param("endDate") LocalDate endDate);

    /**
     * Find payslips by status
     */
    List<Payslip> findByStatusOrderByPayDateDesc(Payslip.PayslipStatus status);

    /**
     * Find payslips by status with pagination
     */
    Page<Payslip> findByStatusOrderByPayDateDesc(Payslip.PayslipStatus status, Pageable pageable);

    /**
     * Find payslips by employee and status
     */
    List<Payslip> findByEmployeeIdAndStatusOrderByPayDateDesc(UUID employeeId, Payslip.PayslipStatus status);

    /**
     * Find payslips by pay date range
     */
    List<Payslip> findByPayDateBetweenOrderByPayDateDesc(LocalDate startDate, LocalDate endDate);

    /**
     * Find payslips created by specific user
     */
    List<Payslip> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    /**
     * Count payslips by status
     */
    long countByStatus(Payslip.PayslipStatus status);

    /**
     * Count payslips by employee
     */
    long countByEmployeeId(UUID employeeId);

    /**
     *
     * Find draft payslips (for cleanup or review)
     */
    @Query("SELECT p FROM Payslip p WHERE p.status = 'DRAFT' ORDER BY p.createdAt ASC")
    List<Payslip> findDraftPayslips();

    /**
     * Find payslips that need to be sent
     */
    @Query("SELECT p FROM Payslip p WHERE p.status = 'APPROVED' AND p.sentAt IS NULL ORDER BY p.approvedAt ASC")
    List<Payslip> findPayslipsToSend();

    /**
     * Find payslips generated in date range
     */
    @Query("SELECT p FROM Payslip p WHERE p.generatedAt BETWEEN :startDate AND :endDate ORDER BY p.generatedAt DESC")
    List<Payslip> findByGeneratedAtBetween(@Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate);

    /**
     * Get payslips with total deductions greater than amount
     */
    @Query("SELECT p FROM Payslip p WHERE p.totalDeductions > :amount ORDER BY p.totalDeductions DESC")
    List<Payslip> findWithHighDeductions(@Param("amount") java.math.BigDecimal amount);

    /**
     * Find recent payslips (last N days)
     */
    @Query("SELECT p FROM Payslip p WHERE p.createdAt >= :cutoffDate ORDER BY p.createdAt DESC")
    List<Payslip> findRecentPayslips(@Param("cutoffDate") java.time.LocalDateTime cutoffDate);

    /**
     * Find payslips by multiple employees
     */
    @Query("SELECT p FROM Payslip p WHERE p.employee.id IN :employeeIds ORDER BY p.payDate DESC")
    List<Payslip> findByEmployeeIds(@Param("employeeIds") List<UUID> employeeIds);

    /**
     * Get payslip statistics
     */
    @Query("SELECT p.status, COUNT(p), COALESCE(SUM(p.grossSalary), 0), COALESCE(SUM(p.netPay), 0) " +
            "FROM Payslip p " +
            "WHERE p.payDate BETWEEN :startDate AND :endDate " +
            "GROUP BY p.status")
    List<Object[]> getPayslipStatistics(@Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate);

    /**
     * Delete old draft payslips (cleanup)
     */
    @Query("DELETE FROM Payslip p WHERE p.status = 'DRAFT' AND p.createdAt < :cutoffDate")
    void deleteOldDraftPayslips(@Param("cutoffDate") java.time.LocalDateTime cutoffDate);

    /**
     * Check if employee has payslip for period
     */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END " +
            "FROM Payslip p " +
            "WHERE p.employee.id = :employeeId " +
            "AND p.payPeriodStart = :periodStart " +
            "AND p.payPeriodEnd = :periodEnd")
    boolean existsByEmployeeAndPeriod(@Param("employeeId") UUID employeeId,
                                      @Param("periodStart") LocalDate periodStart,
                                      @Param("periodEnd") LocalDate periodEnd);

    /**
     * Check if employee has payslip for exact period (using Spring Data naming convention)
     */
    boolean existsByEmployeeIdAndPayPeriodStartAndPayPeriodEnd(UUID employeeId,
                                                               LocalDate payPeriodStart,
                                                               LocalDate payPeriodEnd);

    /**
     * Find latest payslip for employee
     */
    @Query("SELECT p FROM Payslip p " +
            "WHERE p.employee.id = :employeeId " +
            "ORDER BY p.payDate DESC")
    List<Payslip> findLatestByEmployee(@Param("employeeId") UUID employeeId);

    @Query("SELECT p FROM Payslip p " +
            "WHERE (:employeeName IS NULL OR " +
            "       LOWER(CONCAT(p.employee.firstName, ' ', p.employee.lastName)) LIKE LOWER(CONCAT('%', :employeeName, '%'))) " +
            "AND (:status IS NULL OR p.status = :status) " +
            "AND (:startDate IS NULL OR p.payPeriodStart >= :startDate) " +
            "AND (:endDate IS NULL OR p.payPeriodEnd <= :endDate) " +
            "AND (:minAmount IS NULL OR p.netPay >= :minAmount) " +
            "AND (:maxAmount IS NULL OR p.netPay <= :maxAmount) " +
            "ORDER BY p.payDate DESC")
    List<Payslip> searchPayslips(@Param("employeeName") String employeeName,
                                 @Param("status") Payslip.PayslipStatus status,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate,
                                 @Param("minAmount") BigDecimal minAmount,
                                 @Param("maxAmount") BigDecimal maxAmount);

    /**
     * Advanced search for payslips with pagination
     */
    @Query("SELECT p FROM Payslip p " +
            "WHERE (:employeeName IS NULL OR " +
            "       LOWER(CONCAT(p.employee.firstName, ' ', p.employee.lastName)) LIKE LOWER(CONCAT('%', :employeeName, '%'))) " +
            "AND (:status IS NULL OR p.status = :status) " +
            "AND (:startDate IS NULL OR p.payPeriodStart >= :startDate) " +
            "AND (:endDate IS NULL OR p.payPeriodEnd <= :endDate) " +
            "AND (:minAmount IS NULL OR p.netPay >= :minAmount) " +
            "AND (:maxAmount IS NULL OR p.netPay <= :maxAmount) " +
            "ORDER BY p.payDate DESC")
    Page<Payslip> searchPayslips(@Param("employeeName") String employeeName,
                                 @Param("status") Payslip.PayslipStatus status,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate,
                                 @Param("minAmount") BigDecimal minAmount,
                                 @Param("maxAmount") BigDecimal maxAmount,
                                 Pageable pageable);

    Page<Payslip> findByStatus(Payslip.PayslipStatus status, Pageable pageable);

    // Add these methods to your PayslipRepository interface

    /**
     * Count payslips by period
     */
    long countByPayPeriodStartBetween(LocalDate startDate, LocalDate endDate);

    /**
     * Get total gross payroll for a period using aggregation
     */
    @Query("SELECT SUM(p.grossSalary) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalGrossPayrollByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get total net payroll for a period using aggregation
     */
    @Query("SELECT SUM(p.netPay) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalNetPayrollByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get total deductions for a period using aggregation
     */
    @Query("SELECT SUM(p.totalDeductions) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalDeductionsByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get total employer contributions for a period using aggregation
     */
    @Query("SELECT SUM(p.totalEmployerContributions) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalEmployerContributionsByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get total earnings for a period using aggregation
     */
    @Query("SELECT SUM(p.totalEarnings) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getTotalEarningsByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get payroll statistics in one query (more efficient for reports)
     */
    @Query("SELECT " +
            "COUNT(p), " +
            "SUM(p.grossSalary), " +
            "SUM(p.netPay), " +
            "SUM(p.totalDeductions), " +
            "SUM(p.totalEarnings), " +
            "SUM(p.totalEmployerContributions) " +
            "FROM Payslip p " +
            "WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    Object[] getPayrollStatistics(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Count payslips by status for a period
     */
    @Query("SELECT p.status, COUNT(p) FROM Payslip p " +
            "WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate " +
            "GROUP BY p.status")
    List<Object[]> countPayslipsByStatusForPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get average salary for a period
     */
    @Query("SELECT AVG(p.grossSalary) FROM Payslip p WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    BigDecimal getAverageGrossSalaryByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * Get min and max salaries for a period
     */
    @Query("SELECT MIN(p.grossSalary), MAX(p.grossSalary) FROM Payslip p " +
            "WHERE p.payPeriodStart >= :startDate AND p.payPeriodEnd <= :endDate")
    Object[] getMinMaxSalariesByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}