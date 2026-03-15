package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.OvertimeRecordDTO;
import com.example.backend.dto.payroll.OvertimeReviewSummaryDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollStatus;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OvertimeReviewServiceTest {

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @InjectMocks
    private OvertimeReviewService overtimeReviewService;

    private Payroll payroll;
    private UUID payrollId;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        payroll = new Payroll();
        payroll.setId(payrollId);
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 31));
        payroll.setStatus(PayrollStatus.OVERTIME_REVIEW);
    }

    private EmployeePayroll buildEmployeePayroll(String name, BigDecimal hourlySalary) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(UUID.randomUUID());
        ep.setEmployeeName(name);
        ep.setMonthlyBaseSalary(hourlySalary);
        ep.setPayroll(payroll);
        return ep;
    }

    private Attendance buildAttendance(UUID employeeId, LocalDate date, Double overtimeHours) {
        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        Employee emp = new Employee();
        emp.setId(employeeId);
        emp.setFirstName("Test");
        emp.setLastName("Emp");
        att.setEmployee(emp);
        att.setDate(date);
        att.setOvertimeHours(overtimeHours);
        att.setHoursWorked(8.0 + (overtimeHours != null ? overtimeHours : 0));
        att.setStatus(Attendance.AttendanceStatus.PRESENT);
        return att;
    }

    // ==================== processOvertimeReview ====================

    @Test
    void processOvertimeReview_noEmployees_returnsSuccessWithZeros() {
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(0, result.getTotalRecords());
        assertEquals(0.0, result.getTotalOvertimeHours());
        assertEquals(0, result.getEmployeesWithOvertime());
        assertEquals(BigDecimal.ZERO, result.getTotalOvertimePay());
    }

    @Test
    void processOvertimeReview_marksOvertimeProcessed() {
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        overtimeReviewService.processOvertimeReview(payroll);

        assertTrue(payroll.getOvertimeProcessed());
        assertNotNull(payroll.getOvertimeSummary());
    }

    @Test
    void processOvertimeReview_employeeWithNoOvertime_notCounted() {
        EmployeePayroll ep = buildEmployeePayroll("Alice", new BigDecimal("8000"));

        Attendance noOT = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 5), 0.0);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any())).thenReturn(List.of(noOT));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        assertEquals(0, result.getEmployeesWithOvertime());
        assertEquals(0, result.getTotalRecords());
    }

    @Test
    void processOvertimeReview_employeeWithOvertime_calculatesPayCorrectly() {
        EmployeePayroll ep = buildEmployeePayroll("Bob", new BigDecimal("8000"));

        // Monthly salary 8000, hourly = 8000/160 = 50. OT pay = 50 * 1.5 * 4 = 300
        Attendance att = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 5), 4.0);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any())).thenReturn(List.of(att));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        assertEquals(1, result.getEmployeesWithOvertime());
        assertEquals(1, result.getTotalRecords());
        assertEquals(4.0, result.getTotalOvertimeHours());
        assertEquals(new BigDecimal("300.00"), result.getTotalOvertimePay());
        verify(employeePayrollRepository).save(ep);
    }

    @Test
    void processOvertimeReview_employeeWithHourlyRate_usesHourlyRateDirectly() {
        EmployeePayroll ep = buildEmployeePayroll("Carol", null);
        ep.setHourlyRate(new BigDecimal("50"));

        // OT pay = 50 * 1.5 * 2 = 150
        Attendance att = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 5), 2.0);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any())).thenReturn(List.of(att));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        assertEquals(new BigDecimal("150.00"), result.getTotalOvertimePay());
    }

    @Test
    void processOvertimeReview_noSalaryData_skipsPayCalculation() {
        EmployeePayroll ep = buildEmployeePayroll("Dave", null); // no monthly or hourly
        ep.setHourlyRate(null);
        ep.setMonthlyBaseSalary(null);

        Attendance att = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 5), 3.0);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any())).thenReturn(List.of(att));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        // Employee has overtime hours but no salary -> skipped
        assertEquals(1, result.getEmployeesWithOvertime());
        assertEquals(BigDecimal.ZERO, result.getTotalOvertimePay());
        verify(employeePayrollRepository, never()).save(any());
    }

    @Test
    void processOvertimeReview_excessiveOvertime_addsWarningIssue() {
        EmployeePayroll ep = buildEmployeePayroll("Eve", new BigDecimal("8000"));

        // 41 hours overtime > 40 threshold
        Attendance att = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 5), 41.0);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any())).thenReturn(List.of(att));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        assertFalse(result.getIssues().isEmpty());
        assertTrue(result.getIssues().stream()
                .anyMatch(i -> "WARNING".equals(i.getSeverity()) && "EXCESSIVE_HOURS".equals(i.getIssueType())));
        assertEquals("SUCCESS_WITH_WARNINGS", result.getStatus());
    }

    @Test
    void processOvertimeReview_criticalExcessiveOvertime_addsErrorIssue() {
        EmployeePayroll ep = buildEmployeePayroll("Frank", new BigDecimal("8000"));

        // 61 hours overtime > 60 critical threshold
        Attendance att = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 5), 61.0);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any())).thenReturn(List.of(att));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        // Should have both WARNING and ERROR issues (41>40 AND 61>60)
        assertTrue(result.getIssues().stream()
                .anyMatch(i -> "ERROR".equals(i.getSeverity()) && "CRITICAL_EXCESSIVE_HOURS".equals(i.getIssueType())));
    }

    @Test
    void processOvertimeReview_attendanceFetchThrows_addsProcessingErrorIssue() {
        EmployeePayroll ep = buildEmployeePayroll("Grace", new BigDecimal("5000"));

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any()))
                .thenThrow(new RuntimeException("DB failure"));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        assertTrue(result.getIssues().stream()
                .anyMatch(i -> "PROCESSING_ERROR".equals(i.getIssueType())));
    }

    @Test
    void processOvertimeReview_multipleAttendanceRecords_sumsHoursCorrectly() {
        EmployeePayroll ep = buildEmployeePayroll("Henry", new BigDecimal("8000"));

        Attendance att1 = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 5), 2.0);
        Attendance att2 = buildAttendance(ep.getEmployeeId(), LocalDate.of(2026, 1, 6), 3.0);

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(ep.getEmployeeId()), any(), any())).thenReturn(List.of(att1, att2));

        OvertimeReviewSummaryDTO result = overtimeReviewService.processOvertimeReview(payroll);

        assertEquals(2, result.getTotalRecords());
        assertEquals(5.0, result.getTotalOvertimeHours());
    }

    // ==================== getOvertimeRecordsForPeriod ====================

    @Test
    void getOvertimeRecordsForPeriod_returnsRecordsWithCalculatedPay() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        UUID empId = UUID.randomUUID();
        Employee emp = new Employee();
        emp.setId(empId);
        emp.setFirstName("Test");
        emp.setLastName("Worker");

        JobPosition jp = new JobPosition();
        jp.setContractType(JobPosition.ContractType.MONTHLY);
        emp.setJobPosition(jp);

        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setEmployee(emp);
        att.setDate(LocalDate.of(2026, 1, 5));
        att.setOvertimeHours(4.0);
        att.setHoursWorked(12.0);
        att.setStatus(Attendance.AttendanceStatus.PRESENT);

        when(attendanceRepository.findByDateBetweenAndOvertimeHoursGreaterThan(start, end, 0.0))
                .thenReturn(List.of(att));

        List<OvertimeRecordDTO> result = overtimeReviewService.getOvertimeRecordsForPeriod(start, end);

        assertEquals(1, result.size());
        assertEquals(empId, result.get(0).getEmployeeId());
        assertEquals(4.0, result.get(0).getOvertimeHours());
        assertEquals(1.5, result.get(0).getOvertimeRate());
    }

    @Test
    void getOvertimeRecordsForPeriod_noRecords_returnsEmptyList() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        when(attendanceRepository.findByDateBetweenAndOvertimeHoursGreaterThan(start, end, 0.0))
                .thenReturn(Collections.emptyList());

        List<OvertimeRecordDTO> result = overtimeReviewService.getOvertimeRecordsForPeriod(start, end);

        assertTrue(result.isEmpty());
    }

    @Test
    void getOvertimeRecordsForPeriod_repositoryThrows_returnsEmptyList() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        when(attendanceRepository.findByDateBetweenAndOvertimeHoursGreaterThan(any(), any(), anyDouble()))
                .thenThrow(new RuntimeException("DB error"));

        List<OvertimeRecordDTO> result = overtimeReviewService.getOvertimeRecordsForPeriod(start, end);

        assertTrue(result.isEmpty());
    }

    @Test
    void getOvertimeRecordsForPeriod_hourlyContractType_usesDefaultRate() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        UUID empId = UUID.randomUUID();
        Employee emp = new Employee();
        emp.setId(empId);
        emp.setFirstName("Hourly");
        emp.setLastName("Worker");

        JobPosition jp = new JobPosition();
        jp.setContractType(JobPosition.ContractType.HOURLY);
        emp.setJobPosition(jp);

        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setEmployee(emp);
        att.setDate(LocalDate.of(2026, 1, 5));
        att.setOvertimeHours(3.0);
        att.setHoursWorked(11.0);
        att.setStatus(Attendance.AttendanceStatus.PRESENT);

        when(attendanceRepository.findByDateBetweenAndOvertimeHoursGreaterThan(start, end, 0.0))
                .thenReturn(List.of(att));

        List<OvertimeRecordDTO> result = overtimeReviewService.getOvertimeRecordsForPeriod(start, end);

        assertEquals(1, result.size());
        // Hourly rate = 50.0 (default), OT pay = 50 * 1.5 * 3 = 225
        assertEquals(new BigDecimal("225.00"), result.get(0).getOvertimePay());
    }
}