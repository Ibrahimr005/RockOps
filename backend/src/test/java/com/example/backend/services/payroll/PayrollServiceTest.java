package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.BonusReviewSummaryDTO;
import com.example.backend.dto.payroll.PublicHolidayDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollRepository;
import com.example.backend.services.hr.AttendanceService;
import com.example.backend.services.id.EntityIdGeneratorService;
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
class PayrollServiceTest {

    @Mock
    private PayrollRepository payrollRepository;

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceService attendanceService;

    @Mock
    private PayrollStateMachine stateMachine;

    @Mock
    private PayrollCalculationEngine calculationEngine;

    @Mock
    private PayrollSnapshotService snapshotService;

    @Mock
    private BonusRepository bonusRepository;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private PayrollService payrollService;

    private Payroll payroll;
    private UUID payrollId;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        payroll = new Payroll();
        payroll.setId(payrollId);
        payroll.setPayrollNumber("PRL-2026-000001");
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 31));
        payroll.setStatus(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW);
        payroll.setEmployeePayrolls(new ArrayList<>());
        payroll.setPublicHolidays(new ArrayList<>());
        payroll.setTotalGrossAmount(BigDecimal.ZERO);
        payroll.setTotalDeductions(BigDecimal.ZERO);
        payroll.setTotalNetAmount(BigDecimal.ZERO);
        payroll.setEmployeeCount(0);
        payroll.setOverrideContinuity(false);
        payroll.setAttendanceImported(false);
        payroll.setAttendanceImportCount(0);
        payroll.setAttendanceFinalized(false);
        payroll.setLeaveProcessed(false);
        payroll.setLeaveFinalized(false);
        payroll.setOvertimeProcessed(false);
        payroll.setOvertimeFinalized(false);
        payroll.setBonusProcessed(false);
        payroll.setBonusFinalized(false);
        payroll.setDeductionProcessed(false);
        payroll.setDeductionFinalized(false);
    }

    // ==================== createPayroll ====================

    @Test
    void createPayroll_validPeriod_createsPayroll() {
        LocalDate start = LocalDate.of(2026, 2, 1);
        LocalDate end = LocalDate.of(2026, 2, 28);

        when(payrollRepository.existsByDateRange(start, end)).thenReturn(false);
        when(payrollRepository.findFirstByOrderByEndDateDesc()).thenReturn(Optional.empty());
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("PRL-2026-000002");
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(inv -> {
            Payroll p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        Payroll result = payrollService.createPayroll(start, end, "admin");

        assertNotNull(result);
        assertEquals(start, result.getStartDate());
        assertEquals(end, result.getEndDate());
        assertEquals(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW, result.getStatus());
        verify(payrollRepository).save(any(Payroll.class));
    }

    @Test
    void createPayroll_nullStartDate_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> payrollService.createPayroll(null, LocalDate.of(2026, 1, 31), "admin"));
    }

    @Test
    void createPayroll_nullEndDate_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> payrollService.createPayroll(LocalDate.of(2026, 1, 1), null, "admin"));
    }

    @Test
    void createPayroll_startAfterEnd_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> payrollService.createPayroll(
                        LocalDate.of(2026, 2, 28), LocalDate.of(2026, 2, 1), "admin"));
    }

    @Test
    void createPayroll_dateBefore2020_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> payrollService.createPayroll(
                        LocalDate.of(2019, 1, 1), LocalDate.of(2019, 1, 31), "admin"));
    }

    @Test
    void createPayroll_overlappingDateRange_throwsIllegalState() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);
        when(payrollRepository.existsByDateRange(start, end)).thenReturn(true);

        assertThrows(IllegalStateException.class,
                () -> payrollService.createPayroll(start, end, "admin"));
    }

    // ==================== createPayrollWithOverride ====================

    @Test
    void createPayrollWithOverride_nullReason_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> payrollService.createPayrollWithOverride(
                        LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), "admin", null));
    }

    @Test
    void createPayrollWithOverride_emptyReason_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> payrollService.createPayrollWithOverride(
                        LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), "admin", "   "));
    }

    @Test
    void createPayrollWithOverride_validReason_createsPayrollWithOverrideFlagSet() {
        LocalDate start = LocalDate.of(2026, 2, 1);
        LocalDate end = LocalDate.of(2026, 2, 28);

        when(payrollRepository.existsByDateRange(start, end)).thenReturn(false);
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("PRL-2026-000002");
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(inv -> inv.getArgument(0));

        Payroll result = payrollService.createPayrollWithOverride(start, end, "admin", "Gap in data");

        assertTrue(result.getOverrideContinuity());
        assertEquals("Gap in data", result.getContinuityOverrideReason());
    }

    // ==================== addPublicHolidays ====================

    @Test
    void addPublicHolidays_wrongStatus_throwsIllegalState() {
        payroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        PublicHolidayDTO dto = new PublicHolidayDTO();
        dto.setName("Test");
        dto.setStartDate(LocalDate.of(2026, 1, 5));

        assertThrows(IllegalStateException.class,
                () -> payrollService.addPublicHolidays(payrollId, List.of(dto), "admin"));
    }

    @Test
    void addPublicHolidays_invalidHolidayNoStartDate_throwsIllegalArgument() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        PublicHolidayDTO dto = new PublicHolidayDTO();
        dto.setName("Test");
        dto.setStartDate(null);

        assertThrows(IllegalArgumentException.class,
                () -> payrollService.addPublicHolidays(payrollId, List.of(dto), "admin"));
    }

    @Test
    void addPublicHolidays_endDateBeforeStartDate_throwsIllegalArgument() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        PublicHolidayDTO dto = new PublicHolidayDTO();
        dto.setName("Bad Holiday");
        dto.setStartDate(LocalDate.of(2026, 1, 10));
        dto.setEndDate(LocalDate.of(2026, 1, 5));

        assertThrows(IllegalArgumentException.class,
                () -> payrollService.addPublicHolidays(payrollId, List.of(dto), "admin"));
    }

    @Test
    void addPublicHolidays_startDateOutsidePeriod_throwsIllegalArgument() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        PublicHolidayDTO dto = new PublicHolidayDTO();
        dto.setName("Outside Period");
        dto.setStartDate(LocalDate.of(2026, 2, 15)); // Outside Jan 1-31

        assertThrows(IllegalArgumentException.class,
                () -> payrollService.addPublicHolidays(payrollId, List.of(dto), "admin"));
    }

    @Test
    void addPublicHolidays_validHoliday_savesPayroll() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        PublicHolidayDTO dto = new PublicHolidayDTO();
        dto.setName("New Year");
        dto.setStartDate(LocalDate.of(2026, 1, 1));
        dto.setIsPaid(true);

        payrollService.addPublicHolidays(payrollId, List.of(dto), "admin");

        verify(payrollRepository).save(payroll);
        assertEquals(1, payroll.getPublicHolidays().size());
    }

    // ==================== getPayrollById ====================

    @Test
    void getPayrollById_found_returnsPayroll() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        Payroll result = payrollService.getPayrollById(payrollId);

        assertNotNull(result);
        assertEquals(payrollId, result.getId());
    }

    @Test
    void getPayrollById_notFound_throwsPayrollNotFoundException() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.empty());

        assertThrows(PayrollService.PayrollNotFoundException.class,
                () -> payrollService.getPayrollById(payrollId));
    }

    // ==================== getAllPayrolls ====================

    @Test
    void getAllPayrolls_returnsListFromRepository() {
        when(payrollRepository.findAllByOrderByEndDateDesc()).thenReturn(List.of(payroll));

        List<Payroll> result = payrollService.getAllPayrolls();

        assertEquals(1, result.size());
    }

    // ==================== getPayrollByDateRange ====================

    @Test
    void getPayrollByDateRange_found_returnsPayroll() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);
        when(payrollRepository.findByStartDateAndEndDate(start, end)).thenReturn(Optional.of(payroll));

        Payroll result = payrollService.getPayrollByDateRange(start, end);

        assertEquals(payrollId, result.getId());
    }

    @Test
    void getPayrollByDateRange_notFound_throwsPayrollNotFoundException() {
        LocalDate start = LocalDate.of(2026, 3, 1);
        LocalDate end = LocalDate.of(2026, 3, 31);
        when(payrollRepository.findByStartDateAndEndDate(start, end)).thenReturn(Optional.empty());

        assertThrows(PayrollService.PayrollNotFoundException.class,
                () -> payrollService.getPayrollByDateRange(start, end));
    }

    // ==================== getEmployeePayroll ====================

    @Test
    void getEmployeePayroll_found_returnsEmployeePayroll() {
        UUID empId = UUID.randomUUID();
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, empId))
                .thenReturn(Optional.of(ep));

        EmployeePayroll result = payrollService.getEmployeePayroll(payrollId, empId);

        assertNotNull(result);
    }

    @Test
    void getEmployeePayroll_notFound_throwsPayrollNotFoundException() {
        UUID empId = UUID.randomUUID();
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, empId))
                .thenReturn(Optional.empty());

        assertThrows(PayrollService.PayrollNotFoundException.class,
                () -> payrollService.getEmployeePayroll(payrollId, empId));
    }

    // ==================== getEmployeePayrolls ====================

    @Test
    void getEmployeePayrolls_delegatesToRepository() {
        EmployeePayroll ep = new EmployeePayroll();
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));

        List<EmployeePayroll> result = payrollService.getEmployeePayrolls(payrollId);

        assertEquals(1, result.size());
    }

    // ==================== deletePayroll ====================

    @Test
    void deletePayroll_unlockedPayroll_deletesSuccessfully() {
        payroll.setStatus(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW); // Not locked
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        payrollService.deletePayroll(payrollId, "admin");

        verify(payrollRepository).delete(payroll);
    }

    @Test
    void deletePayroll_lockedPayroll_throwsIllegalState() {
        payroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        assertThrows(IllegalStateException.class,
                () -> payrollService.deletePayroll(payrollId, "admin"));
        verify(payrollRepository, never()).delete(any());
    }

    // ==================== moveToLeaveReview ====================

    @Test
    void moveToLeaveReview_transitionsStateAndSaves() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        payrollService.moveToLeaveReview(payrollId, "admin");

        verify(stateMachine).transitionTo(payroll, PayrollStatus.LEAVE_REVIEW, "admin");
        verify(payrollRepository).save(payroll);
    }

    // ==================== moveToOvertimeReview ====================

    @Test
    void moveToOvertimeReview_transitionsStateAndSaves() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        payrollService.moveToOvertimeReview(payrollId, "admin");

        verify(stateMachine).transitionTo(payroll, PayrollStatus.OVERTIME_REVIEW, "admin");
        verify(payrollRepository).save(payroll);
    }

    // ==================== moveToDeductionReview ====================

    @Test
    void moveToDeductionReview_transitionsStateAndSaves() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        payrollService.moveToDeductionReview(payrollId, "admin");

        verify(stateMachine).transitionTo(payroll, PayrollStatus.DEDUCTION_REVIEW, "admin");
        verify(payrollRepository).save(payroll);
    }

    // ==================== moveToBonusReview ====================

    @Test
    void moveToBonusReview_transitionsStateAndSaves() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        payrollService.moveToBonusReview(payrollId, "admin");

        verify(stateMachine).transitionTo(payroll, PayrollStatus.BONUS_REVIEW, "admin");
        verify(payrollRepository).save(payroll);
    }

    // ==================== confirmAndLock ====================

    @Test
    void confirmAndLock_locksPayrollAndSaves() {
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        payrollService.confirmAndLock(payrollId, "admin");

        verify(stateMachine).transitionTo(payroll, PayrollStatus.CONFIRMED_AND_LOCKED, "admin");
        verify(payrollRepository).save(payroll);
    }

    // ==================== resetAttendanceData ====================

    @Test
    void resetAttendanceData_deletesAllEmployeePayrolls() {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());

        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(List.of(ep));

        payrollService.resetAttendanceData(payroll);

        verify(employeePayrollRepository).deleteAll(List.of(ep));
        assertEquals(0, payroll.getEmployeeCount());
        assertEquals(BigDecimal.ZERO, payroll.getTotalGrossAmount());
        assertEquals(BigDecimal.ZERO, payroll.getTotalNetAmount());
    }

    // ==================== recalculateTotals ====================

    @Test
    void recalculateTotals_lockedPayroll_throwsIllegalState() {
        payroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        assertThrows(IllegalStateException.class,
                () -> payrollService.recalculateTotals(payrollId));
    }

    @Test
    void recalculateTotals_unlockedPayroll_calculatesAndSaves() {
        payroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        payrollService.recalculateTotals(payrollId);

        verify(payrollRepository).save(payroll);
    }

    // ==================== processBonusReview ====================

    @Test
    void processBonusReview_wrongStatus_throwsIllegalState() {
        payroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        assertThrows(IllegalStateException.class,
                () -> payrollService.processBonusReview(payrollId));
    }

    @Test
    void processBonusReview_noBonuses_returnsEmptySummary() {
        payroll.setStatus(PayrollStatus.BONUS_REVIEW);
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(bonusRepository.findByStatusIn(any())).thenReturn(Collections.emptyList());
        when(employeePayrollRepository.findByPayrollId(payrollId)).thenReturn(Collections.emptyList());

        BonusReviewSummaryDTO result = payrollService.processBonusReview(payrollId);

        assertNotNull(result);
        assertEquals(0, result.getTotalBonusCount());
        assertEquals(BigDecimal.ZERO, result.getTotalBonusAmount());
        verify(payrollRepository).save(payroll);
        assertTrue(payroll.getBonusProcessed());
    }

    // ==================== finalizeBonusReview ====================

    @Test
    void finalizeBonusReview_cannotFinalize_throwsIllegalState() {
        payroll.setStatus(PayrollStatus.BONUS_REVIEW);
        payroll.setBonusProcessed(false); // Not yet processed
        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));

        assertThrows(IllegalStateException.class,
                () -> payrollService.finalizeBonusReview(payrollId, "admin"));
    }

    @Test
    void finalizeBonusReview_processed_transitionsToDeductionReview() {
        payroll.setStatus(PayrollStatus.BONUS_REVIEW);
        payroll.setBonusProcessed(true);
        payroll.setBonusFinalized(false);

        when(payrollRepository.findById(payrollId)).thenReturn(Optional.of(payroll));
        when(payrollRepository.save(any(Payroll.class))).thenAnswer(inv -> inv.getArgument(0));

        Payroll result = payrollService.finalizeBonusReview(payrollId, "admin");

        assertEquals(PayrollStatus.DEDUCTION_REVIEW, result.getStatus());
        assertTrue(payroll.getBonusFinalized());
    }

    // ==================== getLastPayroll ====================

    @Test
    void getLastPayroll_returnsLastPayroll() {
        when(payrollRepository.findFirstByOrderByEndDateDesc()).thenReturn(Optional.of(payroll));

        Optional<Payroll> result = payrollService.getLastPayroll();

        assertTrue(result.isPresent());
        assertEquals(payrollId, result.get().getId());
    }

    // ==================== save ====================

    @Test
    void save_delegatesToRepository() {
        when(payrollRepository.save(payroll)).thenReturn(payroll);

        Payroll result = payrollService.save(payroll);

        assertNotNull(result);
        verify(payrollRepository).save(payroll);
    }
}