package com.example.backend.services.payroll;

import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.LeaveRequestRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollAttendanceSnapshotRepository;
import com.example.backend.repositories.payroll.PayrollPublicHolidayRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollIntegrationServiceTest {

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private PayrollPublicHolidayRepository publicHolidayRepository;

    @Mock
    private PayrollAttendanceSnapshotRepository snapshotRepository;

    @InjectMocks
    private PayrollIntegrationService payrollIntegrationService;

    private Payroll payroll;
    private UUID payrollId;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        payroll = new Payroll();
        payroll.setId(payrollId);
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 3)); // Small range for testing
        payroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);
    }

    private Employee buildEmployee(String firstName, String lastName) {
        Employee emp = new Employee();
        emp.setId(UUID.randomUUID());
        emp.setFirstName(firstName);
        emp.setLastName(lastName);

        JobPosition jp = new JobPosition();
        jp.setId(UUID.randomUUID());
        jp.setPositionName("Engineer");
        jp.setContractType(JobPosition.ContractType.MONTHLY);
        emp.setJobPosition(jp);

        return emp;
    }

    private EmployeePayroll buildEmployeePayroll(UUID employeeId, String name) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(employeeId);
        ep.setEmployeeName(name);
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setAttendanceSnapshots(new ArrayList<>());
        ep.setDeductions(new ArrayList<>());
        ep.setPayroll(payroll);
        return ep;
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

    // ==================== integrateAllDataIntoPayroll ====================

    @Test
    void integrateAllDataIntoPayroll_noEmployees_completesWithZeroSnapshots() {
        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> payrollIntegrationService.integrateAllDataIntoPayroll(payroll));

        verify(snapshotRepository, never()).saveAll(any());
    }

    @Test
    void integrateAllDataIntoPayroll_singleEmployeeNoAttendance_createsAbsentSnapshots() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Alice Smith");

        Employee emp = buildEmployee("Alice", "Smith");
        emp.setId(empId);

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());

        payrollIntegrationService.integrateAllDataIntoPayroll(payroll);

        // 3 days (Jan 1-3): snapshots created for each day
        verify(snapshotRepository).saveAll(argThat(list -> {
            List<?> snapList = (List<?>) list;
            return snapList.size() == 3;
        }));
        verify(employeePayrollRepository).save(ep);
    }

    @Test
    void integrateAllDataIntoPayroll_withPaidPublicHoliday_setsHolidayInfoOnSnapshot() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Bob Jones");

        Employee emp = buildEmployee("Bob", "Jones");
        emp.setId(empId);

        PayrollPublicHoliday paidHoliday = buildHoliday(LocalDate.of(2026, 1, 1), true, "New Year");

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(List.of(paidHoliday));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());

        payrollIntegrationService.integrateAllDataIntoPayroll(payroll);

        verify(snapshotRepository).saveAll(argThat(list -> {
            List<PayrollAttendanceSnapshot> snapshots = (List<PayrollAttendanceSnapshot>) list;
            return snapshots.stream().anyMatch(s ->
                    s.getAttendanceDate().equals(LocalDate.of(2026, 1, 1)) &&
                    Boolean.TRUE.equals(s.getIsPublicHoliday()) &&
                    Boolean.TRUE.equals(s.getPublicHolidayPaid()));
        }));
    }

    @Test
    void integrateAllDataIntoPayroll_withUnpaidPublicHoliday_setsHolidayInfoOnSnapshot() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Carol White");

        Employee emp = buildEmployee("Carol", "White");
        emp.setId(empId);

        PayrollPublicHoliday unpaidHoliday = buildHoliday(LocalDate.of(2026, 1, 2), false, "Unpaid Holiday");

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(List.of(unpaidHoliday));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());

        payrollIntegrationService.integrateAllDataIntoPayroll(payroll);

        verify(snapshotRepository).saveAll(argThat(list -> {
            List<PayrollAttendanceSnapshot> snapshots = (List<PayrollAttendanceSnapshot>) list;
            return snapshots.stream().anyMatch(s ->
                    s.getAttendanceDate().equals(LocalDate.of(2026, 1, 2)) &&
                    Boolean.TRUE.equals(s.getIsPublicHoliday()) &&
                    !Boolean.TRUE.equals(s.getPublicHolidayPaid()));
        }));
    }

    @Test
    void integrateAllDataIntoPayroll_withAttendance_setsAttendanceDataOnSnapshot() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Dave Brown");

        Employee emp = buildEmployee("Dave", "Brown");
        emp.setId(empId);

        Attendance att = new Attendance();
        att.setId(UUID.randomUUID());
        att.setDate(LocalDate.of(2026, 1, 2));
        att.setStatus(Attendance.AttendanceStatus.PRESENT);
        att.setDayType(Attendance.DayType.WORKING_DAY);
        att.setHoursWorked(8.0);
        att.setOvertimeHours(0.0);

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(List.of(att));
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());

        payrollIntegrationService.integrateAllDataIntoPayroll(payroll);

        verify(snapshotRepository).saveAll(argThat(list -> {
            List<PayrollAttendanceSnapshot> snapshots = (List<PayrollAttendanceSnapshot>) list;
            return snapshots.stream().anyMatch(s ->
                    s.getAttendanceDate().equals(LocalDate.of(2026, 1, 2)) &&
                    s.getStatus() == Attendance.AttendanceStatus.PRESENT);
        }));
    }

    @Test
    void integrateAllDataIntoPayroll_withApprovedLeave_setsOnLeaveStatus() {
        // Use a payroll period with a weekday (Monday Jan 5, 2026)
        Payroll weekdayPayroll = new Payroll();
        weekdayPayroll.setId(payrollId);
        weekdayPayroll.setStartDate(LocalDate.of(2026, 1, 5)); // Monday
        weekdayPayroll.setEndDate(LocalDate.of(2026, 1, 5));   // Monday (single day)
        weekdayPayroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);

        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Eve Davis");
        ep.setPayroll(weekdayPayroll);

        Employee emp = buildEmployee("Eve", "Davis");
        emp.setId(empId);

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setId(UUID.randomUUID());
        leaveRequest.setEmployee(emp);
        leaveRequest.setStatus(LeaveRequest.LeaveStatus.APPROVED);
        leaveRequest.setStartDate(LocalDate.of(2026, 1, 5));
        leaveRequest.setEndDate(LocalDate.of(2026, 1, 5));
        leaveRequest.setLeaveType(LeaveRequest.LeaveType.ANNUAL);

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(
                eq(empId), any(), any())).thenReturn(List.of(leaveRequest));

        payrollIntegrationService.integrateAllDataIntoPayroll(weekdayPayroll);

        verify(snapshotRepository).saveAll(argThat(list -> {
            List<PayrollAttendanceSnapshot> snapshots = (List<PayrollAttendanceSnapshot>) list;
            return snapshots.stream().anyMatch(s ->
                    s.getAttendanceDate().equals(LocalDate.of(2026, 1, 5)) &&
                    s.getStatus() == Attendance.AttendanceStatus.ON_LEAVE);
        }));
    }

    @Test
    void integrateAllDataIntoPayroll_clearsExistingSnapshots() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Frank Miller");

        Employee emp = buildEmployee("Frank", "Miller");
        emp.setId(empId);

        PayrollAttendanceSnapshot oldSnap = new PayrollAttendanceSnapshot();
        oldSnap.setId(UUID.randomUUID());

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(List.of(oldSnap));
        when(attendanceRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        payrollIntegrationService.integrateAllDataIntoPayroll(payroll);

        verify(snapshotRepository).deleteAll(List.of(oldSnap));
    }

    @Test
    void integrateAllDataIntoPayroll_copyJobPositionDeductionRates_setsRatesOnEmployeePayroll() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Grace Lee");

        Employee emp = buildEmployee("Grace", "Lee");
        emp.setId(empId);
        emp.getJobPosition().setAbsentDeduction(new BigDecimal("300"));
        emp.getJobPosition().setLateDeduction(new BigDecimal("50"));
        emp.getJobPosition().setLateForgivenessMinutes(15);
        emp.getJobPosition().setLateForgivenessCountPerQuarter(3);
        emp.getJobPosition().setLeaveDeduction(new BigDecimal("200"));

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        payrollIntegrationService.integrateAllDataIntoPayroll(payroll);

        assertEquals(new BigDecimal("300"), ep.getAbsentDeduction());
        assertEquals(new BigDecimal("50"), ep.getLateDeduction());
        assertEquals(15, ep.getLateForgivenessMinutes());
        assertEquals(3, ep.getLateForgivenessCountPerQuarter());
        assertEquals(new BigDecimal("200"), ep.getLeaveDeduction());
    }

    @Test
    void integrateAllDataIntoPayroll_employeeWithNoJobPosition_logsWarningAndContinues() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "NoJob Employee");

        Employee emp = new Employee();
        emp.setId(empId);
        emp.setFirstName("NoJob");
        emp.setLastName("Employee");
        emp.setJobPosition(null); // No job position

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        // Should not throw; logs warning and continues
        assertDoesNotThrow(() -> payrollIntegrationService.integrateAllDataIntoPayroll(payroll));
    }

    @Test
    void integrateAllDataIntoPayroll_publicHolidayRepositoryThrows_completesGracefullyWithEmptyHolidays() {
        // getPublicHolidaysForPayroll catches internal exceptions and returns empty map
        // The outer method continues with an empty holiday map
        when(publicHolidayRepository.findByPayrollId(payrollId))
                .thenThrow(new RuntimeException("DB error"));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        // Should not throw - exception is swallowed in getPublicHolidaysForPayroll
        assertDoesNotThrow(() -> payrollIntegrationService.integrateAllDataIntoPayroll(payroll));
    }

    @Test
    void integrateAllDataIntoPayroll_employeePayrollRepositoryThrows_throwsRuntimeException() {
        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId))
                .thenThrow(new RuntimeException("DB error"));

        assertThrows(RuntimeException.class,
                () -> payrollIntegrationService.integrateAllDataIntoPayroll(payroll));
    }

    @Test
    void integrateAllDataIntoPayroll_multiDayPublicHoliday_addsAllDates() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = buildEmployeePayroll(empId, "Harry White");

        Employee emp = buildEmployee("Harry", "White");
        emp.setId(empId);

        // Multi-day holiday Jan 1-3
        PayrollPublicHoliday multiDayHoliday = new PayrollPublicHoliday();
        multiDayHoliday.setId(UUID.randomUUID());
        multiDayHoliday.setStartDate(LocalDate.of(2026, 1, 1));
        multiDayHoliday.setEndDate(LocalDate.of(2026, 1, 3));
        multiDayHoliday.setHolidayName("Multi Day");
        multiDayHoliday.setIsPaid(true);
        multiDayHoliday.setIsConfirmed(true);
        multiDayHoliday.setPayroll(payroll);

        when(publicHolidayRepository.findByPayrollId(payrollId)).thenReturn(List.of(multiDayHoliday));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(snapshotRepository.findByEmployeePayrollId(ep.getId())).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.findByEmployeeIdAndDateRange(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        payrollIntegrationService.integrateAllDataIntoPayroll(payroll);

        // All 3 days should be marked as paid public holidays
        verify(snapshotRepository).saveAll(argThat(list -> {
            List<PayrollAttendanceSnapshot> snapshots = (List<PayrollAttendanceSnapshot>) list;
            long paidHolidayCount = snapshots.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsPublicHoliday()) &&
                                 Boolean.TRUE.equals(s.getPublicHolidayPaid()))
                    .count();
            return paidHolidayCount == 3;
        }));
    }
}