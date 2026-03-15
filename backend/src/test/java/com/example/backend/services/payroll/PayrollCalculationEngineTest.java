package com.example.backend.services.payroll;

import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollCalculationEngineTest {

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @Mock
    private PayrollRepository payrollRepository;

    @Mock
    private PayrollLoanService loanService;

    @Mock
    private EmployeeDeductionService employeeDeductionService;

    @InjectMocks
    private PayrollCalculationEngine calculationEngine;

    private Payroll payroll;

    @BeforeEach
    void setUp() {
        payroll = new Payroll();
        payroll.setId(UUID.randomUUID());
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 31));
    }

    private EmployeePayroll buildMonthlyPayroll(String name, BigDecimal salary) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(UUID.randomUUID());
        ep.setEmployeeName(name);
        ep.setContractType(JobPosition.ContractType.MONTHLY);
        ep.setMonthlyBaseSalary(salary);
        ep.setGrossPay(BigDecimal.ZERO);
        ep.setTotalDeductions(BigDecimal.ZERO);
        ep.setNetPay(BigDecimal.ZERO);
        ep.setOvertimePay(BigDecimal.ZERO);
        ep.setAbsenceDeductionAmount(BigDecimal.ZERO);
        ep.setLateDeductionAmount(BigDecimal.ZERO);
        ep.setLeaveDeductionAmount(BigDecimal.ZERO);
        ep.setLoanDeductionAmount(BigDecimal.ZERO);
        ep.setOtherDeductionAmount(BigDecimal.ZERO);
        ep.setAttendanceSnapshots(new ArrayList<>());
        ep.setDeductions(new ArrayList<>());
        ep.setPayroll(payroll);
        return ep;
    }

    private EmployeePayroll buildDailyPayroll(String name, BigDecimal dailyRate) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(UUID.randomUUID());
        ep.setEmployeeName(name);
        ep.setContractType(JobPosition.ContractType.DAILY);
        ep.setDailyRate(dailyRate);
        ep.setGrossPay(BigDecimal.ZERO);
        ep.setTotalDeductions(BigDecimal.ZERO);
        ep.setNetPay(BigDecimal.ZERO);
        ep.setOvertimePay(BigDecimal.ZERO);
        ep.setAttendanceSnapshots(new ArrayList<>());
        ep.setDeductions(new ArrayList<>());
        ep.setPayroll(payroll);
        return ep;
    }

    private EmployeePayroll buildHourlyPayroll(String name, BigDecimal hourlyRate) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(UUID.randomUUID());
        ep.setEmployeeName(name);
        ep.setContractType(JobPosition.ContractType.HOURLY);
        ep.setHourlyRate(hourlyRate);
        ep.setGrossPay(BigDecimal.ZERO);
        ep.setTotalDeductions(BigDecimal.ZERO);
        ep.setNetPay(BigDecimal.ZERO);
        ep.setOvertimePay(BigDecimal.ZERO);
        ep.setAttendanceSnapshots(new ArrayList<>());
        ep.setDeductions(new ArrayList<>());
        ep.setPayroll(payroll);
        return ep;
    }

    private PayrollAttendanceSnapshot buildPresentSnapshot(LocalDate date) {
        PayrollAttendanceSnapshot snap = new PayrollAttendanceSnapshot();
        snap.setId(UUID.randomUUID());
        snap.setAttendanceDate(date);
        snap.setStatus(Attendance.AttendanceStatus.PRESENT);
        snap.setDayType(Attendance.DayType.WORKING_DAY);
        snap.setIsPublicHoliday(false);
        snap.setPublicHolidayPaid(null);
        snap.setWorkedHours(new BigDecimal("8"));
        snap.setOvertimeHours(BigDecimal.ZERO);
        snap.setLateMinutes(0);
        return snap;
    }

    // ==================== MONTHLY calculations ====================

    @Test
    void calculateEmployeePayroll_monthly_noAttendanceData_setsGrossToZero() {
        EmployeePayroll ep = buildMonthlyPayroll("Alice", new BigDecimal("5000"));
        ep.setAttendanceSnapshots(Collections.emptyList());

        // No attendance data means gross is set to ZERO directly (no loan/deduction service called)
        calculationEngine.calculateEmployeePayroll(ep);

        assertEquals(0, ep.getGrossPay().compareTo(BigDecimal.ZERO));
        assertEquals(0, ep.getNetPay().compareTo(BigDecimal.ZERO));
        verify(employeePayrollRepository).save(ep);
    }

    @Test
    void calculateEmployeePayroll_monthly_withAttendance_calculatesGrossAsSalary() {
        EmployeePayroll ep = buildMonthlyPayroll("Bob", new BigDecimal("6000"));

        // Add 20 working days of attendance
        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            snapshots.add(buildPresentSnapshot(LocalDate.of(2026, 1, i)));
        }
        ep.setAttendanceSnapshots(snapshots);
        ep.setTotalWorkingDays(20);
        ep.setAttendedDays(20);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        assertEquals(new BigDecimal("6000.00"), ep.getGrossPay());
        assertEquals(new BigDecimal("6000.00"), ep.getNetPay());
    }

    @Test
    void calculateEmployeePayroll_monthly_withOvertimeHours_addsOvertimePay() {
        EmployeePayroll ep = buildMonthlyPayroll("Carol", new BigDecimal("8000"));

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        PayrollAttendanceSnapshot snap = buildPresentSnapshot(LocalDate.of(2026, 1, 5));
        snap.setOvertimeHours(new BigDecimal("4")); // 4 hours OT
        snapshots.add(snap);
        ep.setAttendanceSnapshots(snapshots);
        ep.setTotalWorkingDays(1);
        ep.setAttendedDays(1);
        ep.setOvertimeHours(new BigDecimal("4"));

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // OT = (8000/160) * 1.5 * 4 = 50 * 1.5 * 4 = 300
        assertTrue(ep.getGrossPay().compareTo(new BigDecimal("8000")) > 0);
        assertEquals(new BigDecimal("300.00"), ep.getOvertimePay());
    }

    @Test
    void calculateEmployeePayroll_monthly_withAbsences_appliesAbsenceDeduction() {
        EmployeePayroll ep = buildMonthlyPayroll("Dave", new BigDecimal("6000"));
        ep.setAbsentDeduction(new BigDecimal("300")); // 300 per absent day

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        // 1 present day + 1 absent day
        PayrollAttendanceSnapshot present = buildPresentSnapshot(LocalDate.of(2026, 1, 5));
        snapshots.add(present);

        PayrollAttendanceSnapshot absent = new PayrollAttendanceSnapshot();
        absent.setId(UUID.randomUUID());
        absent.setAttendanceDate(LocalDate.of(2026, 1, 6));
        absent.setStatus(Attendance.AttendanceStatus.ABSENT);
        absent.setDayType(Attendance.DayType.WORKING_DAY);
        absent.setIsPublicHoliday(false);
        absent.setPublicHolidayPaid(null);
        absent.setIsExcusedAbsence(false);
        snapshots.add(absent);

        ep.setAttendanceSnapshots(snapshots);
        ep.setTotalWorkingDays(2);
        ep.setAttendedDays(1);
        ep.setAbsentDays(1);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // Absence deduction = 300 * 1 absent day
        assertEquals(new BigDecimal("300.00"), ep.getAbsenceDeductionAmount());
    }

    @Test
    void calculateEmployeePayroll_monthly_withLoanDeduction_subtractsFromNet() {
        EmployeePayroll ep = buildMonthlyPayroll("Eve", new BigDecimal("5000"));

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        snapshots.add(buildPresentSnapshot(LocalDate.of(2026, 1, 5)));
        ep.setAttendanceSnapshots(snapshots);
        ep.setTotalWorkingDays(1);
        ep.setAttendedDays(1);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any()))
                .thenReturn(new BigDecimal("500"));
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        assertEquals(0, ep.getLoanDeductionAmount().compareTo(new BigDecimal("500")));
        assertEquals(0, ep.getNetPay().compareTo(new BigDecimal("4500")));
    }

    @Test
    void calculateEmployeePayroll_monthly_negativeNetPay_setsToZero() {
        EmployeePayroll ep = buildMonthlyPayroll("Frank", new BigDecimal("1000"));

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        snapshots.add(buildPresentSnapshot(LocalDate.of(2026, 1, 5)));
        ep.setAttendanceSnapshots(snapshots);
        ep.setTotalWorkingDays(1);
        ep.setAttendedDays(1);
        ep.setAbsentDeduction(new BigDecimal("2000")); // Forces negative after deduction

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any()))
                .thenReturn(new BigDecimal("2000")); // massive loan deduction
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // Net pay should be clamped at 0
        assertEquals(0, ep.getNetPay().compareTo(BigDecimal.ZERO));
    }

    // ==================== DAILY calculations ====================

    @Test
    void calculateEmployeePayroll_daily_calculatesGrossAsAttendedDaysTimesRate() {
        EmployeePayroll ep = buildDailyPayroll("Grace", new BigDecimal("200"));

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            PayrollAttendanceSnapshot snap = buildPresentSnapshot(LocalDate.of(2026, 1, i));
            snap.setDayType(null); // non-WORKING_DAY for daily counting
            snap.setStatus(Attendance.AttendanceStatus.PRESENT);
            snapshots.add(snap);
        }
        ep.setAttendanceSnapshots(snapshots);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // 3 attended days * 200 = 600
        assertEquals(new BigDecimal("600.00"), ep.getGrossPay());
    }

    @Test
    void calculateEmployeePayroll_daily_noAttendanceDeductions() {
        EmployeePayroll ep = buildDailyPayroll("Henry", new BigDecimal("300"));
        ep.setAttendedDays(5);

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            PayrollAttendanceSnapshot snap = buildPresentSnapshot(LocalDate.of(2026, 1, i));
            snap.setStatus(Attendance.AttendanceStatus.PRESENT);
            snapshots.add(snap);
        }
        ep.setAttendanceSnapshots(snapshots);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // DAILY employees don't get attendance-based deductions
        assertEquals(BigDecimal.ZERO, ep.getAbsenceDeductionAmount());
        assertEquals(BigDecimal.ZERO, ep.getLateDeductionAmount());
        assertEquals(BigDecimal.ZERO, ep.getLeaveDeductionAmount());
    }

    // ==================== HOURLY calculations ====================

    @Test
    void calculateEmployeePayroll_hourly_calculatesGrossAsHoursTimesRate() {
        EmployeePayroll ep = buildHourlyPayroll("Ivy", new BigDecimal("50"));

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        PayrollAttendanceSnapshot snap = buildPresentSnapshot(LocalDate.of(2026, 1, 5));
        snap.setWorkedHours(new BigDecimal("8"));
        snap.setStatus(Attendance.AttendanceStatus.PRESENT);
        snapshots.add(snap);
        ep.setAttendanceSnapshots(snapshots);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // 8 hours * 50 = 400
        assertEquals(new BigDecimal("400.00"), ep.getGrossPay());
    }

    @Test
    void calculateEmployeePayroll_hourly_noAttendanceDeductions() {
        EmployeePayroll ep = buildHourlyPayroll("Jack", new BigDecimal("40"));

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        PayrollAttendanceSnapshot snap = buildPresentSnapshot(LocalDate.of(2026, 1, 5));
        snap.setWorkedHours(new BigDecimal("8"));
        snap.setStatus(Attendance.AttendanceStatus.PRESENT);
        snapshots.add(snap);
        ep.setAttendanceSnapshots(snapshots);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        assertEquals(BigDecimal.ZERO, ep.getAbsenceDeductionAmount());
        assertEquals(BigDecimal.ZERO, ep.getLateDeductionAmount());
        assertEquals(BigDecimal.ZERO, ep.getLeaveDeductionAmount());
    }

    @Test
    void calculateEmployeePayroll_hourly_withOvertimeHours_calculatesOvertimePay() {
        EmployeePayroll ep = buildHourlyPayroll("Kate", new BigDecimal("50"));
        ep.setOvertimeHours(new BigDecimal("2"));

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        PayrollAttendanceSnapshot snap = buildPresentSnapshot(LocalDate.of(2026, 1, 5));
        snap.setWorkedHours(new BigDecimal("8"));
        snap.setOvertimeHours(new BigDecimal("2"));
        snap.setStatus(Attendance.AttendanceStatus.PRESENT);
        snapshots.add(snap);
        ep.setAttendanceSnapshots(snapshots);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // OT = 50 * 1.5 * 2 = 150
        assertEquals(new BigDecimal("150.00"), ep.getOvertimePay());
    }

    // ==================== calculateEmployeePayroll - save verification ====================

    @Test
    void calculateEmployeePayroll_alwaysSavesAfterCalculation() {
        EmployeePayroll ep = buildMonthlyPayroll("Liam", new BigDecimal("3000"));
        ep.setAttendanceSnapshots(Collections.emptyList());
        // No stubs needed: no-attendance path returns early without calling loan/deduction services

        calculationEngine.calculateEmployeePayroll(ep);

        verify(employeePayrollRepository).save(ep);
    }

    @Test
    void calculateEmployeePayroll_setsCalculatedAt() {
        EmployeePayroll ep = buildMonthlyPayroll("Mia", new BigDecimal("4000"));
        ep.setAttendanceSnapshots(Collections.emptyList());
        // No stubs needed: no-attendance path returns early without calling loan/deduction services

        calculationEngine.calculateEmployeePayroll(ep);

        assertNotNull(ep.getCalculatedAt());
    }

    // ==================== Attendance summary calculation ====================

    @Test
    void calculateEmployeePayroll_paidPublicHoliday_countsAsAttendedDay() {
        EmployeePayroll ep = buildMonthlyPayroll("Noah", new BigDecimal("5000"));

        PayrollAttendanceSnapshot holidaySnap = new PayrollAttendanceSnapshot();
        holidaySnap.setId(UUID.randomUUID());
        holidaySnap.setAttendanceDate(LocalDate.of(2026, 1, 1));
        holidaySnap.setStatus(Attendance.AttendanceStatus.OFF);
        holidaySnap.setDayType(Attendance.DayType.PUBLIC_HOLIDAY);
        holidaySnap.setIsPublicHoliday(true);
        holidaySnap.setPublicHolidayPaid(true); // PAID holiday
        holidaySnap.setWorkedHours(BigDecimal.ZERO);
        holidaySnap.setOvertimeHours(BigDecimal.ZERO);

        ep.setAttendanceSnapshots(List.of(holidaySnap));
        ep.setTotalWorkingDays(1);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // Paid holiday counts as attended
        assertTrue(ep.getAttendedDays() >= 1);
    }

    @Test
    void calculateEmployeePayroll_monthly_excessLeaveDeduction_appliesCorrectly() {
        EmployeePayroll ep = buildMonthlyPayroll("Olivia", new BigDecimal("6000"));
        ep.setLeaveDeduction(new BigDecimal("300"));
        ep.setExcessLeaveDays(2);

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();
        snapshots.add(buildPresentSnapshot(LocalDate.of(2026, 1, 5)));
        ep.setAttendanceSnapshots(snapshots);
        ep.setTotalWorkingDays(1);
        ep.setAttendedDays(1);

        when(loanService.calculateLoanDeductionForPayroll(any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(employeeDeductionService.calculateDeductionsForPayroll(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        calculationEngine.calculateEmployeePayroll(ep);

        // Leave deduction = 300 * 2 = 600
        assertEquals(new BigDecimal("600.00"), ep.getLeaveDeductionAmount());
    }
}