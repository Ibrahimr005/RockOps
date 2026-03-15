package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.AttendanceImportSummaryDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollAttendanceSnapshotRepository;
import com.example.backend.repositories.payroll.PayrollPublicHolidayRepository;
import com.example.backend.repositories.payroll.PayrollRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollSnapshotServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @Mock
    private PayrollAttendanceSnapshotRepository snapshotRepository;

    @Mock
    private PayrollPublicHolidayRepository publicHolidayRepository;

    @Mock
    private PayrollRepository payrollRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @Mock
    private PayrollCalculationEngine calculationEngine;

    @InjectMocks
    private PayrollSnapshotService payrollSnapshotService;

    private Payroll payroll;
    private UUID payrollId;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        payroll = new Payroll();
        payroll.setId(payrollId);
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 31));
        payroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);
        payroll.setAttendanceImported(false);
        payroll.setAttendanceFinalized(false);
        payroll.setAttendanceImportCount(0);
    }

    private Employee buildEmployee(String firstName, String lastName,
                                    JobPosition.ContractType contractType, BigDecimal salary) {
        Employee emp = new Employee();
        emp.setId(UUID.randomUUID());
        emp.setFirstName(firstName);
        emp.setLastName(lastName);

        JobPosition jp = new JobPosition();
        jp.setId(UUID.randomUUID());
        jp.setPositionName("Developer");
        jp.setContractType(contractType);
        jp.setDailyRate(contractType == JobPosition.ContractType.DAILY ? 200.0 : null);
        jp.setHourlyRate(contractType == JobPosition.ContractType.HOURLY ? 50.0 : null);
        emp.setJobPosition(jp);

        PaymentType pt = new PaymentType();
        pt.setId(UUID.randomUUID());
        pt.setCode("BANK");
        pt.setName("Bank Transfer");
        emp.setPaymentType(pt);

        if (contractType == JobPosition.ContractType.MONTHLY) {
            emp.setBaseSalaryOverride(salary);
        }

        return emp;
    }

    private Attendance buildAttendance(UUID employeeId, LocalDate date) {
        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setDate(date);
        att.setStatus(Attendance.AttendanceStatus.PRESENT);
        att.setDayType(Attendance.DayType.WORKING_DAY);
        att.setHoursWorked(8.0);
        att.setOvertimeHours(0.0);
        att.setCheckIn(LocalTime.of(9, 0));
        att.setCheckOut(LocalTime.of(17, 0));
        return att;
    }

    private PayrollPublicHoliday buildHoliday(LocalDate date, boolean isPaid, String name) {
        PayrollPublicHoliday holiday = new PayrollPublicHoliday();
        holiday.setId(UUID.randomUUID());
        holiday.setStartDate(date);
        holiday.setEndDate(date);
        holiday.setHolidayName(name);
        holiday.setIsPaid(isPaid);
        holiday.setIsConfirmed(true);
        holiday.setPayroll(payroll);
        return holiday;
    }

    // ==================== importAttendanceWithUpsert ====================

    @Test
    void importAttendanceWithUpsert_finalizedAttendance_throwsIllegalState() {
        payroll.setAttendanceFinalized(true);

        assertThrows(IllegalStateException.class,
                () -> payrollSnapshotService.importAttendanceWithUpsert(payroll));
    }

    @Test
    void importAttendanceWithUpsert_noActiveEmployees_returnsSuccessWithZeros() {
        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(Collections.emptyList());
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(Collections.emptyList());

        AttendanceImportSummaryDTO result = payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(0, result.getTotalEmployees());
        assertEquals(0, result.getEmployeePayrollsCreated());
        verify(payrollRepository).save(payroll);
        assertTrue(payroll.getAttendanceImported());
    }

    @Test
    void importAttendanceWithUpsert_newEmployee_createsNewRecord() {
        Employee emp = buildEmployee("Alice", "Smith", JobPosition.ContractType.MONTHLY, new BigDecimal("5000"));

        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(List.of(emp));
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, emp.getId()))
                .thenReturn(Optional.empty());
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("EPRL-2026-000001");
        when(attendanceRepository.findByEmployeeIdAndDateBetween(eq(emp.getId()), any(), any()))
                .thenReturn(Collections.emptyList());

        AttendanceImportSummaryDTO result = payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertEquals(1, result.getEmployeePayrollsCreated());
        assertEquals(0, result.getEmployeePayrollsUpdated());
    }

    @Test
    void importAttendanceWithUpsert_existingEmployee_updatesRecord() {
        Employee emp = buildEmployee("Bob", "Jones", JobPosition.ContractType.MONTHLY, new BigDecimal("6000"));

        EmployeePayroll existing = new EmployeePayroll();
        existing.setId(UUID.randomUUID());
        existing.setEmployeeId(emp.getId());
        existing.setEmployeeName("Bob Jones");
        existing.setPayroll(payroll);
        existing.setAttendanceSnapshots(new ArrayList<>());
        existing.setDeductions(new ArrayList<>());
        existing.setContractType(JobPosition.ContractType.MONTHLY);
        existing.setGrossPay(BigDecimal.ZERO);
        existing.setTotalDeductions(BigDecimal.ZERO);
        existing.setNetPay(BigDecimal.ZERO);

        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(List.of(emp));
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, emp.getId()))
                .thenReturn(Optional.of(existing));
        doNothing().when(snapshotRepository).deleteByEmployeePayrollId(existing.getId());
        when(attendanceRepository.findByEmployeeIdAndDateBetween(eq(emp.getId()), any(), any()))
                .thenReturn(Collections.emptyList());

        AttendanceImportSummaryDTO result = payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertEquals(0, result.getEmployeePayrollsCreated());
        assertEquals(1, result.getEmployeePayrollsUpdated());
        assertTrue(result.getIsReImport());
    }

    @Test
    void importAttendanceWithUpsert_withAttendanceRecords_createsSnapshots() {
        Employee emp = buildEmployee("Carol", "White", JobPosition.ContractType.MONTHLY, new BigDecimal("5000"));

        Attendance att1 = buildAttendance(emp.getId(), LocalDate.of(2026, 1, 5));
        Attendance att2 = buildAttendance(emp.getId(), LocalDate.of(2026, 1, 6));

        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(List.of(emp));
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, emp.getId()))
                .thenReturn(Optional.empty());
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("EPRL-2026-000001");
        when(attendanceRepository.findByEmployeeIdAndDateBetween(eq(emp.getId()), any(), any()))
                .thenReturn(List.of(att1, att2));

        AttendanceImportSummaryDTO result = payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertEquals(2, result.getAttendanceSnapshotsCreated());
        verify(calculationEngine).calculateEmployeePayroll(any(EmployeePayroll.class));
    }

    @Test
    void importAttendanceWithUpsert_withPublicHoliday_countsInSummary() {
        Employee emp = buildEmployee("Dave", "Brown", JobPosition.ContractType.MONTHLY, new BigDecimal("5000"));

        PayrollPublicHoliday holiday = buildHoliday(LocalDate.of(2026, 1, 1), true, "New Year");

        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(List.of(emp));
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(List.of(holiday));
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, emp.getId()))
                .thenReturn(Optional.empty());
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("EPRL-2026-000001");
        when(attendanceRepository.findByEmployeeIdAndDateBetween(eq(emp.getId()), any(), any()))
                .thenReturn(Collections.emptyList());

        AttendanceImportSummaryDTO result = payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertEquals(1, result.getPublicHolidaysCount());
    }

    @Test
    void importAttendanceWithUpsert_employeeProcessingFails_addsErrorIssue() {
        Employee empWithNoJobPosition = new Employee();
        empWithNoJobPosition.setId(UUID.randomUUID());
        empWithNoJobPosition.setFirstName("Broken");
        empWithNoJobPosition.setLastName("Employee");
        empWithNoJobPosition.setJobPosition(null); // Will cause NPE

        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(List.of(empWithNoJobPosition));
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(any(), any()))
                .thenReturn(Optional.empty());

        AttendanceImportSummaryDTO result = payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertTrue(result.getIssues().stream()
                .anyMatch(i -> "ERROR".equals(i.getSeverity()) && "PROCESSING_ERROR".equals(i.getIssueType())));
        assertEquals("PARTIAL_FAILURE", result.getStatus());
    }

    @Test
    void importAttendanceWithUpsert_marksPaylrollAsImported() {
        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(Collections.emptyList());
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(Collections.emptyList());

        payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertTrue(payroll.getAttendanceImported());
        assertEquals(1, payroll.getAttendanceImportCount());
    }

    @Test
    void importAttendanceWithUpsert_monthlyDailyHourlyCounts_trackedInBreakdown() {
        Employee monthly = buildEmployee("M", "User", JobPosition.ContractType.MONTHLY, new BigDecimal("5000"));
        Employee daily = buildEmployee("D", "User", JobPosition.ContractType.DAILY, null);
        Employee hourly = buildEmployee("H", "User", JobPosition.ContractType.HOURLY, null);

        when(employeeRepository.findByStatus("ACTIVE")).thenReturn(List.of(monthly, daily, hourly));
        when(publicHolidayRepository.findByPayrollIdOrderByStartDateAsc(payrollId))
                .thenReturn(Collections.emptyList());

        // All are new employees
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(any(), any()))
                .thenReturn(Optional.empty());
        when(entityIdGeneratorService.generateNextId(any()))
                .thenReturn("EPRL-001", "EPRL-002", "EPRL-003");
        when(attendanceRepository.findByEmployeeIdAndDateBetween(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        AttendanceImportSummaryDTO result = payrollSnapshotService.importAttendanceWithUpsert(payroll);

        assertNotNull(result.getBreakdown());
        assertEquals(1, result.getBreakdown().getMonthlyEmployees());
        assertEquals(1, result.getBreakdown().getDailyEmployees());
        assertEquals(1, result.getBreakdown().getHourlyEmployees());
    }

    // ==================== createEmployeePayrollSnapshot ====================

    @Test
    void createEmployeePayrollSnapshot_monthly_setsCorrectFields() {
        Employee emp = buildEmployee("Test", "Monthly", JobPosition.ContractType.MONTHLY, new BigDecimal("7000"));
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("EPRL-2026-000001");

        EmployeePayroll result = payrollSnapshotService.createEmployeePayrollSnapshot(payroll, emp);

        assertNotNull(result);
        assertEquals(emp.getId(), result.getEmployeeId());
        assertEquals("Test Monthly", result.getEmployeeName());
        assertEquals(JobPosition.ContractType.MONTHLY, result.getContractType());
        assertEquals(new BigDecimal("7000"), result.getMonthlyBaseSalary());
        assertEquals(payroll, result.getPayroll());
    }

    @Test
    void createEmployeePayrollSnapshot_daily_setsDailyRate() {
        Employee emp = buildEmployee("Test", "Daily", JobPosition.ContractType.DAILY, null);
        emp.getJobPosition().setDailyRate(200.0);
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("EPRL-2026-000002");

        EmployeePayroll result = payrollSnapshotService.createEmployeePayrollSnapshot(payroll, emp);

        assertEquals(new BigDecimal("200.0"), result.getDailyRate());
        assertEquals(JobPosition.ContractType.DAILY, result.getContractType());
    }

    @Test
    void createEmployeePayrollSnapshot_hourly_setsHourlyRate() {
        Employee emp = buildEmployee("Test", "Hourly", JobPosition.ContractType.HOURLY, null);
        emp.getJobPosition().setHourlyRate(50.0);
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("EPRL-2026-000003");

        EmployeePayroll result = payrollSnapshotService.createEmployeePayrollSnapshot(payroll, emp);

        assertEquals(new BigDecimal("50.0"), result.getHourlyRate());
        assertEquals(JobPosition.ContractType.HOURLY, result.getContractType());
    }

    @Test
    void createEmployeePayrollSnapshot_noJobPosition_throwsIllegalState() {
        Employee emp = new Employee();
        emp.setId(UUID.randomUUID());
        emp.setFirstName("No");
        emp.setLastName("Job");
        emp.setJobPosition(null);

        assertThrows(IllegalStateException.class,
                () -> payrollSnapshotService.createEmployeePayrollSnapshot(payroll, emp));
    }

    @Test
    void createEmployeePayrollSnapshot_initializesZeroValues() {
        Employee emp = buildEmployee("Zero", "Init", JobPosition.ContractType.MONTHLY, new BigDecimal("5000"));
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("EPRL-2026-000001");

        EmployeePayroll result = payrollSnapshotService.createEmployeePayrollSnapshot(payroll, emp);

        assertEquals(BigDecimal.ZERO, result.getGrossPay());
        assertEquals(BigDecimal.ZERO, result.getTotalDeductions());
        assertEquals(BigDecimal.ZERO, result.getNetPay());
        assertEquals(BigDecimal.ZERO, result.getOvertimePay());
        assertEquals(BigDecimal.ZERO, result.getAbsenceDeductionAmount());
        assertEquals(BigDecimal.ZERO, result.getLateDeductionAmount());
        assertNotNull(result.getAttendanceSnapshots());
        assertTrue(result.getAttendanceSnapshots().isEmpty());
        assertNotNull(result.getDeductions());
    }

    // ==================== createAttendanceSnapshot ====================

    @Test
    void createAttendanceSnapshot_presentDay_setsCorrectStatus() {
        Employee emp = buildEmployee("Test", "User", JobPosition.ContractType.MONTHLY, new BigDecimal("5000"));
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setPayroll(payroll);

        Attendance att = buildAttendance(emp.getId(), LocalDate.of(2026, 1, 5));
        att.setCheckIn(LocalTime.of(9, 0)); // On time - exactly at expected start
        att.setStatus(Attendance.AttendanceStatus.PRESENT);

        PayrollAttendanceSnapshot result = payrollSnapshotService.createAttendanceSnapshot(
                ep, att, Collections.emptyList());

        assertNotNull(result);
        assertEquals(LocalDate.of(2026, 1, 5), result.getAttendanceDate());
        assertEquals(Attendance.AttendanceStatus.PRESENT, result.getStatus());
    }

    @Test
    void createAttendanceSnapshot_publicHoliday_setsHolidayFlags() {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setPayroll(payroll);

        Attendance att = buildAttendance(UUID.randomUUID(), LocalDate.of(2026, 1, 1));

        PayrollPublicHoliday holiday = buildHoliday(LocalDate.of(2026, 1, 1), true, "New Year");

        PayrollAttendanceSnapshot result = payrollSnapshotService.createAttendanceSnapshot(
                ep, att, List.of(holiday));

        assertTrue(result.getIsPublicHoliday());
        assertTrue(result.getPublicHolidayPaid());
        assertEquals("New Year", result.getPublicHolidayName());
    }

    @Test
    void createAttendanceSnapshot_unpaidHoliday_setsUnpaidFlag() {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setPayroll(payroll);

        Attendance att = buildAttendance(UUID.randomUUID(), LocalDate.of(2026, 1, 2));

        PayrollPublicHoliday unpaid = buildHoliday(LocalDate.of(2026, 1, 2), false, "Unpaid Holiday");

        PayrollAttendanceSnapshot result = payrollSnapshotService.createAttendanceSnapshot(
                ep, att, List.of(unpaid));

        assertTrue(result.getIsPublicHoliday());
        assertFalse(result.getPublicHolidayPaid());
    }

    @Test
    void createAttendanceSnapshot_weekendDay_setsWeekendFlag() {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setPayroll(payroll);

        // Jan 3, 2026 is a Saturday
        Attendance att = buildAttendance(UUID.randomUUID(), LocalDate.of(2026, 1, 3));

        PayrollAttendanceSnapshot result = payrollSnapshotService.createAttendanceSnapshot(
                ep, att, Collections.emptyList());

        assertTrue(result.getIsWeekend());
    }

    @Test
    void createAttendanceSnapshot_lateEmployee_calculatesLateMinutes() {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setLateForgivenessMinutes(0); // No grace period
        ep.setPayroll(payroll);

        Attendance att = buildAttendance(UUID.randomUUID(), LocalDate.of(2026, 1, 5));
        att.setCheckIn(LocalTime.of(9, 30)); // 30 minutes late
        att.setStatus(Attendance.AttendanceStatus.LATE);

        PayrollAttendanceSnapshot result = payrollSnapshotService.createAttendanceSnapshot(
                ep, att, Collections.emptyList());

        assertNotNull(result.getLateMinutes());
        assertEquals(30, result.getLateMinutes());
    }

    @Test
    void createAttendanceSnapshot_withOvertimeHours_setsOvertimeOnSnapshot() {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setPayroll(payroll);

        Attendance att = buildAttendance(UUID.randomUUID(), LocalDate.of(2026, 1, 5));
        att.setOvertimeHours(2.5);
        att.setHoursWorked(10.5);

        PayrollAttendanceSnapshot result = payrollSnapshotService.createAttendanceSnapshot(
                ep, att, Collections.emptyList());

        assertEquals(new BigDecimal("2.5"), result.getOvertimeHours());
    }
}