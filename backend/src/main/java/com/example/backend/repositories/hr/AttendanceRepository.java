package com.example.backend.repositories.hr;

import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    // Find attendance by employee and date
    Optional<Attendance> findByEmployeeAndDate(Employee employee, LocalDate date);

    // Find all attendance records for a specific date
    List<Attendance> findByDate(LocalDate date);

    // Find attendance by employee ID and date
    Optional<Attendance> findByEmployeeIdAndDate(UUID employeeId, LocalDate date);

    // Find all attendance records for employees at a specific site on a specific date
    @Query("SELECT a FROM Attendance a JOIN a.employee e WHERE e.site.id = :siteId AND a.date = :date")
    List<Attendance> findBySiteIdAndDate(@Param("siteId") UUID siteId, @Param("date") LocalDate date);

    // Find attendance records for an employee within a date range
    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<Attendance> findByEmployeeIdAndDateRange(
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Find attendance records for a site within a date range
    @Query("SELECT a FROM Attendance a JOIN a.employee e WHERE e.site.id = :siteId AND a.date BETWEEN :startDate AND :endDate")
    List<Attendance> findBySiteIdAndDateRange(
            @Param("siteId") UUID siteId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Count present employees by site and date
    @Query("SELECT COUNT(a) FROM Attendance a JOIN a.employee e WHERE e.site.id = :siteId AND a.date = :date AND a.status = 'PRESENT'")
    long countPresentBySiteIdAndDate(@Param("siteId") UUID siteId, @Param("date") LocalDate date);

    // Count present employees by site and date range
    @Query("SELECT COUNT(DISTINCT a.employee) FROM Attendance a JOIN a.employee e WHERE e.site.id = :siteId AND a.date BETWEEN :startDate AND :endDate AND a.status = 'PRESENT'")
    long countPresentBySiteIdAndDateRange(
            @Param("siteId") UUID siteId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Get attendance summary by contract type for a specific date and site
    @Query("SELECT e.jobPosition.contractType as contractType, " +
            "COUNT(DISTINCT e.id) as totalEmployees, " +
            "COUNT(DISTINCT CASE WHEN a.status = 'PRESENT' THEN a.employee.id END) as presentCount, " +
            "SUM(CASE WHEN a.hoursWorked IS NOT NULL THEN a.hoursWorked ELSE 0 END) as totalHours " +
            "FROM Employee e " +
            "LEFT JOIN Attendance a ON e.id = a.employee.id AND a.date = :date " +
            "WHERE e.site.id = :siteId " +
            "GROUP BY e.jobPosition.contractType")
    List<Object[]> getAttendanceSummaryBySiteAndDate(@Param("siteId") UUID siteId, @Param("date") LocalDate date);

    // Find all attendance for an employee in a specific month
    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND YEAR(a.date) = :year AND MONTH(a.date) = :month ORDER BY a.date")
    List<Attendance> findByEmployeeIdAndMonth(
            @Param("employeeId") UUID employeeId,
            @Param("year") int year,
            @Param("month") int month
    );

    // Check if attendance exists for multiple employees on a date
    @Query("SELECT e.id FROM Employee e WHERE e.id IN :employeeIds AND EXISTS (SELECT a FROM Attendance a WHERE a.employee = e AND a.date = :date)")
    List<UUID> findEmployeesWithAttendanceOnDate(@Param("employeeIds") List<UUID> employeeIds, @Param("date") LocalDate date);

    // Delete attendance by employee and date (for updates)
    void deleteByEmployeeIdAndDate(UUID employeeId, LocalDate date);

    // Bulk operations support
    @Query("SELECT a FROM Attendance a WHERE a.employee.id IN :employeeIds AND a.date = :date")
    List<Attendance> findByEmployeeIdsAndDate(@Param("employeeIds") List<UUID> employeeIds, @Param("date") LocalDate date);
}