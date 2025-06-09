package com.example.backend.repositories.hr;

import com.example.backend.models.hr.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    List<Attendance> findByEmployeeId(UUID employeeId);

    List<Attendance> findByEmployeeIdAndDateBetween(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND EXTRACT(YEAR FROM a.date) = :year AND EXTRACT(MONTH FROM a.date) = :month")
    List<Attendance> findByEmployeeIdAndYearAndMonth(UUID employeeId, int year, int month);

    List<Attendance> findByDateAndEmployeeIdIn(LocalDate date, List<UUID> employeeIds);

    Optional<Attendance> findByEmployeeIdAndDate(UUID id, LocalDate date);

    // New methods based on service usage
    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND a.date = :date AND a.contractType = 'HOURLY'")
    Optional<Attendance> findHourlyAttendanceByEmployeeIdAndDate(UUID employeeId, LocalDate date);

    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND a.date = :date AND a.contractType = 'DAILY'")
    Optional<Attendance> findDailyAttendanceByEmployeeIdAndDate(UUID employeeId, LocalDate date);

    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND a.date = :date AND a.contractType = 'MONTHLY'")
    Optional<Attendance> findMonthlyAttendanceByEmployeeIdAndDate(UUID employeeId, LocalDate date);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.isLate = true")
    long countLateDaysByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT SUM(a.hoursWorked) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate")
    Double sumHoursWorkedByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT SUM(a.overtimeHours) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate")
    Double sumOvertimeHoursByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT SUM(a.dailyEarnings) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate")
    Double sumDailyEarningsByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.status = 'PRESENT'")
    long countPresentDaysByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.dailyStatus = 'PRESENT'")
    long countDailyPresentDaysByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.status = 'ON_LEAVE'")
    long countLeaveDaysByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.dailyStatus = 'LEAVE'")
    long countDailyLeaveDaysByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.status = 'ABSENT'")
    long countAbsentDaysByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.dailyStatus = 'ABSENT'")
    long countDailyAbsentDaysByEmployeeIdAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<Attendance> findAttendanceByEmployeeIdAndDateRangeOrderByDateDesc(UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT a FROM Attendance a WHERE a.date = :date AND a.contractType = :contractType")
    List<Attendance> findByDateAndContractType(LocalDate date, Attendance.ContractType contractType);

    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate AND a.contractType = :contractType")
    List<Attendance> findByEmployeeIdAndDateRangeAndContractType(UUID employeeId, LocalDate startDate, LocalDate endDate, Attendance.ContractType contractType);
}