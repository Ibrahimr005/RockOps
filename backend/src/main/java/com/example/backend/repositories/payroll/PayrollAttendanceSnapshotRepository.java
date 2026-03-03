package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.PayrollAttendanceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PayrollAttendanceSnapshotRepository extends JpaRepository<PayrollAttendanceSnapshot, UUID> {

    /**
     * Find all attendance snapshots for an employee payroll
     */
    List<PayrollAttendanceSnapshot> findByEmployeePayrollId(UUID employeePayrollId);

    /**
     * Find attendance snapshots ordered by date
     */
    List<PayrollAttendanceSnapshot> findByEmployeePayrollIdOrderByAttendanceDateAsc(UUID employeePayrollId);

    /**
     * Find late attendance snapshots
     */
    @Query("SELECT pas FROM PayrollAttendanceSnapshot pas " +
            "WHERE pas.employeePayroll.id = :employeePayrollId " +
            "AND pas.lateMinutes > 0 " +
            "ORDER BY pas.attendanceDate ASC")
    List<PayrollAttendanceSnapshot> findLateSnapshotsByEmployeePayroll(@Param("employeePayrollId") UUID employeePayrollId);

    /**
     * Find forgiven late arrivals
     */
    List<PayrollAttendanceSnapshot> findByEmployeePayrollIdAndIsLateForgiven(UUID employeePayrollId, Boolean forgiven);

    /**
     * Find snapshots by date range
     */
    @Query("SELECT pas FROM PayrollAttendanceSnapshot pas " +
            "WHERE pas.employeePayroll.id = :employeePayrollId " +
            "AND pas.attendanceDate BETWEEN :startDate AND :endDate " +
            "ORDER BY pas.attendanceDate ASC")
    List<PayrollAttendanceSnapshot> findByEmployeePayrollAndDateRange(
            @Param("employeePayrollId") UUID employeePayrollId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Find public holiday snapshots
     */
    List<PayrollAttendanceSnapshot> findByEmployeePayrollIdAndIsPublicHoliday(UUID employeePayrollId, Boolean isPublicHoliday);

    /**
     * Count attendance snapshots for employee payroll
     */
    long countByEmployeePayrollId(UUID employeePayrollId);

    /**
     * Count late days for employee payroll
     */
    @Query("SELECT COUNT(pas) FROM PayrollAttendanceSnapshot pas " +
            "WHERE pas.employeePayroll.id = :employeePayrollId " +
            "AND pas.lateMinutes > 0")
    long countLateDays(@Param("employeePayrollId") UUID employeePayrollId);

    // ========================================
    // ⭐ NEW: DELETE METHODS FOR RE-IMPORT
    // ========================================

    /**
     * Delete all snapshots for an employee payroll
     * Used during re-import to clear old data
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM PayrollAttendanceSnapshot pas WHERE pas.employeePayroll.id = :employeePayrollId")
    void deleteByEmployeePayrollId(@Param("employeePayrollId") UUID employeePayrollId);

    /**
     * Delete all snapshots for a payroll
     * Used to completely reset attendance import
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM PayrollAttendanceSnapshot pas WHERE pas.employeePayroll.payroll.id = :payrollId")
    void deleteByPayrollId(@Param("payrollId") UUID payrollId);



    /**
     * Find snapshots for a specific employee payroll within date range


    /**
     * Delete all snapshots for a specific employee payroll (for re-processing)
     */

    /**
     * Find all PAID public holiday snapshots for an employee payroll
     */
    @Query("SELECT s FROM PayrollAttendanceSnapshot s " +
            "WHERE s.employeePayroll.id = :employeePayrollId " +
            "AND s.isPublicHoliday = TRUE " +
            "AND s.publicHolidayPaid = TRUE")
    List<PayrollAttendanceSnapshot> findPaidPublicHolidays(@Param("employeePayrollId") UUID employeePayrollId);

    /**
     * Find all UNPAID public holiday snapshots for an employee payroll
     */
    @Query("SELECT s FROM PayrollAttendanceSnapshot s " +
            "WHERE s.employeePayroll.id = :employeePayrollId " +
            "AND s.isPublicHoliday = TRUE " +
            "AND (s.publicHolidayPaid = FALSE OR s.publicHolidayPaid IS NULL)")
    List<PayrollAttendanceSnapshot> findUnpaidPublicHolidays(@Param("employeePayrollId") UUID employeePayrollId);

}