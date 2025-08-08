
// AttendanceRepositoryForPayroll.java
package com.example.backend.repositories.payroll;

import com.example.backend.models.hr.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceRepositoryForPayroll extends JpaRepository<Attendance, UUID> {

    // Find attendance records by employee and date range
    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<Attendance> findByEmployeeIdAndDateBetweenOrderByDateDesc(
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Find attendance records by employee for a specific month
    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND YEAR(a.date) = :year AND MONTH(a.date) = :month " +
            "ORDER BY a.date")
    List<Attendance> findByEmployeeAndMonth(@Param("employeeId") UUID employeeId,
                                            @Param("year") int year,
                                            @Param("month") int month);

    // Count days worked in period (considering your attendance status enum)
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND a.date BETWEEN :startDate AND :endDate " +
            "AND a.status IN ('PRESENT', 'LATE', 'HALF_DAY', 'EARLY_OUT')")
    Long countDaysWorkedInPeriod(@Param("employeeId") UUID employeeId,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);

    // Count days absent in period
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND a.date BETWEEN :startDate AND :endDate " +
            "AND a.status = 'ABSENT'")
    Long countDaysAbsentInPeriod(@Param("employeeId") UUID employeeId,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);

    // Count late days in period
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND a.date BETWEEN :startDate AND :endDate " +
            "AND a.status = 'LATE'")
    Long countLateDaysInPeriod(@Param("employeeId") UUID employeeId,
                               @Param("startDate") LocalDate startDate,
                               @Param("endDate") LocalDate endDate);

    // Sum overtime hours in period (using your overtimeHours field)
    @Query("SELECT COALESCE(SUM(a.overtimeHours), 0) FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND a.date BETWEEN :startDate AND :endDate")
    BigDecimal sumOvertimeHoursInPeriod(@Param("employeeId") UUID employeeId,
                                        @Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate);

    // Sum total hours worked in period (using your hoursWorked field)
    @Query("SELECT COALESCE(SUM(a.hoursWorked), 0) FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND a.date BETWEEN :startDate AND :endDate")
    BigDecimal sumTotalHoursInPeriod(@Param("employeeId") UUID employeeId,
                                     @Param("startDate") LocalDate startDate,
                                     @Param("endDate") LocalDate endDate);

    // Count working days only (excluding weekends and holidays)
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId " +
            "AND a.date BETWEEN :startDate AND :endDate " +
            "AND a.dayType = 'WORKING_DAY'")
    Long countWorkingDaysInPeriod(@Param("employeeId") UUID employeeId,
                                  @Param("startDate") LocalDate startDate,
                                  @Param("endDate") LocalDate endDate);
}