package com.example.backend.services.hr;

import com.example.backend.dto.hr.leave.VacationBalanceResponseDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.VacationBalance;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.VacationBalanceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class VacationBalanceServiceTest {

    @Mock
    private VacationBalanceRepository vacationBalanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private VacationBalanceService vacationBalanceService;

    // ==================== getOrCreateBalance ====================

    @Test
    public void getOrCreateBalance_exists_shouldReturn() {
        UUID empId = UUID.randomUUID();
        VacationBalance balance = createBalance(empId, 2026, 21);

        when(vacationBalanceRepository.findByEmployeeIdAndYear(empId, 2026))
                .thenReturn(Optional.of(balance));

        VacationBalance result = vacationBalanceService.getOrCreateBalance(empId, 2026);

        assertNotNull(result);
        assertEquals(21, result.getTotalAllocated());
    }

    @Test
    public void getOrCreateBalance_notExists_shouldCreate() {
        UUID empId = UUID.randomUUID();
        Employee emp = createEmployee(empId);

        when(vacationBalanceRepository.findByEmployeeIdAndYear(empId, 2026))
                .thenReturn(Optional.empty());
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> {
            VacationBalance b = i.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        VacationBalance result = vacationBalanceService.getOrCreateBalance(empId, 2026);

        assertNotNull(result);
        verify(vacationBalanceRepository).save(any(VacationBalance.class));
    }

    // ==================== getVacationBalance ====================

    @Test
    public void getVacationBalance_shouldReturnDTO() {
        UUID empId = UUID.randomUUID();
        VacationBalance balance = createBalance(empId, 2026, 21);

        when(vacationBalanceRepository.findByEmployeeIdAndYear(eq(empId), anyInt()))
                .thenReturn(Optional.of(balance));

        VacationBalanceResponseDTO result = vacationBalanceService.getVacationBalance(empId);

        assertNotNull(result);
        assertEquals(21, result.getTotalAllocated());
    }

    // ==================== processApprovedLeave ====================

    @Test
    public void processApprovedLeave_shouldUpdateBalance() {
        UUID empId = UUID.randomUUID();
        VacationBalance balance = createBalance(empId, 2026, 21);
        balance.setPendingDays(5);

        when(vacationBalanceRepository.findByEmployeeIdAndYear(eq(empId), anyInt()))
                .thenReturn(Optional.of(balance));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> i.getArgument(0));

        vacationBalanceService.processApprovedLeave(empId, 5);

        verify(vacationBalanceRepository).save(any(VacationBalance.class));
    }

    // ==================== addPendingDays ====================

    @Test
    public void addPendingDays_shouldAddDays() {
        UUID empId = UUID.randomUUID();
        VacationBalance balance = createBalance(empId, 2026, 21);

        when(vacationBalanceRepository.findByEmployeeIdAndYear(eq(empId), anyInt()))
                .thenReturn(Optional.of(balance));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> i.getArgument(0));

        vacationBalanceService.addPendingDays(empId, 3);

        verify(vacationBalanceRepository).save(any(VacationBalance.class));
    }

    // ==================== removePendingDays ====================

    @Test
    public void removePendingDays_shouldRemoveDays() {
        UUID empId = UUID.randomUUID();
        VacationBalance balance = createBalance(empId, 2026, 21);
        balance.setPendingDays(5);

        when(vacationBalanceRepository.findByEmployeeIdAndYear(eq(empId), anyInt()))
                .thenReturn(Optional.of(balance));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> i.getArgument(0));

        vacationBalanceService.removePendingDays(empId, 3);

        verify(vacationBalanceRepository).save(any(VacationBalance.class));
    }

    // ==================== initializeYearlyBalances ====================

    @Test
    public void initializeYearlyBalances_shouldInitializeForActiveEmployees() {
        Employee activeEmp = createEmployee(UUID.randomUUID());
        activeEmp.setStatus("ACTIVE");

        Employee inactiveEmp = createEmployee(UUID.randomUUID());
        inactiveEmp.setStatus("INACTIVE");

        when(employeeRepository.findAll()).thenReturn(List.of(activeEmp, inactiveEmp));
        when(vacationBalanceRepository.existsByEmployeeIdAndYear(activeEmp.getId(), 2026)).thenReturn(false);
        when(employeeRepository.findById(activeEmp.getId())).thenReturn(Optional.of(activeEmp));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> {
            VacationBalance b = i.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        vacationBalanceService.initializeYearlyBalances(2026);

        verify(vacationBalanceRepository, atLeastOnce()).save(any(VacationBalance.class));
    }

    @Test
    public void initializeYearlyBalances_alreadyExists_shouldSkip() {
        Employee emp = createEmployee(UUID.randomUUID());
        emp.setStatus("ACTIVE");

        when(employeeRepository.findAll()).thenReturn(List.of(emp));
        when(vacationBalanceRepository.existsByEmployeeIdAndYear(emp.getId(), 2026)).thenReturn(true);

        vacationBalanceService.initializeYearlyBalances(2026);

        verify(vacationBalanceRepository, never()).save(any(VacationBalance.class));
    }

    // ==================== carryForwardBalances ====================

    @Test
    public void carryForwardBalances_shouldCarryForward() {
        UUID empId = UUID.randomUUID();
        VacationBalance prevBalance = createBalance(empId, 2025, 21);
        prevBalance.setUsedDays(10);

        VacationBalance newBalance = createBalance(empId, 2026, 21);

        when(vacationBalanceRepository.findByYear(2025)).thenReturn(List.of(prevBalance));
        when(vacationBalanceRepository.findByEmployeeIdAndYear(empId, 2026))
                .thenReturn(Optional.of(newBalance));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> i.getArgument(0));

        vacationBalanceService.carryForwardBalances(2025, 2026, 5);

        verify(vacationBalanceRepository).save(any(VacationBalance.class));
    }

    // ==================== awardBonusDays ====================

    @Test
    public void awardBonusDays_shouldAddBonusDays() {
        UUID empId = UUID.randomUUID();
        VacationBalance balance = createBalance(empId, 2026, 21);

        when(vacationBalanceRepository.findByEmployeeIdAndYear(empId, 2026))
                .thenReturn(Optional.of(balance));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> i.getArgument(0));

        vacationBalanceService.awardBonusDays(empId, 2026, 3, "Performance bonus");

        verify(vacationBalanceRepository).save(any(VacationBalance.class));
    }

    // ==================== getEmployeesWithLowBalance ====================

    @Test
    public void getEmployeesWithLowBalance_shouldReturnLowBalances() {
        UUID empId = UUID.randomUUID();
        VacationBalance balance = createBalance(empId, 2026, 21);
        balance.setUsedDays(18);

        when(vacationBalanceRepository.findEmployeesWithLowBalance(2026, 5))
                .thenReturn(List.of(balance));

        List<VacationBalanceResponseDTO> result = vacationBalanceService.getEmployeesWithLowBalance(2026, 5);

        assertEquals(1, result.size());
    }

    @Test
    public void getEmployeesWithLowBalance_nullYear_shouldUseCurrentYear() {
        when(vacationBalanceRepository.findEmployeesWithLowBalance(anyInt(), eq(5)))
                .thenReturn(List.of());

        List<VacationBalanceResponseDTO> result = vacationBalanceService.getEmployeesWithLowBalance(null, 5);

        assertNotNull(result);
    }

    @Test
    public void getEmployeesWithLowBalance_nullThreshold_shouldUseDefault() {
        when(vacationBalanceRepository.findEmployeesWithLowBalance(eq(2026), eq(5)))
                .thenReturn(List.of());

        List<VacationBalanceResponseDTO> result = vacationBalanceService.getEmployeesWithLowBalance(2026, null);

        assertNotNull(result);
    }

    // ==================== updateAllocationForEmployee ====================

    @Test
    public void updateAllocationForEmployee_shouldUpdateAllocation() {
        UUID empId = UUID.randomUUID();
        Employee emp = createEmployee(empId);
        JobPosition jp = new JobPosition();
        jp.setVacationDays(25);
        emp.setJobPosition(jp);

        VacationBalance balance = createBalance(empId, 2026, 21);

        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));
        when(vacationBalanceRepository.findByEmployeeIdAndYear(eq(empId), anyInt()))
                .thenReturn(Optional.of(balance));
        when(vacationBalanceRepository.save(any(VacationBalance.class))).thenAnswer(i -> i.getArgument(0));

        vacationBalanceService.updateAllocationForEmployee(empId);

        verify(vacationBalanceRepository).save(any(VacationBalance.class));
    }

    // ==================== Helpers ====================

    private Employee createEmployee(UUID id) {
        Employee emp = new Employee();
        emp.setId(id);
        emp.setFirstName("Test");
        emp.setLastName("Employee");
        emp.setStatus("ACTIVE");
        return emp;
    }

    private VacationBalance createBalance(UUID empId, int year, int totalAllocated) {
        Employee emp = createEmployee(empId);
        VacationBalance balance = VacationBalance.builder()
                .employee(emp)
                .year(year)
                .totalAllocated(totalAllocated)
                .usedDays(0)
                .pendingDays(0)
                .carriedForward(0)
                .bonusDays(0)
                .build();
        balance.setId(UUID.randomUUID());
        return balance;
    }
}