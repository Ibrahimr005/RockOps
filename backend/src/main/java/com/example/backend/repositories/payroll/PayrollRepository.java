package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayrollRepository extends JpaRepository<Payroll, UUID> {

    /**
     * Find all payrolls with a specific status
     */
    List<Payroll> findByStatus(PayrollStatus status);

    /**
     * Find the most recent payroll by end date (for continuity check)
     */
    Optional<Payroll> findFirstByOrderByEndDateDesc();

    /**
     * Find last payroll by end date (excluding given payroll id)
     */
    @Query("SELECT p FROM Payroll p WHERE p.id != :excludeId ORDER BY p.endDate DESC")
    Optional<Payroll> findLastPayrollExcluding(@Param("excludeId") UUID excludeId);

    /**
     * Check if payroll exists for a date range (overlapping periods)
     */
    @Query("SELECT COUNT(p) > 0 FROM Payroll p WHERE " +
           "(p.startDate <= :endDate AND p.endDate >= :startDate)")
    boolean existsByDateRange(@Param("startDate") java.time.LocalDate startDate,
                              @Param("endDate") java.time.LocalDate endDate);

    /**
     * Get all payrolls ordered by end date descending (most recent first)
     */
    List<Payroll> findAllByOrderByEndDateDesc();

    /**
     * Find payrolls in date range
     */
    @Query("SELECT p FROM Payroll p WHERE p.startDate >= :startDate AND p.endDate <= :endDate ORDER BY p.startDate")
    List<Payroll> findPayrollsInDateRange(@Param("startDate") java.time.LocalDate startDate,
                                          @Param("endDate") java.time.LocalDate endDate);

    /**
     * Find payroll by exact date range
     */
    Optional<Payroll> findByStartDateAndEndDate(java.time.LocalDate startDate, java.time.LocalDate endDate);

    /**
     * Get the max payroll number sequence for a given year (format: PRL-YYYY-NNNNNN)
     */
    @Query("SELECT MAX(CAST(SUBSTRING(p.payrollNumber, LENGTH(:prefix) + 1) AS int)) " +
            "FROM Payroll p WHERE p.payrollNumber LIKE CONCAT(:prefix, '%')")
    Integer getMaxPayrollSequenceForYear(@Param("prefix") String prefix);



}