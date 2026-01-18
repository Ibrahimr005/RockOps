package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.PayrollPublicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayrollPublicHolidayRepository extends JpaRepository<PayrollPublicHoliday, UUID> {

    /**
     * Find all public holidays for a payroll
     */
    List<PayrollPublicHoliday> findByPayrollId(UUID payrollId);

    /**
     * Find confirmed public holidays for a payroll
     */
    List<PayrollPublicHoliday> findByPayrollIdAndIsConfirmed(UUID payrollId, Boolean confirmed);

    /**
     * Find public holidays ordered by start date (UPDATED for date ranges)
     */
    List<PayrollPublicHoliday> findByPayrollIdOrderByStartDateAsc(UUID payrollId);

    /**
     * Find public holiday by payroll and exact start date
     */
    Optional<PayrollPublicHoliday> findByPayrollIdAndStartDate(UUID payrollId, LocalDate startDate);

    /**
     * Check if a specific date falls within any holiday range for a payroll
     * Handles both single-day and multi-day holidays
     */
    @Query("SELECT CASE WHEN COUNT(ph) > 0 THEN true ELSE false END " +
            "FROM PayrollPublicHoliday ph " +
            "WHERE ph.payroll.id = :payrollId " +
            "AND ph.startDate <= :date " +
            "AND (ph.endDate IS NULL AND ph.startDate = :date " +
            "     OR ph.endDate IS NOT NULL AND ph.endDate >= :date)")
    boolean existsHolidayOnDate(@Param("payrollId") UUID payrollId,
                                @Param("date") LocalDate date);

    /**
     * Find all holidays that include a specific date (within their range)
     * Returns holidays where date falls between startDate and endDate
     */
    @Query("SELECT ph FROM PayrollPublicHoliday ph " +
            "WHERE ph.payroll.id = :payrollId " +
            "AND ph.startDate <= :date " +
            "AND (ph.endDate IS NULL AND ph.startDate = :date " +
            "     OR ph.endDate IS NOT NULL AND ph.endDate >= :date)")
    List<PayrollPublicHoliday> findHolidaysContainingDate(
            @Param("payrollId") UUID payrollId,
            @Param("date") LocalDate date
    );

    /**
     * Count public holidays in a payroll
     */
    long countByPayrollId(UUID payrollId);

    /**
     * Count confirmed public holidays
     */
    long countByPayrollIdAndIsConfirmed(UUID payrollId, Boolean confirmed);

    /**
     * Find holidays that overlap with a date range (UPDATED)
     * Returns holidays where any day falls within the specified range
     * Handles both single-day and multi-day holidays
     */
    @Query("SELECT ph FROM PayrollPublicHoliday ph " +
            "WHERE ph.payroll.id = :payrollId " +
            "AND ph.startDate <= :endDate " +
            "AND (ph.endDate IS NULL AND ph.startDate >= :startDate " +
            "     OR ph.endDate IS NOT NULL AND ph.endDate >= :startDate) " +
            "ORDER BY ph.startDate ASC")
    List<PayrollPublicHoliday> findHolidaysOverlappingDateRange(
            @Param("payrollId") UUID payrollId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Find holidays that start within a date range
     */
    @Query("SELECT ph FROM PayrollPublicHoliday ph " +
            "WHERE ph.payroll.id = :payrollId " +
            "AND ph.startDate BETWEEN :startDate AND :endDate " +
            "ORDER BY ph.startDate ASC")
    List<PayrollPublicHoliday> findHolidaysStartingInRange(
            @Param("payrollId") UUID payrollId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Count total holiday days in a payroll period
     * Calculates the sum of all holiday durations in Java to avoid non-standard JPQL DATEDIFF functions.
     */
    default long countTotalHolidayDays(UUID payrollId) {
        List<PayrollPublicHoliday> holidays = findByPayrollId(payrollId);
        return holidays.stream()
                .mapToLong(ph -> {
                    if (ph.getEndDate() == null) {
                        return 1;
                    }
                    // ChronoUnit.DAYS.between excludes the end date, so we add 1 to make it inclusive
                    return ChronoUnit.DAYS.between(ph.getStartDate(), ph.getEndDate()) + 1;
                })
                .sum();
    }

    /**
     * Find paid holidays only
     */
    List<PayrollPublicHoliday> findByPayrollIdAndIsPaid(UUID payrollId, Boolean isPaid);

    /**
     * Count paid holidays
     */
    long countByPayrollIdAndIsPaid(UUID payrollId, Boolean isPaid);

    /**
     * Delete all holidays for a payroll
     */
    void deleteByPayrollId(UUID payrollId);

}